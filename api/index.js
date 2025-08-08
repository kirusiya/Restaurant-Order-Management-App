const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const webpush = require('web-push'); // Importar web-push

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY; // Esta es la clave pública
// Nueva clave de rol de servicio (con acceso completo, bypass RLS)
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

// Cliente Supabase público (para SELECT y operaciones generales con RLS)
const supabase = createClient(supabaseUrl, supabaseKey);

// Cliente Supabase con rol de servicio (para INSERT, UPDATE, DELETE que requieren admin, bypass RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// Clave secreta para JWT (¡cambia esto por una cadena aleatoria y segura en producción!)
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Configuración de web-push (¡Asegúrate de que estas variables de entorno estén disponibles!)
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const app = express();
app.use(express.json());
app.use(cors());

// Función para normalizar nombres (minúsculas, sin acentos)
const normalizeName = (name) => {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('Auth middleware: Token received:', token ? 'Yes' : 'No'); // Nuevo log

  if (token == null) return res.sendStatus(401); // No token

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('JWT Verification Error:', err.message); // Log de error de verificación JWT
      return res.sendStatus(403); // Invalid token
    }
    req.user = user;
    console.log('Auth middleware: Decoded user:', req.user); // Nuevo log para ver el payload completo
    next();
  });
};

// Middleware de autorización (ej. para roles de administrador)
const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      console.warn(`Authorization denied for user ${req.user?.username} (role: ${req.user?.role}) trying to access admin-only route.`);
      return res.status(403).json({ error: 'Acceso denegado. No tienes los permisos necesarios.' });
    }
    next();
  };
};

// --- Rutas de Autenticación ---

// POST /api/login: Iniciar sesión
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Se requiere nombre de usuario y contraseña.' });
  }

  // Usamos supabase (el cliente con anon key) para la lectura de usuarios
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !user) {
    console.error('Login error: User not found or invalid credentials.', error);
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    console.error('Login error: Invalid password for user', username);
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
  res.status(200).json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

// --- Rutas de Usuarios (CRUD) ---

// POST /api/users: Crear un nuevo usuario (solo admin)
app.post('/api/users', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Nombre de usuario y contraseña son requeridos.' });
  }

  // <--- CAMBIO: Validar duplicidad de username al crear (insensible a mayúsculas/minúsculas)
  const { data: existingUser, error: existingUserError } = await supabase
    .from('users')
    .select('id')
    .ilike('username', username) // Usar ilike para comparación insensible a mayúsculas/minúsculas
    .single();

  if (existingUserError && existingUserError.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error('Error checking for existing username:', existingUserError);
    return res.status(500).json({ error: 'Error al verificar nombre de usuario.' });
  }
  if (existingUser) {
    return res.status(409).json({ error: 'El nombre de usuario ya existe.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10); // Hash de la contraseña

  // Usamos supabaseAdmin (cliente con service_role) para crear usuarios
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert([{ username, password: hashedPassword, role: role || 'waiter' }]) // <--- CAMBIO: Insertar username original
    .select();

  if (error) {
    console.error('Error creating user in Supabase (admin client):', error);
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data[0]);
});

// GET /api/users: Listar todos los usuarios (solo admin)
app.get('/api/users', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  // Usamos supabase (el cliente con anon key) para leer usuarios, ya que RLS maneja SELECT
  const { data, error } = await supabase
    .from('users')
    .select('id, username, role, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users from Supabase:', error);
    return res.status(500).json({ error: error.message });
  }
  res.status(200).json(data);
});

// GET /api/users/:id: Obtener un usuario por ID (solo admin o el propio usuario)
app.get('/api/users/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  // Permitir acceso si es admin o si el ID coincide con el usuario autenticado
  if (req.user.role !== 'admin' && req.user.id.toString() !== id) {
    return res.status(403).json({ error: 'Acceso denegado.' });
  }

  // Usamos supabase (el cliente con anon key) para leer usuarios, ya que RLS maneja SELECT
  const { data, error } = await supabase
    .from('users')
    .select('id, username, role, created_at')
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Error fetching user by ID from Supabase:', error);
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }
  res.status(200).json(data);
});

