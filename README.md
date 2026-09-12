# Rancho Doble S — Portal Web Vecinal

Sistema integral cliente-servidor para la gestión, control de accesos, reservas y comunicación comunitaria del predio **Rancho Doble S**.

---

##  Arquitectura del Sistema

* **Backend:** Node.js con Express 5.
* **Base de datos:** SQLite persistente de alto rendimiento mediante el módulo nativo `node:sqlite` (`data/ranchodobles.sqlite` con WAL mode).
* **Seguridad & Autenticación:**
  * Encriptación de contraseñas con `bcryptjs` (salt rounds = 10). Ninguna contraseña viaja o se almacena en texto plano.
  * Tokens de sesión firmados con `jsonwebtoken` (JWT con caducidad de 7 días).
  * Control de acceso basado en roles (`admin` y `user`).
  * Sanitización contra inyección de código y XSS en todas las salidas dinámicas del frontend.
* **Frontend:** Vanilla HTML5, CSS3 moderno (Glassmorphism, CSS Grid y Flexbox responsivo) y JavaScript ES6+ con cliente API modular (`assets/js/api.js`).

---

## 🚀 Inicio Rápido

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Iniciar el servidor:**
   ```bash
   npm start
   ```
   *(Para desarrollo con reinicio automático: `npm run dev`)*

3. **Abrir en el navegador:**
   Accedé a [http://localhost:3000](http://localhost:3000).

---

## 👥 Cuentas de Acceso Preconfiguradas

| Rol | Nombre | Email / Identificador | Contraseña | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **Administrador** | Admin Administrador | `admin@ranchodobles.com` | `admin123` | Aprobado |
| **Propietario** | Lucía Sánchez | `lucia@ranchodobles.com` | `123456` | Aprobado |
| **Propietario** | Nicolás García | `nicolas@gmail.com` | `123456` | Aprobado |
| **Pendiente** | Roberto Gómez | `roberto@gmail.com` | `123456` | Pendiente de aprobación |

---

## 📋 Módulos y Funcionalidades Implementadas

### 1. Autenticación y Cuentas
* **Registro de nuevos vecinos:** Formulario completo con datos personales y de contacto. Quedan automáticamente en estado `Pendiente de aprobación`.
* **Login seguro:** Admite ingreso por email o número de DNI.
* **Persistencia de sesión:** Mantiene al usuario conectado al recargar la página (F5) mediante `/api/auth/me`.
* **Cierre de sesión seguro:** Botón de logout en el chip de perfil con limpieza inmediata del token.

### 2. Panel de Administración y Guardia (Exclusivo Administrador)
* **Aprobación de cuentas:** Lista en tiempo real de solicitudes pendientes con botones de **Aprobar** o **Rechazar** con 1 clic.
* **Control de accesos y visitas (Garita de guardia):** Visualización de todas las visitas programadas y botón para **Marcar Ingreso** en el pórtico, notificando automáticamente al vecino.
* **Métricas centrales:** Contador de vecinos activos, solicitudes pendientes y visitas del día.
* **Gestión de comunicados:** Publicación y eliminación de noticias oficiales con imagen y categoría.

### 3. Reserva de Canchas de Tenis
* **Selector de fecha dinámico:** Permite reservar turnos para el día de **Hoy**, **Mañana** o cualquier fecha futura mediante el selector de calendario.
* **Bloqueo de solapamientos:** Restricción de unicidad `UNIQUE(date, slot)` para evitar dobles reservas.
* **Identificación del titular:** Muestra el nombre real del titular que reservó.
* **Detección de horarios pasados:** Los turnos del día que ya concluyeron se indican como *Finalizado* sin desaparecer de la grilla.
* **Cancelación autorizada:** El propietario puede cancelar sus propios turnos; el administrador tiene facultades para cancelar cualquier turno si es necesario por mantenimiento o lluvia.

### 4. Mis Visitas
* Registro anticipado de invitados indicando nombre, DNI, fecha y horario.
* Historial con seguimiento de estado (*Pendiente*, *Confirmada*, *Ingresado*).
* Posibilidad de cancelar visitas programadas.

### 5. Centro de Notificaciones
* Notificaciones automáticas por:
  * Registro de nuevas visitas.
  * Ingreso efectivo de visitas por guardia.
  * Confirmación o cancelación de reservas de tenis.
  * Aprobación de cuenta de usuario.
  * Publicación de comunicados del predio.
* Contador de notificaciones no leídas y función para marcar todo como leído.
