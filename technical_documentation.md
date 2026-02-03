# Documentación Técnica: Sistema de Gestión SmartPark

Este documento detalla la arquitectura, tecnologías, diseño y especificaciones funcionales del sistema SmartPark.

---

## 1. Stack Tecnológico

El proyecto está construido sobre una arquitectura moderna, escalable y segura, priorizando el rendimiento y la experiencia de usuario.

### Core Framework & Lenguaje
-   **Runtime**: Node.js
-   **Framework Full-Stack**: [Next.js 16.1.1](https://nextjs.org/) (App Router)
-   **Lenguaje**: [TypeScript 5](https://www.typescriptlang.org/) (Strict Mode)
-   **Build Tool**: Webpack (vía Next.js CLI) / Vite (para tests)

### Estilos & UI
-   **CSS Framework**: [Tailwind CSS v4](https://tailwindcss.com/)
-   **Component Primitives**: [Radix UI](https://www.radix-ui.com/) (Componentes base accesibles)
-   **Components Library**: [shadcn/ui](https://ui.shadcn.com/) (Implementación personalizada)
-   **Icons**: [Lucide React](https://lucide.dev/)
-   **Animations**: [Framer Motion](https://www.framer.com/motion/) (`framer-motion` ^12.26)
-   **Avatars**: `@dicebear/core` & `@dicebear/collection`

### State Management & Forms
-   **Form Handling**: [React Hook Form](https://react-hook-form.com/)
-   **Validation**: [Zod](https://zod.dev/)
-   **Schema Resolution**: `@hookform/resolvers`

### Backend & Database (BaaS)
-   **Platform**: [Supabase](https://supabase.com/)
-   **Database**: PostgreSQL 14.1
-   **Auth**: Supabase Auth (SSR Integration)
-   **Client**: `@supabase/supabase-js`, `@supabase/ssr`

### Testing & QA
-   **Unit/Integration**: [Vitest](https://vitest.dev/)
-   **E2E Testing**: [Playwright](https://playwright.dev/)
-   **Performance**: Lighthouse

---

## 2. Paleta de Colores y Sistema de Diseño

El sistema utiliza un tema dual (Light/Dark) con colores semánticos definidos en `tailwind.config.ts`.

### Colores Principales
-   **Primary (Brand)**: `#0da2e7` (Cyan vivo, usado en botones principales, acentos y estados activos).
-   **Destructive**: Roji/Ambar para acciones de peligro o errores.

### Fondos y Superficies
| Token | Light Mode (`hex`) | Dark Mode (`hex`) | Uso |
| :--- | :--- | :--- | :--- |
| `background` | `#f8fbfc` | `#101c22` | Fondo principal de la página |
| `surface` | `#FFFFFF` | `#1A262E` | Tarjetas, modales, elementos elevados |
| `border` | `hsl(...)` | `hsl(...)` | Bordes sutiles para separación |

### Tipografía
-   **Sans**: `Inter` (Principal)
-   **Mono**: `Noto Sans Mono` (Para patentes y códigos)

---

## 3. Arquitectura y Estructura del Proyecto

Estructura basada en funcionalidades y rutas del App Router de Next.js.

```
src/
├── app/                    # Rutas de la aplicación (App Router)
│   ├── (auth)/             # Grupos de rutas de autenticación (login, forgot-pass)
│   ├── admin/              # Panel de administración (protegido por rol)
│   ├── dashboard/          # Panel principal de residentes
│   ├── profile/            # Gestión de perfil de usuario
│   ├── actions/            # Server Actions reutilizables
│   ├── api/                # Route Handlers (API Endpoints)
│   └── lib/                # Utilidades específicas del server/app
├── components/             # Catálogo de Componentes
│   ├── ui/                 # Componentes base (Button, Input, Dialog, etc.)
│   ├── parking/            # Componentes de negocio (BookingForm, SpotCard)
│   ├── dashboard/          # Componentes de layout (Header, Stats)
│   ├── gamification/       # Elementos de gamificación (UserBadge, XPBar)
│   └── shared/             # Componentes compartidos (ResponsiveDialog)
├── lib/                    # Utilidades generales (Supabase client, Utils)
└── types/                  # Definiciones de tipos TypeScript y BD
```

---

## 4. Esquema de Base de Datos (Supabase)

El sistema utiliza una arquitectura **Multi-Tenant** donde todas las tablas principales están segregadas por `condominium_id`.

### Tablas Core
-   **`condominiums`**: Entidad raíz para el multi-tenancy. Contiene configuración global del condominio (reglas de negocio, tiempos de enfriamiento).
-   **`users`**: Perfiles extendidos vinculados a `auth.users`.
    -   `role`: `resident` | `admin`
    -   `unit_id`: Unidad asignada.
    -   `condominium_id`: FK para aislamiento de datos.
-   **`units`** (Unidades): Departamentos/Casas.
    -   `weekly_quota_hours`: Cuota configurada.
    -   `current_week_usage_minutes`: Consumo acumulado (se resetea semanalmente).
    -   `status`: Control de morosidad (`active` | `delinquent`).
-   **`spots`** (Estacionamientos): Recursos reservables del condominio.

### Operativas
-   **`bookings`**: Registro central de reservas.
    -   Estados: `confirmed`, `active` (en curso), `completed`, `cancelled`, `reported`.
    -   Validaciones: Utiliza `spot_id` y rangos de tiempo (`start_time`, `end_time`).
-   **`audit_logs`**: Trazabilidad de acciones críticas (entradas, salidas, creación de usuarios).

### Módulos Adicionales (Activos)
-   **`infractions`**: Sistema de reportes de mal uso.
    -   `report_type`: `exceeded_time` (exceso de uso), `ghost_booking` (no show).
    -   `status`: `pending`, `resolved`.
-   **`config_rules`**: Configuración dinámica de reglas por condominio.
    -   Permite a los administradores ajustar parámetros sin deploy (ej: modificar textos, límites variables).
-   **`pending_registrations`**: Flujo de Onboarding.
    -   Almacena solicitudes de registro antes de aprobación administrativa.
    -   Estados: `pending`, `approved`, `rejected`.

---

## 5. Especificaciones Funcionales y Reglas de Negocio

### Gestión de Reservas (Core)
1.  **Validación Fair Play**:
    -   Verificación de cupo semanal por unidad.
    -   Verificación de tiempos de enfriamiento (cooldown) entre reservas consecutivas.
    -   Bloqueo de usuarios morosos.
2.  **Flujo de Reserva**:
    -   Selección de patente (con persistencia local y validación de formato).
    -   Selección de hora de inicio (intervalos de 15 min).
    -   Selección de duración (Smart defaults, max 4 horas).
    -   Confirmación inmediata (One-Step flow).
3.  **Cancelación**:
    -   Permitida solo si la reserva no ha comenzado.
    -   Disponible solo para el propietario de la reserva.
4.  **Concurrencia**:
    -   Validación en servidor para evitar doble reserva (race conditions).

### Roles y Permisos
-   **Residente**:
    -   Ver dashboard y disponibilidad.
    -   Crear/Editar/Cancelar sus propias reservas.
    -   Ver su perfil y estadísticas.
-   **Admin**:
    -   Acceso a `/admin`.
    -   Gestión de usuarios y unidades.
    -   Visualización de todos los registros y métricas.
    -   Configuración de reglas globales.

---

## 6. Consideraciones de Responsividad (Mobile vs Desktop)

La aplicación sigue un enfoque **Mobile-First**.

### Navegación
-   **Mobile**: Bottom Navigation Bar o Menú Hamburguesa en Header. Header simplificado con estadísticas clave (XP, Racha).
-   **Desktop**: Sidebar lateral persistente o Top Navigation completa.

### Formularios y Modales (`ResponsiveDialog`)
-   **Mobile**: Implementación de **Drawers** (hojas deslizantes desde abajo).
    -   Max-height controlado (75-85vh).
    -   Scroll interno activado (`overflow-y-auto`).
    -   Botones de acción "Sticky" al pie de la pantalla para fácil acceso.
-   **Desktop**: **Dialogs** (ventanas modales centradas).
    -   Ancho fijo (`sm:max-w-[425px]`).

### Adaptaciones Específicas
1.  **Tablas y Listas**:
    -   Desktop: Tablas completas (`<Table>`).
    -   Mobile: "Cards" o listas compactas (`BookingSummary` compacto).
2.  **Botones**:
    -   Áreas de toque aumentadas en mobile (min 44px height).
    -   Ubicación inferior fija para acciones primarias (ej: "Confirmar Reserva").

---

## 7. Buenas Prácticas de Desarrollo

### Código
-   **Tipado Estricto**: Uso extensivo de interfaces y tipos generados por Supabase (`Tables<'table_name'>`).
-   **Server Actions**: Lógica de mutación y validación segura en el servidor (`src/app/lib/actions`).
-   **Componentización**: Componentes pequeños, puros y reutilizables. Separación de UI (`components/ui`) y Negocio (`components/parking`).

### UI/UX
-   **Feedback Inmediato**: Uso de "Toasts" para notificaciones y "Confetti" para celebraciones (gamificación).
-   **Skeleton Loading**: Estados de carga visuales para evitar Layout Shifts.
-   **Validación Cliente/Servidor**: Validación Zod inmediata en cliente + re-validación robusta en servidor.