// PUT /api/users/:id: Actualizar un usuario (solo admin o el propio usuario)
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { username, password, role } = req.body;

  // Permitir acceso si es admin o si el ID coincide con el usuario autenticado
  if (req.user.role !== 'admin' && req.user.id.toString() !== id) {
    return res.status(403).json({ error: 'Acceso denegado.' });
  }

  const updateData = {};
  if (username) {
    // <--- CAMBIO: Validar duplicidad de username al actualizar (insensible a mayúsculas/minúsculas)
    const { data: existingUser, error: existingUserError } = await supabase
      .from('users')
      .select('id')
      .ilike('username', username) // Usar ilike para comparación insensible a mayúsculas/minúsculas
      .neq('id', id) // Excluir el usuario actual
      .single();

    if (existingUserError && existingUserError.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error checking for existing username:', existingUserError);
      return res.status(500).json({ error: 'Error al verificar nombre de usuario.' });
    }
    if (existingUser) {
      return res.status(409).json({ error: 'El nombre de usuario ya existe.' });
    }
    updateData.username = username; // <--- CAMBIO: Almacenar username original
  }

  if (password) updateData.password = await bcrypt.hash(password, 10);
  // Solo el admin puede cambiar el rol de otros usuarios
  if (role && req.user.role === 'admin') updateData.role = role;
  else if (role && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'No tienes permiso para cambiar el rol.' });
  }

  // Usamos supabaseAdmin (cliente con service_role) para actualizar usuarios
  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updateData)
    .eq('id', id)
    .select('id, username, role, created_at'); // No devolver contraseñas

  if (error || !data || data.length === 0) {
    console.error('Error updating user in Supabase (admin client):', error || 'No data returned after update.');
    return res.status(500).json({ error: error.message || 'Error al actualizar usuario.' });
  }
  res.status(200).json(data[0]);
});

// DELETE /api/users/:id: Eliminar un usuario (solo admin)
app.delete('/api/users/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;

  // Usamos supabaseAdmin (cliente con service_role) para eliminar usuarios
  const { error } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting user from Supabase (admin client):', error);
    return res.status(500).json({ error: error.message });
  }
  res.status(204).send(); // No Content
});

// --- Rutas de Categorías (CRUD) ---

// POST /api/categories: Crear una nueva categoría (solo admin)
app.post('/api/categories', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'El nombre de la categoría es requerido.' });
  }

  const { data: existingCategory, error: existingCategoryError } = await supabase
    .from('categories')
    .select('id, name')
    .ilike('name', name.trim()) // Usar ilike para comparación insensible a mayúsculas/minúsculas
    .single();

  if (existingCategoryError && existingCategoryError.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error('Error checking for existing category:', existingCategoryError);
    return res.status(500).json({ error: 'Error al verificar la categoría.' });
  }
  if (existingCategory) {
    return res.status(409).json({ error: 'La categoría ya existe.' });
  }

  const { data, error } = await supabaseAdmin
    .from('categories')
    .insert([{ name: name.trim() }])
    .select();

  if (error) {
    console.error('Error creating category in Supabase (admin client):', error);
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data[0]);
});

// GET /api/categories: Listar todas las categorías
app.get('/api/categories', async (req, res) => {
  // Usamos supabase (el cliente con anon key) para leer categorías
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching categories from Supabase:', error);
    return res.status(500).json({ error: error.message });
  }
  res.status(200).json(data);
});

// GET /api/categories/:id: Obtener una categoría por ID
app.get('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  // Usamos supabase (el cliente con anon key) para leer categorías
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Error fetching category by ID from Supabase:', error);
    return res.status(404).json({ error: 'Categoría no encontrada.' });
  }
  res.status(200).json(data);
});

// PUT /api/categories/:id: Actualizar una categoría (solo admin)
app.put('/api/categories/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'El nombre de la categoría es requerido.' });
  }

  const { data: existingCategory, error: existingCategoryError } = await supabase
    .from('categories')
    .select('id, name')
    .ilike('name', name.trim()) // Usar ilike para comparación insensible a mayúsculas/minúsculas
    .neq('id', id) // Excluir la categoría actual
    .single();

  if (existingCategoryError && existingCategoryError.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error('Error checking for existing category:', existingCategoryError);
    return res.status(500).json({ error: 'Error al verificar la categoría.' });
  }
  if (existingCategory) {
    // Si se encuentra una categoría existente con el nombre normalizado (y no es la actual), es un duplicado
    return res.status(409).json({ error: 'La categoría ya existe.' });
  }

  // Usamos supabaseAdmin (cliente con service_role) para actualizar categorías
  const { data, error } = await supabaseAdmin
    .from('categories')
    .update({ name: name.trim() }) // <--- CAMBIO: Actualizar con el nombre original (con capitalización y acentos)
    .eq('id', id)
    .select();

  if (error || !data || data.length === 0) {
    console.error('Error updating category in Supabase (admin client):', error || 'No data returned after update.');
    return res.status(500).json({ error: error.message || 'Error al actualizar categoría.' });
  }
  res.status(200).json(data[0]);
});

