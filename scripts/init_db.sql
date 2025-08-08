-- Crear la extensión uuid-ossp si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Eliminar tablas si existen para un inicio limpio (orden inverso de dependencia)
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.push_subscriptions CASCADE; -- Eliminar antes de users si user_id es FK
DROP TABLE IF EXISTS public.users CASCADE;

-- Tabla de Usuarios
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  role text NOT NULL DEFAULT 'waiter', -- 'admin' o 'waiter'
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabla de Categorías
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabla de Productos
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  price numeric(10, 2) NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabla de Órdenes
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  total numeric(10, 2) NOT NULL,
  status text NOT NULL DEFAULT 'open' -- 'open' o 'closed'
);

-- Tabla de Items de Orden (detalle de cada orden)
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
  quantity integer NOT NULL,
  item_price numeric(10, 2) NOT NULL, -- Precio del producto en el momento de la orden
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (order_id, product_id) -- Un producto solo puede aparecer una vez por orden
);

-- Tabla para almacenar las suscripciones de notificaciones push
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL, -- UUID para coincidir con users.id
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Función para actualizar la columna updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at en cada UPDATE de push_subscriptions
CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insertar un usuario administrador por defecto (contraseña: adminpass)
INSERT INTO public.users (username, password, role)
VALUES ('admin', '$2b$10$CMlyrm76ss87OczqqhaiL.Be4w877eBvtjl7FlIc7jV5QP6/fFXj6', 'admin');

-- Insertar algunas categorías de ejemplo
INSERT INTO public.categories (name) VALUES 
('Bebidas'),
('Comida Principal'),
('Postres'),
('Ensaladas'),
('Aperitivos');

-- Insertar algunos productos de ejemplo
INSERT INTO public.products (name, price, category_id) VALUES
('Hamburguesa Clásica', 12.50, (SELECT id FROM public.categories WHERE name = 'Comida Principal')),
('Papas Fritas', 4.00, (SELECT id FROM public.categories WHERE name = 'Aperitivos')),
('Refresco Cola', 3.00, (SELECT id FROM public.categories WHERE name = 'Bebidas')),
('Ensalada César', 9.75, (SELECT id FROM public.categories WHERE name = 'Ensaladas')),
('Pizza Pepperoni', 15.00, (SELECT id FROM public.categories WHERE name = 'Comida Principal')),
('Helado de Vainilla', 5.50, (SELECT id FROM public.categories WHERE name = 'Postres')),
('Cerveza', 4.50, (SELECT id FROM public.categories WHERE name = 'Bebidas')),
('Alitas Buffalo', 8.75, (SELECT id FROM public.categories WHERE name = 'Aperitivos'));

