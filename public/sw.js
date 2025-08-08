// Importa las librerías de Firebase para el Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Configuración de Firebase (usa las mismas variables de entorno que en el cliente)
// NOTA IMPORTANTE: Para que el Service Worker funcione correctamente en producción,
// las variables de entorno deben ser reemplazadas por sus valores reales aquí.
// Next.js no inyecta automáticamente process.env en Service Workers.
// Asegúrate de que NEXT_PUBLIC_VAPID_PUBLIC_KEY también esté correctamente configurada
// en app/page.tsx para la suscripción.
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY", // <--- ¡REEMPLAZA ESTO CON TU CLAVE REAL!
  authDomain: "YOUR_FIREBASE_AUTH_DOMAIN", // <--- ¡REEMPLAZA ESTO CON TU DOMINIO REAL!
  projectId: "YOUR_FIREBASE_PROJECT_ID", // <--- ¡REEMPLAZA ESTO CON TU ID DE PROYECTO REAL!
  storageBucket: "YOUR_FIREBASE_STORAGE_BUCKET", // <--- ¡REEMPLAZA ESTO CON TU BUCKET REAL!
  messagingSenderId: "YOUR_FIREBASE_MESSAGING_SENDER_ID", // <--- ¡REEMPLAZA ESTO CON TU SENDER ID REAL!
  appId: "YOUR_FIREBASE_APP_ID" // <--- ¡REEMPLAZA ESTO CON TU APP ID REAL!
};

// Inicializa Firebase en el Service Worker
try {
  firebase.initializeApp(firebaseConfig);
  console.log('[SW] Firebase inicializado con éxito.');
} catch (err) {
  console.error('[SW] Error al inicializar Firebase:', err);
}

// Obtiene la instancia de Messaging (la mantenemos por si la necesitas más tarde, pero no usaremos onBackgroundMessage por ahora)
const messaging = firebase.messaging();

// Manejar clics en la notificación (opcional)
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Clic en notificación recibido:', event);
  event.notification.close(); // Cierra la notificación al hacer clic

  // Puedes abrir una URL específica o hacer algo más
  const urlToOpen = event.notification.data?.url || '/dashboard'; // Redirige al dashboard por defecto
  console.log('[SW] Abriendo URL:', urlToOpen);
  event.waitUntil(
    clients.openWindow(urlToOpen)
  );
});

// Este evento se dispara cuando el Service Worker se instala por primera vez
self.addEventListener('install', (event) => {
  console.log('[SW] Installed');
  self.skipWaiting(); // Fuerza la activación del Service Worker inmediatamente
});

// Este evento se dispara cuando el Service Worker se activa
self.addEventListener('activate', (event) => {
  console.log('[SW] Activated');
  event.waitUntil(clients.claim()); // Toma el control de las páginas inmediatamente
});

// Añadir un listener genérico para el evento 'push' para depuración
// Ahora manejaremos la notificación directamente aquí, sin onBackgroundMessage de Firebase
self.addEventListener('push', (event) => {
  console.log('[SW] Evento "push" recibido. Procesando directamente la notificación...');
  let notificationData = {};
  try {
    if (event.data) {
      notificationData = event.data.json(); // Parsear los datos JSON del evento push
      console.log('[SW] Datos del evento push (parsed):', notificationData);
    } else {
      console.log('[SW] Evento push sin datos.');
    }
  } catch (e) {
    console.error('[SW] Error al parsear datos del evento push:', e);
    // Fallback en caso de error de parseo
    notificationData = { notification: { title: 'Error de Notificación', body: 'No se pudieron leer los datos de la notificación.' } };
  }

  // Extraer título, cuerpo e icono de la notificación
  const notificationTitle = notificationData.notification?.title || 'Nueva Notificación';
  const notificationOptions = {
    body: notificationData.notification?.body || 'Tienes una nueva actualización.',
    icon: notificationData.notification?.icon || '/firebase-logo.png', // Asegúrate de que esta ruta sea válida y accesible
    data: notificationData.data, // Datos adicionales para el clic en la notificación
  };

  console.log('[SW] Intentando mostrar notificación con:', notificationTitle, notificationOptions);

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
      .then(() => {
        console.log('[SW] Notificación mostrada con éxito.');
      })
      .catch((error) => {
        console.error('[SW] Error al mostrar notificación:', error);
        // Logs adicionales para depuración de errores de showNotification
        if (error.name === 'TypeError') {
          console.error('[SW] TypeError: Posible problema con los argumentos de showNotification o el formato de los datos.');
        } else if (error.name === 'InvalidAccessError') {
          console.error('[SW] InvalidAccessError: El Service Worker podría no tener acceso al contexto de la ventana o el permiso fue revocado.');
        } else if (error.name === 'DataError') {
          console.error('[SW] DataError: Problema con los datos pasados a la notificación.');
        }
      })
  );
});