// DELETE /api/categories/:id: Eliminar una categoría (solo admin)
app.delete('/api/categories/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;

  // Usamos supabaseAdmin (cliente con service_role) para eliminar categorías
  const { error } = await supabaseAdmin
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting category from Supabase (admin client):', error);
    return res.status(500).json({ error: error.message });
  }
  res.status(204).send();
});

// --- Rutas de Productos (CRUD) ---

// GET /api/products: Listar productos disponibles (incluye categoría)
app.get('/api/products', async (req, res) => {
  // Usamos supabase (el cliente con anon key) para leer productos
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories (
        name
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching products from Supabase:', error);
    return res.status(500).json({ error: error.message });
  }
  res.status(200).json(data);
});

// POST /api/products: Crear un nuevo producto (solo admin)
app.post('/api/products', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  console.log('POST /api/products - User role from JWT:', req.user.role); // Log para depuración de RLS
  const { name, price, category_id } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'El nombre del producto es requerido.' });
  }
  if (typeof price !== 'number' || price <= 0) {
    return res.status(400).json({ error: 'El precio debe ser un número mayor que cero.' });
  }
  if (category_id && typeof category_id !== 'string') {
    return res.status(400).json({ error: 'El ID de categoría debe ser un string UUID.' });
  }

  // Usamos supabaseAdmin (cliente con service_role) para crear productos
  const { data, error } = await supabaseAdmin
    .from('products')
    .insert([{ name: name.trim(), price, category_id }])
    .select();

  if (error) {
    console.error('Error creating product in Supabase (admin client):', error);
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data[0]);
});

// GET /api/products/:id: Obtener un producto por ID
app.get('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  // Usamos supabase (el cliente con anon key) para leer productos
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories (
        name
      )
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Error fetching product by ID from Supabase:', error);
    return res.status(404).json({ error: 'Producto no encontrado.' });
  }
  res.status(200).json(data);
});

// PUT /api/products/:id: Actualizar un producto (solo admin)
app.put('/api/products/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { name, price, category_id } = req.body;

  console.log('PUT /api/products/:id - Received ID:', id, 'Type:', typeof id); // Strategic log
  console.log('PUT /api/products/:id - Received Body:', req.body);
  console.log('PUT /api/products/:id - Received category_id:', category_id, 'Type:', typeof category_id); // Strategic log

  const updateData = {};
  if (name) updateData.name = name.trim();
  if (price !== undefined) {
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      console.error('PUT /api/products/:id - Invalid price received:', price);
      return res.status(400).json({ error: 'El precio debe ser un número mayor que cero.' });
    }
    updateData.price = parsedPrice;
  }
  if (category_id !== undefined) {
    if (typeof category_id !== 'string' && category_id !== null) {
      console.error('PUT /api/products/:id - Invalid category_id received:', category_id);
      return res.status(400).json({ error: 'El ID de categoría debe ser un string UUID o nulo.' });
    }
    updateData.category_id = category_id;
  }

  console.log('PUT /api/products/:id - Update Data to Supabase:', updateData);

  const { data, error } = await supabaseAdmin
    .from('products')
    .update(updateData)
    .eq('id', id)
    .select();

  if (error) {
    console.error('Error updating product in Supabase (admin client):', error);
    return res.status(500).json({ error: error.message });
  }
  if (!data || data.length === 0) {
    console.error('PUT /api/products/:id - No data returned after update for ID:', id);
    return res.status(404).json({ error: 'Producto no encontrado o no se pudo actualizar.' });
  }
  console.log('PUT /api/products/:id - Supabase update successful, returned data:', data[0]); // NUEVO LOG
  res.status(200).json(data[0]);
});

// DELETE /api/products/:id: Eliminar un producto (solo admin)
app.delete('/api/products/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;

  const { error } = await supabaseAdmin
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting product from Supabase (admin client):', error);
    return res.status(500).json({ error: error.message });
  }
  res.status(204).send();
});

// --- Rutas de Órdenes (CRUD) ---

// GET /api/orders: Ver lista de todas las órdenes creadas (incluye items y productos)
app.get('/api/orders', authenticateToken, async (req, res) => {
  console.log('GET /api/orders: User role:', req.user?.role); // Nuevo log
  // Usamos supabase (el cliente con anon key) para leer órdenes
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        quantity,
        item_price,
        products (
          name,
          price
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching orders from Supabase:', error); // Log existente
    console.error('GET /api/orders: Supabase fetch result (error):', error); // Nuevo log
    return res.status(500).json({ error: error.message });
  }
  res.status(200).json(data);
});