-- Habilitar RLS para la tabla users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- Eliminar políticas existentes para evitar errores al re-ejecutar
DROP POLICY IF EXISTS "users_select_own_and_admin" ON public.users;
DROP POLICY IF EXISTS "users_insert_admin" ON public.users;
DROP POLICY IF EXISTS "users_update_own_and_admin" ON public.users;
DROP POLICY IF EXISTS "users_delete_admin" ON public.users;
-- Política: Permitir a los usuarios autenticados ver su propio perfil y a los administradores ver todos.
CREATE POLICY "users_select_own_and_admin"
ON public.users
FOR SELECT
TO authenticated
USING (
  (auth.uid() = id) OR (auth.jwt() ->> 'role' = 'admin')
);
-- Política: Permitir a los administradores crear usuarios.
CREATE POLICY "users_insert_admin"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' = 'admin'
);
-- Política: Permitir a los usuarios actualizar su propio perfil y a los administradores actualizar todos.
CREATE POLICY "users_update_own_and_admin"
ON public.users
FOR UPDATE
TO authenticated
USING (
  (auth.uid() = id) OR (auth.jwt() ->> 'role' = 'admin')
)
WITH CHECK (
  (auth.uid() = id) OR (auth.jwt() ->> 'role' = 'admin')
);
-- Política: Permitir a los administradores eliminar usuarios.
CREATE POLICY "users_delete_admin"
ON public.users
FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Habilitar RLS para la tabla categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
-- Eliminar políticas existentes para evitar errores al re-ejecutar
DROP POLICY IF EXISTS "categories_select_all" ON public.categories;
DROP POLICY IF EXISTS "categories_insert_admin" ON public.categories;
DROP POLICY IF EXISTS "categories_update_admin" ON public.categories;
DROP POLICY IF EXISTS "categories_delete_admin" ON public.categories;
-- Política: Permitir a los usuarios autenticados ver todas las categorías.
CREATE POLICY "categories_select_all"
ON public.categories
FOR SELECT
TO authenticated
USING (
  TRUE
);
-- Política: Permitir a los administradores crear categorías.
CREATE POLICY "categories_insert_admin"
ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' = 'admin'
);
-- Política: Permitir a los administradores actualizar categorías.
CREATE POLICY "categories_update_admin"
ON public.categories
FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'admin'
);
-- Política: Permitir a los administradores eliminar categorías.
CREATE POLICY "categories_delete_admin"
ON public.categories
FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Habilitar RLS para la tabla products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
-- Eliminar políticas existentes para evitar errores al re-ejecutar
DROP POLICY IF EXISTS "products_select_all" ON public.products;
DROP POLICY IF EXISTS "products_insert_admin" ON public.products;
DROP POLICY IF EXISTS "products_update_admin" ON public.products;
DROP POLICY IF EXISTS "products_delete_admin" ON public.products;
-- Política: Permitir a los usuarios autenticados ver todos los productos.
CREATE POLICY "products_select_all"
ON public.products
FOR SELECT
TO authenticated
USING (
  TRUE
);
-- Política: Permitir a los administradores crear productos.
CREATE POLICY "products_insert_admin"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' = 'admin'
);
-- Política: Permitir a los administradores actualizar productos.
CREATE POLICY "products_update_admin"
ON public.products
FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'admin'
);
-- Política: Permitir a los administradores eliminar productos.
CREATE POLICY "products_delete_admin"
ON public.products
FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Habilitar RLS para la tabla orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
-- Eliminar políticas existentes para evitar errores al re-ejecutar
DROP POLICY IF EXISTS "orders_select_all" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_admin_waiter" ON public.orders;
DROP POLICY IF EXISTS "orders_update_admin_waiter" ON public.orders;
DROP POLICY IF EXISTS "orders_delete_admin" ON public.orders;
-- Política: Permitir a los usuarios autenticados (admin o mesero) ver todas las órdenes.
CREATE POLICY "orders_select_all"
ON public.orders
FOR SELECT
TO authenticated
USING (
  TRUE
);
-- Política: Permitir a los administradores y meseros crear órdenes.
CREATE POLICY "orders_insert_admin_waiter"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt() ->> 'role' = 'admin') OR (auth.jwt() ->> 'role' = 'waiter')
);
-- Política: Permitir a los administradores y meseros actualizar (cerrar) órdenes.
CREATE POLICY "orders_update_admin_waiter"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  (auth.jwt() ->> 'role' = 'admin') OR (auth.jwt() ->> 'role' = 'waiter')
)
WITH CHECK (
  (auth.jwt() ->> 'role' = 'admin') OR (auth.jwt() ->> 'role' = 'waiter')
);
-- Política: Permitir a los administradores eliminar órdenes.
CREATE POLICY "orders_delete_admin"
ON public.orders
FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Habilitar RLS para la tabla order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
-- Eliminar políticas existentes para evitar errores al re-ejecutar
DROP POLICY IF EXISTS "order_items_select_all" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert_admin_waiter" ON public.order_items;
-- Política: Permitir a los usuarios autenticados (admin o mesero) ver los ítems de orden si pueden ver la orden asociada.
CREATE POLICY "order_items_select_all"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE public.orders.id = public.order_items.order_id
    AND (
      (auth.jwt() ->> 'role' = 'admin') OR (auth.jwt() ->> 'role' = 'waiter')
    )
  )
);
-- Política: Permitir a los administradores y meseros crear ítems de orden (cuando se crea una orden).
CREATE POLICY "order_items_insert_admin_waiter"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt() ->> 'role' = 'admin') OR (auth.jwt() ->> 'role' = 'waiter')
);

-- Habilitar RLS para la tabla push_subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
-- Eliminar políticas existentes para evitar errores al re-ejecutar
DROP POLICY IF EXISTS "push_subscriptions_select_own" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_insert_own" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_delete_own" ON public.push_subscriptions;
-- Política: Permitir a los usuarios autenticados seleccionar sus propias suscripciones
CREATE POLICY "push_subscriptions_select_own"
ON public.push_subscriptions
FOR SELECT
TO authenticated
USING (((auth.jwt() ->> 'id')::uuid) = user_id);
-- Política: Permitir a los usuarios autenticados insertar sus propias suscripciones
CREATE POLICY "push_subscriptions_insert_own"
ON public.push_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (((auth.jwt() ->> 'id')::uuid) = user_id);
-- Política: Permitir a los usuarios autenticados eliminar sus propias suscripciones
CREATE POLICY "push_subscriptions_delete_own"
ON public.push_subscriptions
FOR DELETE
TO authenticated
USING (((auth.jwt() ->> 'id')::uuid) = user_id);
