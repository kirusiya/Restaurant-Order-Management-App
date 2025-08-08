# 🍽️ Restaurant Order Management App

Este proyecto es una aplicación web completa y robusta diseñada para la gestión eficiente de órdenes en un restaurante. Desarrollada con las últimas tecnologías de Vercel y un enfoque en la escalabilidad y la experiencia de usuario, la aplicación permite a los meseros y administradores gestionar productos, crear y cerrar órdenes, y monitorear el estado del restaurante a través de un dashboard en tiempo real.

## 🎯Objetivo General

Construir una aplicación web de gestión de órdenes para restaurantes que sea intuitiva, eficiente y escalable, facilitando las operaciones diarias y mejorando la comunicación interna a través de notificaciones en tiempo real.

## 🧩 Módulos Funcionales Detallados

### ✅ 1. CRUD de Productos
*   **Creación de Productos:** Permite a los administradores añadir nuevos productos al menú, especificando su `Nombre`, `Precio` y asignándolos a una `Categoría` existente.
*   **Listado de Productos:** Muestra un catálogo completo de todos los productos disponibles, con opciones de filtrado y búsqueda.
*   **Edición y Eliminación:** Funcionalidades para actualizar los detalles de un producto o eliminarlo del sistema (requiere permisos de administrador).

### ✅ 2. Creación y Gestión de Órdenes
*   **Selección de Productos:** Interfaz intuitiva para que los meseros seleccionen productos del catálogo y los añadan a una orden.
*   **Cálculo en Tiempo Real:** El `Total` de la orden se actualiza dinámicamente a medida que se añaden o eliminan productos, reflejando la sumatoria de los precios.
*   **Cierre de Órdenes:** Un botón dedicado permite "cerrar" una orden, marcándola como completada y guardándola en la base de datos. Este proceso activa notificaciones en tiempo real.
*   **Confirmación de Cierre:** Antes de cerrar una orden, se muestra un modal de confirmación para evitar cierres accidentales.

### ✅ 3. Dashboard de Órdenes
*   **Visualización Completa:** Muestra una lista detallada de todas las órdenes creadas, incluyendo órdenes abiertas y cerradas.
*   **Detalles de la Orden:** Cada entrada de la orden muestra su `ID` (con formato `#ID`), `Fecha de Creación`, `Total` y una lista de los `Productos` incluidos.
*   **Ordenación Descendente:** Las órdenes se muestran por defecto en orden descendente por fecha de creación, mostrando las más recientes primero.
*   **Actualizaciones en Tiempo Real:** Cuando una orden es cerrada por cualquier usuario, su estado se actualiza automáticamente en el dashboard de todos los usuarios conectados, sin necesidad de recargar la página.

### ✅ 4. Formularios con Validación
*   **Validación Robusta:** Todos los formularios (creación de productos, órdenes, usuarios, categorías) implementan validaciones del lado del cliente y del servidor para asegurar la integridad de los datos (ej: nombre requerido, precio mayor a cero, formato de email, etc.).
*   **Manejo de Errores:** Mensajes de error claros y contextuales guían al usuario en caso de entradas inválidas.

### ✅ 5. Autenticación y Autorización
*   **Sistema de Login:** Permite a los usuarios (meseros y administradores) iniciar sesión de forma segura.
*   **Roles de Usuario:** Distinción entre roles `admin` y `mesero`, con diferentes niveles de acceso a funcionalidades (ej: solo `admin` puede gestionar usuarios y categorías).
*   **Protección de Rutas:** Las rutas y operaciones sensibles están protegidas, requiriendo autenticación y el rol adecuado.

### ✅ 6. Notificaciones Push en Tiempo Real
*   **Notificaciones Globales:** Cuando una orden es cerrada, se envía una notificación push a todos los usuarios suscritos, informando sobre el cambio de estado.
*   **Permisos de Notificación:** La aplicación solicita permisos de notificación al usuario al iniciar sesión si no los tiene concedidos.
*   **Service Worker:** Utiliza un Service Worker para gestionar las suscripciones y mostrar las notificaciones incluso cuando la aplicación no está en primer plano.

## 🛠️ Requisitos Técnicos y Tecnologías