// GET /api/orders/:id: Obtener una orden por ID (solo admin o mesero)
app.get('/api/orders/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  // Usamos supabase (el cliente con anon key) para leer órdenes
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        quantity,
        item_price,
        products (
          name,
          price
        )
      )
    `)
    .eq('id', id) // Usar el ID directamente como string
    .single();

  if (error || !data) {
    console.error('Error fetching order by ID from Supabase:', error);
    return res.status(404).json({ error: 'Orden no encontrada.' });
  }
  res.status(200).json(data);
});

// POST /api/orders: Crear y cerrar una orden con productos seleccionados
app.post('/api/orders', authenticateToken, async (req, res) => {
  const { items } = req.body; // items: [{ product_id: 'uuid', quantity: 2 }]

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'La orden debe contener al menos un producto.' });
  }

  let total_amount = 0;
  const orderItemsToInsert = [];

  // Validar productos y calcular el total
  for (const item of items) {
    // Cambiar validación para aceptar tanto string como number para product_id
    if (!item.product_id || typeof item.quantity !== 'number' || item.quantity <= 0) {
      return res.status(400).json({ error: 'Cada item de la orden debe tener un product_id válido y una cantidad mayor que cero.' });
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('price')
      .eq('id', item.product_id)
      .single();

    if (productError || !product) {
      console.error(`Product with ID ${item.product_id} not found:`, productError);
      return res.status(404).json({ error: `Producto con ID ${item.product_id} no encontrado.` });
    }

    const itemPrice = product.price * item.quantity;
    total_amount += itemPrice;
    orderItemsToInsert.push({
      product_id: item.product_id,
      quantity: item.quantity,
      item_price: product.price,
    });
  }

  // Crear la orden
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert([{ total: total_amount, status: 'open' }]) // Cambiar de 'closed' a 'open'
    .select()
    .single();

  if (orderError) {
    console.error('Error creating order in Supabase (admin client):', orderError);
    return res.status(500).json({ error: orderError.message });
  }

  // Insertar los items de la orden
  const itemsWithOrderId = orderItemsToInsert.map(item => ({
    ...item,
    order_id: order.id,
  }));

  const { data: insertedItems, error: itemsError } = await supabaseAdmin
    .from('order_items')
    .insert(itemsWithOrderId)
    .select();

  if (itemsError) {
    console.error('Error inserting order items in Supabase (admin client):', itemsError);
    await supabaseAdmin.from('orders').delete().eq('id', order.id);
    return res.status(500).json({ error: itemsError.message });
  }

  res.status(201).json({ order, items: insertedItems });
});

// PUT /api/orders/:id: Actualizar el estado de una orden (solo admin o mesero)
app.put('/api/orders/:id', authenticateToken, authorizeRole(['admin', 'waiter']), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  console.log('PUT /api/orders/:id: User role:', req.user?.role); // Nuevo log
  console.log('PUT /api/orders/:id: Attempting to update order status to:', status); // Nuevo log

  if (!status || !['open', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'Estado de orden inválido.' });
  }

  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select();

  if (error || !data || data.length === 0) {
    console.error('Error updating order status in Supabase (admin client):', error || 'No data returned after update.');
    return res.status(500).json({ error: error.message || 'Error al actualizar el estado de la orden.' });
  }

  // Si la orden se cierra, envía una notificación push
  if (status === 'closed') {
    console.log('Order status is closed. Attempting to send push notifications.'); // Nuevo log

    // Obtener todas las suscripciones de la base de datos
    const { data: subscriptions, error: fetchError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*');

    if (fetchError) {
      console.error('Error fetching push subscriptions from Supabase:', fetchError);
      // No detener el proceso de cierre de orden, solo loguear el error de notificación
    } else {
      console.log(`Fetched ${subscriptions.length} push subscriptions.`);
      if (subscriptions.length === 0) {
        console.warn('No push subscriptions found in the database. Notifications will not be sent.');
      }
      const orderName = `Orden #${String(id).substring(0, 8)}...`;
      const notificationTitle = 'Orden Cerrada';
      const notificationBody = `La ${orderName} ha sido cerrada.`;
      const notificationData = { url: '/dashboard', orderId: id }; // Datos adicionales para el clic

      // Estructura del payload para web-push
      const notificationPayload = JSON.stringify({
          // El objeto 'notification' es lo que se muestra visualmente
          notification: {
              title: notificationTitle,
              body: notificationBody,
              icon: '/firebase-logo.png', // Asegúrate de que esta ruta sea válida y accesible públicamente
              data: notificationData, // Datos que se pasan al evento 'notificationclick'
          },
          // El objeto 'data' a nivel raíz es lo que se pasa al evento 'push' en el Service Worker (event.data.json())
          data: {
              url: notificationData.url, // Duplicado para fácil acceso en el SW
              orderId: id,
              type: 'order_closed',
              // Puedes añadir más datos personalizados aquí
          }
      });

      console.log('Notification Payload being sent to web-push:', notificationPayload); // NUEVO LOG

      const sendPromises = subscriptions.map(async (subscription) => {
          try {
              const pushSubscription = {
                  endpoint: subscription.endpoint,
                  keys: {
                      p256dh: subscription.p256dh,
                      auth: subscription.auth,
                  },
              };
              console.log('Sending notification to endpoint:', pushSubscription.endpoint);
              await webpush.sendNotification(pushSubscription, notificationPayload);
              console.log(`Notificación push enviada a ${pushSubscription.endpoint}`);
          } catch (pushError) {
              console.error(`Error al enviar notificación push a ${subscription.endpoint}:`, pushError);
              if (pushError.statusCode === 410) {
                  console.log(`Suscripción ${subscription.endpoint} es inválida y será eliminada de la base de datos.`);
                  const { error: deleteError } = await supabaseAdmin
                      .from('push_subscriptions')
                      .delete()
                      .eq('endpoint', subscription.endpoint);
                  if (deleteError) {
                      console.error('Error al eliminar suscripción inválida de Supabase:', deleteError);
                  } else {
                      console.log('Suscripción inválida eliminada de Supabase.');
                  }
              }
          }
      });
      await Promise.allSettled(sendPromises);
      console.log('Proceso de envío de notificaciones push completado.');
    }
  }

  res.status(200).json(data[0]);
});

