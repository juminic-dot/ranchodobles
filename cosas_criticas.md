### 🚨 1. Fallas Críticas de Seguridad

  #### 1.1. Exposición Total de Archivos Sensibles y Base de Datos (Muy Grave)

  • Ubicación: server.js:26-27

    app.use(express.static(path.join(__dirname)));
    app.use('/ranchos', express.static(path.join(__dirname)));

  • Mecánica: Al declarar como carpeta estática el directorio raíz (__dirname), Express sirve públicamente todos los archivos del proyecto.
  • Impacto: Cualquier persona puede ingresar desde el navegador y descargar:
      • http://localhost:3000/.env: Revela la clave secreta JWT_SECRET. Con esta clave, cualquiera puede firmar un token de administrador falso y tomar control del sistema.
      • http://localhost:3000/data/ranchodobles.sqlite: Permite descargar la base de datos completa (hashes de contraseñas, DNIs, teléfonos, correos y visitas).
      • http://localhost:3000/package.json y el código fuente del servidor.
  • Solución: Servir de forma estática únicamente la carpeta pública de assets y los archivos HTML necesarios, bloqueando el acceso a .env, /server y /data.
  ──────
  #### 1.2. Falsificación de Pases de Acceso sin Autenticación

  • Ubicación: visits.js:8-25 e invitacion.html:241-244
  • Mecánica: La ruta /api/visits/guest-register es totalmente pública y no verifica la autenticidad de la invitación. Toma el hostId y el nombre del residente directamente de la URL (?host=...&name=...).
  Si se omiten, asigna automáticamente al Administrador (users id 1) e inserta la visita directamente en estado "Confirmada".
  • Impacto: Cualquier persona que conozca o adivine la URL puede autogenerarse un pase con QR válido y autorizado para ingresar al predio, suplantando a cualquier vecino o a la administración.
  • Solución: Las invitaciones deben requerir un token firmado (con vencimiento de 24/48 hs) generado únicamente cuando el propietario crea la invitación, o bien requerir confirmación del residente antes de
  considerarse "Confirmada".
  ──────
  #### 1.3. Falta de Rate Limiting y Operaciones Sincrónicas Bloqueantes (Riesgo DoS)

  • Ubicación: auth.js:41 y auth.js:101
  • Mecánica:
      • No hay limitador de peticiones (express-rate-limit) en los endpoints /login ni /register, facilitando ataques de fuerza bruta.
      • Se usan funciones sincrónicas: bcrypt.hashSync y bcrypt.compareSync.
  • Impacto: Cada cálculo de bcrypt retiene el hilo único de Node.js por ~100 ms. Con 15 a 20 peticiones concurrentes a /login, el servidor completo se congela y deja de responder a todos los usuarios.
  • Solución: Implementar await bcrypt.compare(...) y await bcrypt.hash(...) asíncronos y agregar rate limiting.
  ──────
  ### ⚠️ 2. Inconsistencias de Lógica y Flujo de Negocio

  #### 2.1. Las Expensas se "Pagan" sin Control ni Aprobación

  • Ubicación: expenses.js:48
  • Inconsistencia: Cuando un residente pulsa "Informar Pago", el endpoint pasa el estado a 'Pagado' de inmediato en la base de datos.
  • Impacto: Cualquier vecino puede marcar sus expensas como pagadas sin subir comprobante de transferencia y sin validación de administración.
  • Solución: Debe pasar al estado 'En revisión' o 'Pendiente de aprobación' adjuntando número o comprobante, y solo el rol admin debe tener la facultad de marcarlo como 'Pagado'.

  #### 2.2. Bug Global en "Marcar todo como leído" de Notificaciones

  • Ubicación: notifications.js:28-31

    UPDATE notifications SET read = 1 WHERE userId = ? OR userId IS NULL

  • Inconsistencia: Las notificaciones generales de administración tienen userId = NULL. Si un vecino pulsa "Marcar todo como leído", actualiza userId IS NULL a read = 1 en la base de datos central.
  • Impacto: Las notificaciones se marcan como leídas para todos los demás vecinos del barrio.

  #### 2.3. No hay Gestión de Expensas para la Administración

  • Inconsistencia: La tabla expenses existe y los usuarios pueden verla, pero no existe ningún endpoint ni interfaz para que el administrador cargue los nuevos periodos, edite montos o vea quién pagó y
  quién adeuda. Las expensas actuales solo se crearon en el seed inicial.

  #### 2.4. Borrado Incompleto de Datos Huérfanos

  • Ubicación: admin.js:80-84
  • Inconsistencia: Al eliminar un usuario (DELETE /api/admin/users/:id), el backend borra reservas, visitas y notificaciones, pero omite borrar expenses. Quedan registros huérfanos asociados a un ID
  inexistente.

  #### 2.5. Falta de Restricciones en Reservas de Canchas

  • Ubicación: bookings.js:38
  • Inconsistencia: No hay límite de turnos por vecino. Un solo usuario puede reservar todos los turnos disponibles de un día (de 07:00 a 22:00 hs) sin restricción de cupo diario o semanal.
  ──────
  ### 🎨 3. Observaciones y Fallas en el Frontend

  #### 3.1. Enlace Erróneo al Compartir por WhatsApp en la Invitación

  • Ubicación: invitacion.html:347
  • Problema: En el botón "Compartir este pase por WhatsApp", el enlace que envía es window.location.href. Eso le manda al contacto la página con el formulario vacío nuevamente, en lugar de mostrar el pase
  generado con el código QR.

  #### 3.2. Fuga de Datos a Servicio de Terceros (Fallback QR)

  • Ubicación: app.js:426

    const qrSrc = visit.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=...`;

  • Problema: Si falta el QR devuelto por la base de datos, el código envía Nombre, DNI y Patente del visitante a los servidores de api.qrserver.com mediante una petición GET pública, exponiendo datos
  personales a terceros.

  #### 3.3. Elementos Inexistentes en el DOM

  • Ubicación: app.js:52-53
  • Problema: Se buscan los IDs adminNavBtn y adminPendingCountBadge, los cuales no existen en index.html. Aunque hay comprobaciones condicionales, son variables huérfanas que convendría limpiar o alinear
  con los elementos reales (#homeAdminBtn, #homeAdminPendingBadge).

  #### 3.4. Experiencia de Navegación (SPA sin History API)

  • Ubicación: app.js:123
  • Problema: Al navegar entre secciones (Reservas, Expensas, Visitas), no se actualiza el historial (history.pushState). Si el usuario navega desde el celular y presiona el botón "Atrás" de Android o del
  navegador, se sale de la aplicación en vez de volver al Menú Principal.
  ──────
  ### 📋 Resumen de Prioridades Recomendadas

   Prioridad                                              │ Tarea                                                                                     │ Impacto
  ────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────
   🔴 Urgente                                             │ Restringir el middleware estático de server.js para no exponer .env ni data/.             │ Evita robo de BD y credenciales
   🔴 Urgente                                             │ Proteger /api/visits/guest-register con tokens temporales firmados por el anfitrión.      │ Evita generación libre de pases al predio
   🟡 Media                                               │ Migrar bcrypt a métodos asíncronos y añadir limitador de tasa de peticiones.              │ Evita caídas por saturación / DoS
   🟡 Media                                               │ Modificar el flujo de expensas: estado "Pendiente de verificación" y aprobación de admin. │ Integridad financiera
   🟢 Baja                                                │ Corregir el enlace de WhatsApp en invitacion.html e integrar History API en el frontend.  │ Experiencia de usuario


   ### 🔍 Diagnóstico del Panel de Administración Actual

  1. Expensas (Emisión Inexistente):
      • Actualmente: El admin puede ver los comprobantes informados y hacer clic en "Acreditar Pago" o "Desestimar".
      • Falta crítica: No existe forma de emitir nuevos periodos. Las expensas actuales solo existen porque vinieron en el seed inicial. El administrador no tiene un botón ni formulario para generar la liquidación del mes (ej: Octubre 2026 - $150.000) para todos los propietarios.
  2. Control de Guardia en Visitas (Falta de Búsqueda Rápida):
      • Actualmente: Muestra las últimas visitas y permite pulsar "Marcar Ingreso".
      • Falta operativa: Cuando un vehículo llega a la barrera de entrada, el guardia no puede ponerse a scrollear una lista larga: necesita un buscador en tiempo real por Patente o por DNI, y preferentemente poder registrar tanto el Ingreso como el Egreso (para saber qué visitas continúan dentro del barrio).
      En este punto haria que se pueda leer el QR del visitante desde el panel administrador. (ver como implementar)
  3. Padrón de Vecinos (Solo muestra los pendientes):
      • Actualmente: El panel solo muestra las solicitudes pendientes para aprobar o rechazar. Una vez que el vecino es aprobado, desaparece de la vista del admin.
      • Falta: Un listado/padrón de "Vecinos Activos" donde el administrador pueda ver a todos los residentes habilitados, sus teléfonos, correos, lotes/manzanas y dar de baja o promover a administrador si fuera necesario. Tambien crear usuarios.
  4. Supervisión de Reservas de Canchas:
      • Actualmente: Los vecinos reservan turnos en la cancha de tenis, pero la administración no tiene una vista consolidada para saber quién juega hoy ni la facultad de bloquear turnos por mantenimiento, eventos o lluvia.
  5. Avisos y Alertas Masivas Inmediatas:
      • Actualmente: Se pueden publicar novedades con foto.
      • Falta: Un emisor de Alerta General que inserte una notificación directa en la campanita 🔔 de todos los vecinos (ej: "Corte de suministro de agua por reparación de 14 a 17 hs").
  6. Alineación con las Reglas Oficiales (Proyecto Rancho Doble S - Reglas.docx):
      • El documento del proyecto estipula la cuenta preconfigurada:
          • Usuario: SuperAdmin
          • Contraseña: AdminGTC123
      • El identificador oficial de los propietarios debe ser su Lote + Manzana (ej: L9M2).

  ──────
  ### 🛠️ Plan de Trabajo Propuesto para el Panel Administrador

  Te propongo estructurarlo en estas prioridades:

              Prioridad            │ Módulo Administrador           │ Funcionalidad a Incorporar
  ─────────────────────────────────┼────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
               Paso 1              │ Gestión y Emisión de Expensas  │ Formulario modal para emitir expensas del mes (masivas a todos los vecinos o individuales), con monto, concepto y fecha de vencimiento.
               Paso 2              │ Puesto de Guardia (Buscador)   │ Barra de búsqueda instantánea por Patente/DNI/Nombre en el panel de visitas y opción de marcar Egreso.
               Paso 3              │ Padrón de Vecinos Activos      │ Vista completa de residentes habilitados, buscador, lote/manzana y opciones de gestión de cuenta.
               Paso 4              │ Control de Canchas             │ Grilla de reservas del día en el panel admin y botón de bloqueo por mantenimiento.
               Paso 5              │ Alertas Push Comunitarias      │ Envío de notificaciones directas a la campanita de todos los vecinos.
               Paso 6              │ Credenciales y Lote/Manzana    │ Integrar acceso SuperAdmin / AdminGTC123 y soporte para lote/manzana (L9M2).
  ──────

  ## Lo que anotamos con los chicos de discord
  * No tiene invalidación de token (si cambias contraseña, invalidas el token) ok
  * Quitar super admin del textbox ok
  * Revizar el tema pago de expensas que se pueda subir foto del comprobante. ok
  * Acomodar el responsive para celulares ok
  * Una vez que un vecino se registra, volver al inicio de sesion, dar el mensaje que administracion acreditara la cuenta en breve. ok
  * quitar los puntos verdes del inicio de sesion, quedara el logo y portal digital para novedades y servicios del predio. ok

  * un boton para padron de vecinos activos y solicitud de registro de vecinos ok
  * un boton de control de guardia (ingresos y egresos)  ok
  * un boton de gestion y acreditacion de expensas ok
  * un boton para supervicion y control de canchas ok
  * un boton para avisos y alertas masivas inmediatas ok
  * Al registrarse un nuevo vecino, al administrador le debe permitir agregar el identificador de lote manzana y tambien modificar los datos del vecino, pero nunca modificar o visualizar su contraseña. ok
  * las novedades para administrador no deben poder verlas los vecinos, el vecino solo debe ver notificaciones masivas, y sus propias notificaciones de sus acciones en la app,   no debe ver por ejemplo que otro vecino pago expensas, que llego una visita para otro vecino, ni nada de eso. ok
  ---------------------------------------------------
  
  * Backup de base de datos, averiguar que hacer para no perder datos de la app en ningun momento, o reponerlos en caso qeu se rompan y haya que migrar.
  * Poner sonido a las notificaciones, que le suenen al cliente cuando le llegan.
   