### ⚛️ Frontend (React)
*   **Framework:** [Next.js 14](https://nextjs.org/) (App Router) - Para renderizado del lado del servidor (SSR), generación de sitios estáticos (SSG) y rutas API.
*   **Lenguaje:** [TypeScript](https://www.typescriptlang.org/) - Para un código más robusto y mantenible.
*   **Manejo de Estado:** React Hooks (`useState`, `useEffect`, `useCallback`, `useRef`, `useActionState`) - Para una gestión de estado eficiente y reactiva.
*   **Componentes UI:** [shadcn/ui](https://ui.shadcn.com/) - Colección de componentes UI reutilizables y accesibles, construidos con Tailwind CSS y Radix UI.
*   **Estilos:** [Tailwind CSS](https://tailwindcss.com/) - Framework CSS utility-first para un diseño rápido y responsivo.
*   **Iconos:** [Lucide React](https://lucide.dev/icons/) - Conjunto de iconos personalizables.
*   **Formularios:**
    *   [React Hook Form](https://react-hook-form.com/) - Para la gestión de formularios con alto rendimiento y validación.
    *   [Zod](https://zod.dev/) - Para la definición y validación de esquemas de datos.
*   **Notificaciones:** [react-hot-toast](https://react-hot-toast.com/) - Para mensajes de notificación temporales (toasts).

### 🚀 Backend (API REST)
*   **Plataforma:** Node.js con Express (implementado a través de [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)).
*   **Lenguaje:** TypeScript.
*   **Base de Datos:** [PostgreSQL](https://www.postgresql.org/) - Base de datos relacional robusta y de código abierto.
*   **ORM/Cliente DB:** [Supabase Client Library](https://supabase.com/docs/reference/javascript/initializing) - Para interactuar con la base de datos y la autenticación de Supabase.
*   **Autenticación:** [Supabase Auth](https://supabase.com/docs/guides/auth) - Sistema de autenticación integrado con JWT.
*   **Notificaciones Push:** Este proyecto utiliza [Firebase Cloud Messaging (FCM)](https://firebase.google.com/docs/cloud-messaging) para el envío de notificaciones push en tiempo real. La comunicación se realiza mediante una API REST que permite registrar tokens de dispositivos y enviar notificaciones a los navegadores compatibles.
*   **Manejo de JWT:** [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) - Para la creación y verificación de tokens JWT.

### ☁ Infraestructura y Servicios
*   **Base de Datos & Autenticación:** [Supabase](https://supabase.com/) - Backend-as-a-Service que proporciona PostgreSQL, autenticación, Realtime y más.
*   **Despliegue:** [Vercel](https://vercel.com/) - Plataforma para el despliegue rápido y escalable de aplicaciones Next.js.
*   **Contenerización:** [Docker](https://www.docker.com/) y [Docker Compose](https://docs.docker.com/compose/) - Para la creación de entornos de desarrollo y producción consistentes y portátiles.

### 📲 Flujo de Notificaciones Push

1. El cliente solicita permiso al navegador para recibir notificaciones.
2. Se genera una suscripción Web Push con `PushManager.subscribe()`, incluyendo las claves VAPID.
3. El cliente envía esta suscripción al backend mediante una solicitud `POST` al endpoint `/subscribe-push`.
4. El backend valida y almacena los datos de la suscripción (`endpoint`, `p256dh`, `auth`).
5. Para enviar notificaciones, el servidor recupera la suscripción desde la base de datos y la usa para disparar una notificación al navegador usando `web-push` o FCM.



### 📬 Endpoint: `/subscribe-push`

**Método:** `POST`  
**Descripción:** Suscribir un cliente para recibir notificaciones push.  
**Content-Type:** `application/json`

#### 🔸 Cuerpo de la solicitud

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/example123",
  "keys": {
    "p256dh": "BPc_xyz123...",
    "auth": "abc987..."
  }
}
```


## 🗂️ Estructura del Proyecto

El proyecto sigue la convención del App Router de Next.js, con una estructura modular y clara:

```
.
├── app/                      # Rutas de la aplicación y componentes de página
│   ├── api/                  # Rutas de la API REST (Route Handlers)
│   │   ├── auth/             # Endpoints de autenticación (login)
│   │   ├── categories/       # Endpoints para gestión de categorías
│   │   ├── orders/           # Endpoints para gestión de órdenes
│   │   ├── products/         # Endpoints para gestión de productos
│   │   └── subscribe-push/   # Endpoint para suscripciones a notificaciones push
│   ├── categories/           # Página para la gestión de categorías
│   ├── dashboard/            # Dashboard principal con la lista de órdenes
│   ├── layout.tsx            # Layout principal de la aplicación
│   ├── login/                # Página de inicio de sesión
│   ├── orders/manage/        # Página para la creación y gestión de órdenes
│   ├── page.tsx              # Página de inicio (redirección o landing)
│   ├── products/             # Página para la gestión de productos
│   └── users/                # Página para la gestión de usuarios
├── components/               # Componentes React reutilizables
│   ├── ui/                   # Componentes de shadcn/ui (Button, Card, Dialog, Table, etc.)
│   ├── category-create-form.tsx
│   ├── category-form-dialog.tsx
│   ├── delete-confirmation-dialog.tsx # Modal de confirmación genérico
│   ├── navbar.tsx            # Barra de navegación principal
│   ├── product-create-form.tsx
│   ├── product-form-dialog.tsx
│   ├── user-create-form.tsx
│   └── user-form-dialog.tsx
├── hooks/                    # Custom React Hooks
│   ├── use-mobile.ts
│   └── use-toast.ts
├── lib/                      # Utilidades y configuraciones
│   ├── auth.ts               # Funciones de autenticación y verificación de JWT
│   └── supabase.ts           # Cliente de Supabase y configuración
├── public/                   # Archivos estáticos (imágenes, service worker)
│   └── sw.js                 # Service Worker para notificaciones push
├── scripts/                  # Scripts de base de datos y utilidades
│   ├── init_db.sql           # Script SQL unificado para inicializar la DB y RLS   
│   └── hash-password.js      # Script para hashear contraseñas (uso único)
├── .env.local.example        # Ejemplo de archivo de variables de entorno
├── Dockerfile                # Definición de la imagen Docker de la aplicación
├── docker-compose.yml        # Orquestación de Docker para desarrollo local
├── openapi.yaml              # Especificación OpenAPI para la API REST
├── package.json              # Dependencias y scripts del proyecto
├── tsconfig.json             # Configuración de TypeScript
└── vercel.json               # Configuración de despliegue en Vercel
```

## ▶️ Guía de Instalación y Ejecución

Sigue estos pasos detallados para configurar y ejecutar el proyecto localmente.

### Requisitos Previos

Asegúrate de tener instalados los siguientes programas en tu sistema:

*   **Node.js:** Versión 20.x o superior.
*   **Gestor de Paquetes:** `npm` (viene con Node.js), `yarn` o `pnpm`.
*   **Docker Desktop:** Incluye Docker Engine y Docker Compose, esencial para la ejecución local contenerizada.
*   **Una cuenta de Supabase:** Y un proyecto activo para la base de datos y autenticación.

### 1. Configuración de Supabase

1.  **Crear un Proyecto Supabase:**
    *   Ve a [Supabase](https://supabase.com/) y crea una cuenta si no la tienes.
    *   Crea un nuevo proyecto. Anota la `Project URL` y la `Anon Key` de la sección `Project Settings` -> `API`.
    *   En `Project Settings` -> `API`, también encontrarás la `Service Role Key`. **Guárdala de forma segura**, ya que tiene privilegios de administrador y no debe exponerse en el frontend.
2.  **Variables de Entorno:**
    *   Crea un archivo llamado `.env.local` en la **raíz de tu proyecto** (al mismo nivel que `package.json`).
    *   Copia las siguientes variables y reemplaza los valores con los de tu proyecto Supabase:

## 🔣 Developer   

- 👨‍💻 **Ing. Edward Avalos** - *Full Stack Developer y Desarrollador Principal* - [GitHub](https://github.com/kirusiya/) | [LinkedIn](https://www.linkedin.com/in/edward-avalos-severiche/)
- 📧 **Email**: edward@ajamba.org
- 📱 **WhatsApp Business**: (+591) 61781119 | [Whatsapp](https://wa.me/59161781119)



*For technical support or questions about this implementation, please refer to the troubleshooting section or review the comprehensive code documentation within the project files.*    