// DELETE /api/orders/:id: Eliminar una orden (solo admin)
app.delete('/api/orders/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;

  const { error } = await supabaseAdmin
    .from('orders')
    .delete()
    .eq('id', id); // Usar el ID directamente como string

  if (error) {
    console.error('Error deleting order from Supabase (admin client):', error);
    return res.status(500).json({ error: error.message });
  }
  res.status(204).send();
});

// --- Rutas de Suscripción a Push Notifications ---
app.post('/api/subscribe-push', authenticateToken, async (req, res) => { // Añadir authenticateToken
  const subscription = req.body;
  const userId = req.user.id; // Obtener user_id del JWT

  console.log('API /api/subscribe-push: Received push subscription:', subscription);
  console.log('API /api/subscribe-push: User ID for subscription:', userId);

  if (!subscription || !subscription.endpoint || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
    return res.status(400).json({ error: 'Suscripción inválida: faltan datos esenciales.' });
  }

  try {
      // Paso 1: Eliminar cualquier suscripción existente para este user_id
      // Esto asegura que un usuario solo tenga una suscripción activa a la vez.
      console.log(`API /api/subscribe-push: Eliminando suscripciones antiguas para user_id: ${userId}`);
      const { error: deleteError } = await supabaseAdmin
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId); // Eliminar todas las suscripciones para este usuario

      if (deleteError) {
          console.error('API /api/subscribe-push: Error al eliminar suscripciones antiguas:', deleteError);
          // No es un error crítico que deba detener la inserción, solo loguear.
      } else {
          console.log(`API /api/subscribe-push: Suscripciones antiguas para user_id ${userId} eliminadas (si existían).`);
      }

      // Paso 2: Insertar la nueva suscripción
      const { data, error } = await supabaseAdmin
          .from('push_subscriptions')
          .insert([
              {
                  endpoint: subscription.endpoint,
                  p256dh: subscription.keys.p256dh,
                  auth: subscription.keys.auth,
                  user_id: userId,
              },
          ])
          .select();

      if (error) {
          console.warn('API /api/subscribe-push: Suscripción ya existe para este endpoint (después de intento de limpieza):', subscription.endpoint);
          console.error('API /api/subscribe-push: Error al guardar nueva suscripción en Supabase:', error);
          return res.status(500).json({ error: error.message });
      }

      console.log('API /api/subscribe-push: Nueva suscripción guardada en Supabase con éxito:', data[0]);
      res.status(201).json({ message: 'Suscripción recibida y guardada con éxito.' });
  } catch (err) {
    console.error('API /api/subscribe-push: Error inesperado al manejar suscripción:', err);
    res.status(500).json({ error: 'Error interno del servidor al procesar suscripción.' });
  }
});

module.exports = app;
