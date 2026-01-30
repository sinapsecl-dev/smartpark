# Documento de Especificación Funcional
## Sistema SmartParking - Terrazas del Sol V

### 1. Introducción
Este documento detalla las funcionalidades implementadas, roles de usuario y reglas de negocio del sistema SmartParking, diseñado para la gestión justa y eficiente de estacionamientos de visitas.

### 2. Roles de Usuario y Permisos

#### 2.1 Residente
*   **Acceso**: Login mediante correo electrónico y contraseña (o Magic Link).
*   **Dashboard**: Vista personalizada con acceso rápido a reservas y estado de su unidad.
*   **Gestión de Reservas**:
    *   Crear nuevas reservas de estacionamiento.
    *   Visualizar historial de reservas y reservas activas.
    *   Cancelar reservas pendientes.
*   **Restricciones**: Sujeto a reglas de "Fair Play" y estado de morosidad.

#### 2.2 Administrador / Conserje
*   **Acceso**: Panel de administración diferenciado.
*   **Gestión de Reglas**: Capacidad para visualizar y editar las reglas de "Fair Play" (cuotas, tiempos, cooldown).
*   **Supervisión**: Visualización de métricas de uso y listado de reservas globales.
*   **Gestión de Usuarios**: (Funcionalidad base implementada en backend).

### 3. Funcionalidades Core (Características del Sistema)

#### 3.1 Autenticación y Perfil
*   Sistema seguro de inicio de sesión.
*   Validación de usuarios activos vs suspendidos.
*   Asociación de usuarios a Unidades (Departamentos) específicos.

#### 3.2 Motor de Reservas "Fair Play"
El sistema implementa un algoritmo de validación estricto para asegurar el uso equitativo de los recursos.

**Reglas de Validación Implementadas:**
1.  **Cuota Semanal**: Cada unidad tiene un límite de horas de uso por semana (Default: 15 horas).
    *   *Implementación*: Se verifica en tiempo real el consumo acumulado de la unidad antes de autorizar una nueva reserva.
2.  **Duración de Reserva**:
    *   Mínimo: 15 minutos.
    *   Máximo: 4 horas (Configurable).
    *   Intervalos: Bloques de 15 minutos.
3.  **Periodo de Enfriamiento (Cooldown)**:
    *   Tiempo de espera obligatorio entre el fin de una reserva y el inicio de la siguiente para la misma unidad.
    *   *Default*: 2 horas.
    *   *Objetivo*: Evitar el acaparamiento continuo de espacios por un mismo residente.
4.  **Estado de Morosidad (Delinquency)**:
    *   Bloqueo automático de nuevas reservas si la unidad está marcada como "Morosa" (`delinquent`) en el sistema.

#### 3.3 Interfaz de Usuario (UI/UX)
*   **Diseño Responsivo**: Optimizado para móviles (Mobile First) y escritorio.
*   **Componentes Visuales**: Uso de componentes modernos (Shadcn/UI, Tailwind) para una experiencia fluida.
*   **Feedback Inmediato**: Mensajes claros de error si una reserva viola alguna regla de Fair Play (ej. "Cuota semanal excedida").

### 4. Configuración del Sistema (Admin Panel)

El panel de administración permite ajustar los parámetros que rigen el algoritmo "Fair Play":
*   **Duración Máxima de Reserva**: Ajustable (ej. 1h a 8h).
*   **Periodo de Enfriamiento**: Ajustable (ej. 1h, 2h, 4h, 24h).
*   **Cuota Semanal**: Ajustable (ej. 5h a 30h).

*Nota: La infraestructura de base de datos (`condominiums` table) soporta estos cambios dinámicos.*

### 5. Aspectos Técnicos y Seguridad

*   **Arquitectura Multi-tenant**: Preparado para gestionar múltiples condominios (identificado por `condominium_id`).
*   **Seguridad de Datos (RLS)**: Políticas de seguridad a nivel de fila (Row Level Security) en base de datos.
    *   Un residente solo puede ver sus propios datos y reservas.
    *   Un administrador tiene acceso a datos del condominio que gestiona.
*   **Auditoría**: Registro de acciones críticas (tabla `audit_logs`) para trazabilidad.

### 6. Estado Actual de Desarrollo
*   ✅ **Backend & Base de Datos**: Estructura completa con reglas de integridad y seguridad.
*   ✅ **Lógica de Negocio**: Validaciones de Fair Play implementadas en servidor.
*   ✅ **Frontend Residente**: Flujo de reserva funcional con validaciones.
*   ✅ **Frontend Admin**: Formulario de configuración de reglas y visualización básica.

---
*Documento generado automáticamente el 21 de Enero de 2026.*
