// Rancho Doble S - Portal Web (Client-Server Architecture)

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getTodayISO() {
  const today = new Date();
  return new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
}

function getTomorrowISO() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().split('T')[0];
}

const state = {
  authenticatedUser: null,
  activeAuthView: 'login',
  activeDashboardView: 'news',
  bookingFilter: 'all',
  selectedBookingDate: getTodayISO(),
  bookings: [],
  validSlots: [],
  notifications: [],
  newsItems: [],
  userVisits: [],
  adminVisits: [],
  adminExpenses: [],
  pendingUsers: [],
  approvedUsers: [],
  guardSearchQuery: '',
  guardFilter: 'all',
  activeUsersSearchQuery: '',
  adminCourtDate: '',
  adminCourtBookings: [],
  adminBroadcasts: [],
  adminStats: null
};

// DOM Elements
const authScreen = document.getElementById('authScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const authTabs = document.querySelectorAll('.auth-tab');
const authForms = document.querySelectorAll('.auth-form');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const registerStatus = document.getElementById('registerStatus');
const userFullName = document.getElementById('userFullName');
const userInitials = document.getElementById('userInitials');
const userRoleBadge = document.getElementById('userRoleBadge');
const logoutBtn = document.getElementById('logoutBtn');
const homeAdminBtn = document.getElementById('homeAdminBtn');
const homeAdminPendingBadge = document.getElementById('homeAdminPendingBadge');
const notificationPanel = document.getElementById('notificationPanel');
const notificationBackdrop = document.getElementById('notificationBackdrop');
const notificationList = document.getElementById('notificationList');
const notificationBadge = document.getElementById('notificationBadge');
const notificationsToggle = document.getElementById('notificationsToggle');
const closeNotifications = document.getElementById('closeNotifications');
const markAllRead = document.getElementById('markAllRead');
const toast = document.getElementById('toast');

// Bookings DOM
const bookingGrid = document.getElementById('bookingGrid');
const bookingDateInput = document.getElementById('bookingDateInput');
const btnDateToday = document.getElementById('btnDateToday');
const btnDateTomorrow = document.getElementById('btnDateTomorrow');

// Visits & Invitations DOM
const visitForm = document.getElementById('visitForm');
const visitDateField = document.getElementById('visitDateField');
const visitTimeField = document.getElementById('visitTimeField');
const userVisitsList = document.getElementById('userVisitsList');
const openGmailInviteBtn = document.getElementById('openGmailInviteBtn');
const copyInviteLinkEmailBtn = document.getElementById('copyInviteLinkEmailBtn');
const openWhatsAppInviteBtn = document.getElementById('openWhatsAppInviteBtn');
const copyInviteLinkWhatsappBtn = document.getElementById('copyInviteLinkWhatsappBtn');
const toggleManualVisitFormBtn = document.getElementById('toggleManualVisitFormBtn');
const viewQrModal = document.getElementById('viewQrModal');
const closeViewQrModal = document.getElementById('closeViewQrModal');

// News & Modal DOM
const predioNewsList = document.getElementById('predioNewsList');
const adminNewsActions = document.getElementById('adminNewsActions');
const openCreateNewsModalBtn = document.getElementById('openCreateNewsModalBtn');
const createNewsModal = document.getElementById('createNewsModal');
const closeCreateNewsModal = document.getElementById('closeCreateNewsModal');
const cancelCreateNewsBtn = document.getElementById('cancelCreateNewsBtn');
const createNewsForm = document.getElementById('createNewsForm');

// Admin DOM
const pendingUsersList = document.getElementById('pendingUsersList');
const adminPendingStatusCount = document.getElementById('adminPendingStatusCount');
const adminVisitsList = document.getElementById('adminVisitsList');
const refreshAdminVisitsBtn = document.getElementById('refreshAdminVisitsBtn');
const statTotalUsers = document.getElementById('statTotalUsers');
const statPendingUsers = document.getElementById('statPendingUsers');
const statTodayVisits = document.getElementById('statTodayVisits');

// Guard & QR Scanner DOM
const adminGuardInsideBadge = document.getElementById('adminGuardInsideBadge');
const openScanQrModalBtn = document.getElementById('openScanQrModalBtn');
const guardSearchInput = document.getElementById('guardSearchInput');
const scanQrModal = document.getElementById('scanQrModal');
const closeScanQrModal = document.getElementById('closeScanQrModal');
const cancelScanQrBtn = document.getElementById('cancelScanQrBtn');
const qrReader = document.getElementById('qrReader');
const qrReaderLoading = document.getElementById('qrReaderLoading');
const cameraSelect = document.getElementById('cameraSelect');
const switchCameraBtn = document.getElementById('switchCameraBtn');
const manualQrCodeForm = document.getElementById('manualQrCodeForm');
const manualQrInput = document.getElementById('manualQrInput');
const scannedVisitResult = document.getElementById('scannedVisitResult');
const scannedVisitorName = document.getElementById('scannedVisitorName');
const scannedVisitorDetails = document.getElementById('scannedVisitorDetails');
const scannedResidentName = document.getElementById('scannedResidentName');
const scannedVisitStatusBadge = document.getElementById('scannedVisitStatusBadge');
const scannedVisitActions = document.getElementById('scannedVisitActions');

// Emit Expense Modal DOM
const openEmitExpenseModalBtn = document.getElementById('openEmitExpenseModalBtn');
const emitExpenseModal = document.getElementById('emitExpenseModal');
const closeEmitExpenseModal = document.getElementById('closeEmitExpenseModal');
const cancelEmitExpenseBtn = document.getElementById('cancelEmitExpenseBtn');
const emitExpenseForm = document.getElementById('emitExpenseForm');
const emitExpensePeriod = document.getElementById('emitExpensePeriod');
const emitExpenseDueDate = document.getElementById('emitExpenseDueDate');
const emitExpenseAmount = document.getElementById('emitExpenseAmount');
const emitExpenseTarget = document.getElementById('emitExpenseTarget');
const singleUserContainer = document.getElementById('singleUserContainer');
const emitExpenseUserId = document.getElementById('emitExpenseUserId');
const emitExpenseConcept = document.getElementById('emitExpenseConcept');
const submitEmitExpenseBtn = document.getElementById('submitEmitExpenseBtn');

// Active Neighbors & Create User DOM
const adminActiveUsersCount = document.getElementById('adminActiveUsersCount');
const activeUsersList = document.getElementById('activeUsersList');
const activeUsersSearchInput = document.getElementById('activeUsersSearchInput');
const openCreateUserModalBtn = document.getElementById('openCreateUserModalBtn');
const refreshActiveUsersBtn = document.getElementById('refreshActiveUsersBtn');
const createUserModal = document.getElementById('createUserModal');
const closeCreateUserModal = document.getElementById('closeCreateUserModal');
const cancelCreateUserBtn = document.getElementById('cancelCreateUserBtn');
const createUserForm = document.getElementById('createUserForm');
const newUserName = document.getElementById('newUserName');
const newUserLastName = document.getElementById('newUserLastName');
const newUserLote = document.getElementById('newUserLote');
const newUserManzana = document.getElementById('newUserManzana');
const newUserUsername = document.getElementById('newUserUsername');
const newUserRole = document.getElementById('newUserRole');
const newUserDocType = document.getElementById('newUserDocType');
const newUserDocNum = document.getElementById('newUserDocNum');
const newUserPhone = document.getElementById('newUserPhone');
const newUserEmail = document.getElementById('newUserEmail');
const newUserPassword = document.getElementById('newUserPassword');

// Admin Court Management DOM
const adminCourtsPanel = document.getElementById('adminCourtsPanel');
const adminCourtOccupiedBadge = document.getElementById('adminCourtOccupiedBadge');
const adminCourtBlockedBadge = document.getElementById('adminCourtBlockedBadge');
const adminCourtDateTodayBtn = document.getElementById('adminCourtDateTodayBtn');
const adminCourtDateTomorrowBtn = document.getElementById('adminCourtDateTomorrowBtn');
const adminCourtDateInput = document.getElementById('adminCourtDateInput');
const openBlockCourtModalBtn = document.getElementById('openBlockCourtModalBtn');
const adminUnblockDayBtn = document.getElementById('adminUnblockDayBtn');
const refreshAdminCourtsBtn = document.getElementById('refreshAdminCourtsBtn');
const adminCourtScheduleList = document.getElementById('adminCourtScheduleList');

// Block Court Modal DOM
const blockCourtModal = document.getElementById('blockCourtModal');
const closeBlockCourtModal = document.getElementById('closeBlockCourtModal');
const cancelBlockCourtBtn = document.getElementById('cancelBlockCourtBtn');
const blockCourtForm = document.getElementById('blockCourtForm');
const blockCourtDate = document.getElementById('blockCourtDate');
const blockCourtScope = document.getElementById('blockCourtScope');
const blockCourtSlotContainer = document.getElementById('blockCourtSlotContainer');
const blockCourtSlot = document.getElementById('blockCourtSlot');
const blockCourtReason = document.getElementById('blockCourtReason');
const blockCourtDetails = document.getElementById('blockCourtDetails');
const submitBlockCourtBtn = document.getElementById('submitBlockCourtBtn');

// Admin Broadcast Alerts DOM
const adminAlertsPanel = document.getElementById('adminAlertsPanel');
const adminBroadcastAlertsCount = document.getElementById('adminBroadcastAlertsCount');
const openBroadcastAlertModalBtn = document.getElementById('openBroadcastAlertModalBtn');
const refreshAdminAlertsBtn = document.getElementById('refreshAdminAlertsBtn');
const adminBroadcastAlertsList = document.getElementById('adminBroadcastAlertsList');

// Broadcast Alert Modal DOM
const broadcastAlertModal = document.getElementById('broadcastAlertModal');
const closeBroadcastAlertModal = document.getElementById('closeBroadcastAlertModal');
const cancelBroadcastAlertBtn = document.getElementById('cancelBroadcastAlertBtn');
const broadcastAlertForm = document.getElementById('broadcastAlertForm');
const broadcastAlertPreset = document.getElementById('broadcastAlertPreset');
const broadcastAlertTitle = document.getElementById('broadcastAlertTitle');
const broadcastAlertText = document.getElementById('broadcastAlertText');
const submitBroadcastAlertBtn = document.getElementById('submitBroadcastAlertBtn');

// Profile Modal DOM
const openProfileModalBtn = document.getElementById('openProfileModalBtn');
const homeProfileBtn = document.getElementById('homeProfileBtn');
const profileModal = document.getElementById('profileModal');
const closeProfileModal = document.getElementById('closeProfileModal');
const cancelProfileBtn = document.getElementById('cancelProfileBtn');
const profileUsernameDisplay = document.getElementById('profileUsernameDisplay');
const profileLoteBadge = document.getElementById('profileLoteBadge');
const profileManzanaBadge = document.getElementById('profileManzanaBadge');
const profileRoleBadge = document.getElementById('profileRoleBadge');
const profileInfoForm = document.getElementById('profileInfoForm');
const profileNombre = document.getElementById('profileNombre');
const profileApellido = document.getElementById('profileApellido');
const profileTelefono = document.getElementById('profileTelefono');
const profileEmail = document.getElementById('profileEmail');
const profileDocumentoDisplay = document.getElementById('profileDocumentoDisplay');
const submitProfileInfoBtn = document.getElementById('submitProfileInfoBtn');
const profilePasswordForm = document.getElementById('profilePasswordForm');
const profileCurrentPassword = document.getElementById('profileCurrentPassword');
const profileNewPassword = document.getElementById('profileNewPassword');
const profileConfirmNewPassword = document.getElementById('profileConfirmNewPassword');
const submitChangePasswordBtn = document.getElementById('submitChangePasswordBtn');

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove('show');
  }, 2600);
}

function setAuthView(view) {
  state.activeAuthView = view;
  authTabs.forEach((tab) => {
    const isActive = tab.dataset.authView === view;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  authForms.forEach((form) => {
    form.classList.toggle('active', form.id === `${view}Form`);
  });
}

function setDashboardView(view, pushHistory = true) {
  const validViews = ['home', 'expenses', 'news', 'visits', 'booking', 'admin'];
  if (!validViews.includes(view)) {
    view = 'home';
  }

  // Prevent unauthorized view access
  if (view === 'admin' && state.authenticatedUser?.role !== 'admin') {
    view = 'home';
  }

  state.activeDashboardView = view;
  document.querySelectorAll('.nav-link').forEach((button) => {
    const isActive = button.dataset.view === view;
    button.classList.toggle('active', isActive);
  });

  const sectionMap = {
    home: 'homeSection',
    expenses: 'expensesSection',
    news: 'newsSection',
    visits: 'myVisitsSection',
    booking: 'bookingSection',
    admin: 'adminSection'
  };

  document.querySelectorAll('.content-section').forEach((section) => {
    section.classList.toggle('active', section.id === sectionMap[view]);
  });

  // History API: sync browser URL hash and back button support
  if (pushHistory) {
    const currentHash = window.location.hash.replace('#', '');
    const targetHash = view === 'home' ? '' : `#${view}`;
    if (currentHash !== (view === 'home' ? '' : view)) {
      const basePath = window.location.pathname + (window.location.search || '');
      window.history.pushState({ view }, '', targetHash || basePath);
    }
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Load section-specific data on navigation
  if (view === 'expenses') loadExpenses();
  if (view === 'news') loadNews();
  if (view === 'visits') loadUserVisits();
  if (view === 'booking') loadBookings();
  if (view === 'admin' && state.authenticatedUser?.role === 'admin') loadAdminData();
  if (view === 'home' && state.authenticatedUser?.role === 'admin') loadAdminData();
}

function renderUserProfile() {
  if (!state.authenticatedUser) return;
  const user = state.authenticatedUser;
  const initials = `${user.nombre?.[0] || ''}${user.apellido?.[0] || ''}`.toUpperCase();

  if (userFullName) userFullName.textContent = `${user.nombre} ${user.apellido}`;
  if (userInitials) userInitials.textContent = initials || 'US';
  if (userRoleBadge) {
    userRoleBadge.textContent = user.role === 'admin' ? 'Administrador' : 'Propietario';
    userRoleBadge.style.color = user.role === 'admin' ? 'var(--gold)' : 'var(--muted)';
  }

  const homeWelcomeTitle = document.getElementById('homeWelcomeTitle');
  if (homeWelcomeTitle) {
    homeWelcomeTitle.textContent = `¡Hola, ${user.nombre}!`;
  }

  // Show or hide admin controls
  const isAdmin = user.role === 'admin';
  if (adminNewsActions) adminNewsActions.style.display = isAdmin ? 'block' : 'none';
  if (homeAdminBtn) homeAdminBtn.style.display = isAdmin ? 'flex' : 'none';
}

// ----------------- USER PROFILE & PASSWORD ----------------- //

function openProfileModal() {
  if (!profileModal || !state.authenticatedUser) return;
  const user = state.authenticatedUser;

  if (profileUsernameDisplay) {
    profileUsernameDisplay.textContent = user.username || user.email || '--';
  }
  if (profileLoteBadge) {
    profileLoteBadge.textContent = user.lote ? `Lote ${user.lote}` : 'Lote -';
  }
  if (profileManzanaBadge) {
    profileManzanaBadge.textContent = user.manzana ? `Mz ${user.manzana}` : 'Mz -';
  }
  if (profileRoleBadge) {
    profileRoleBadge.textContent = user.role === 'admin' ? 'Administrador General' : 'Propietario';
  }

  if (profileNombre) profileNombre.value = user.nombre || '';
  if (profileApellido) profileApellido.value = user.apellido || '';
  if (profileTelefono) profileTelefono.value = user.telefono || '';
  if (profileEmail) profileEmail.value = user.email || '';
  if (profileDocumentoDisplay) {
    profileDocumentoDisplay.value = `${user.tipoDocumento || 'DNI'} ${user.numeroDocumento || '-'}`;
  }

  if (profilePasswordForm) profilePasswordForm.reset();

  profileModal.style.display = 'grid';
  window.history.pushState({ modal: 'profile', view: state.activeDashboardView }, '', '#mi-perfil');
}

function closeProfileModalFn(fromPopState = false) {
  if (!profileModal) return;
  profileModal.style.display = 'none';
  if (!fromPopState && window.history.state?.modal === 'profile') {
    window.history.back();
  }
}

async function handleUpdateProfile(e) {
  e.preventDefault();
  const nombre = (profileNombre?.value || '').trim();
  const apellido = (profileApellido?.value || '').trim();
  const telefono = (profileTelefono?.value || '').trim();
  const email = (profileEmail?.value || '').trim();

  if (!nombre || !apellido || !telefono || !email) {
    showToast('Por favor completá todos los campos de contacto.');
    return;
  }

  if (submitProfileInfoBtn) {
    submitProfileInfoBtn.disabled = true;
    submitProfileInfoBtn.textContent = 'Guardando...';
  }

  try {
    const res = await API.auth.updateProfile({ nombre, apellido, telefono, email });
    state.authenticatedUser = res.user;
    renderUserProfile();
    showToast(res.message || 'Datos de contacto guardados correctamente.');
  } catch (err) {
    showToast(err.message || 'Error al actualizar datos de contacto.');
  } finally {
    if (submitProfileInfoBtn) {
      submitProfileInfoBtn.disabled = false;
      submitProfileInfoBtn.textContent = '💾 Guardar Datos de Contacto';
    }
  }
}

async function handleChangePassword(e) {
  e.preventDefault();
  const currentPassword = profileCurrentPassword?.value || '';
  const newPassword = profileNewPassword?.value || '';
  const confirmNewPassword = profileConfirmNewPassword?.value || '';

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    showToast('Por favor completá todos los campos de contraseña.');
    return;
  }

  if (newPassword !== confirmNewPassword) {
    showToast('La nueva contraseña y su confirmación no coinciden.');
    return;
  }

  if (newPassword.length < 6) {
    showToast('La nueva contraseña debe tener al menos 6 caracteres.');
    return;
  }

  if (submitChangePasswordBtn) {
    submitChangePasswordBtn.disabled = true;
    submitChangePasswordBtn.textContent = 'Actualizando...';
  }

  try {
    const res = await API.auth.changePassword({
      currentPassword,
      newPassword,
      confirmNewPassword
    });
    showToast(res.message || 'Contraseña actualizada con éxito.');
    if (profilePasswordForm) profilePasswordForm.reset();
    loadNotifications();
  } catch (err) {
    showToast(err.message || 'Error al actualizar contraseña.');
  } finally {
    if (submitChangePasswordBtn) {
      submitChangePasswordBtn.disabled = false;
      submitChangePasswordBtn.textContent = '🔐 Actualizar Contraseña';
    }
  }
}

function toggleNotificationsPanel(forceOpen, updateHistory = true) {
  if (!notificationPanel) return;
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !notificationPanel.classList.contains('open');
  notificationPanel.classList.toggle('open', shouldOpen);
  if (notificationBackdrop) {
    notificationBackdrop.classList.toggle('open', shouldOpen);
  }
  document.body.classList.toggle('notification-open', shouldOpen);

  if (updateHistory) {
    if (shouldOpen) {
      window.history.pushState({ modal: 'notifications', view: state.activeDashboardView }, '', '#notificaciones');
    } else if (window.history.state?.modal === 'notifications') {
      window.history.back();
    }
  }
}

// ----------------- NOTIFICATIONS ----------------- //

async function loadNotifications() {
  try {
    const notifications = await API.notifications.get();
    state.notifications = notifications;
    renderNotifications();
  } catch (error) {
    console.error('Error loading notifications:', error);
  }
}

function renderNotifications() {
  if (!notificationList) return;
  const unreadCount = state.notifications.filter((n) => !n.read).length;

  if (notificationBadge) {
    notificationBadge.textContent = unreadCount;
    notificationBadge.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
  }

  if (state.notifications.length === 0) {
    notificationList.innerHTML = `
      <li class="notification-item">
        <p>No tenés notificaciones pendientes.</p>
      </li>
    `;
    return;
  }

  notificationList.innerHTML = state.notifications
    .map((notification) => {
      const dateStr = notification.createdAt ? new Date(notification.createdAt).toLocaleDateString() : '';
      return `
        <li class="notification-item ${notification.read ? '' : 'unread'}">
          <strong>${escapeHTML(notification.title)}</strong>
          <small>${escapeHTML(dateStr)}</small>
          <p>${escapeHTML(notification.text)}</p>
        </li>
      `;
    })
    .join('');
}

async function handleMarkAllNotificationsRead() {
  try {
    await API.notifications.markAllRead();
    state.notifications = state.notifications.map((n) => ({ ...n, read: 1 }));
    renderNotifications();
    showToast('Notificaciones marcadas como leídas.');
  } catch (error) {
    showToast(error.message || 'Error al actualizar notificaciones.');
  }
}

// ----------------- NEWS ----------------- //

async function loadNews() {
  try {
    const news = await API.news.get();
    state.newsItems = news;
    renderNews();
  } catch (error) {
    console.error('Error loading news:', error);
  }
}

function renderNews() {
  if (!predioNewsList) return;
  const isAdmin = state.authenticatedUser?.role === 'admin';

  if (!state.newsItems || state.newsItems.length === 0) {
    predioNewsList.innerHTML = `
      <li class="news-card">
        <div class="news-content">
          <strong>Sin novedades por el momento</strong>
          <p>No hay publicaciones de la administración cargadas actualmente.</p>
        </div>
      </li>
    `;
    return;
  }

  predioNewsList.innerHTML = state.newsItems
    .map((item) => `
      <li class="news-card">
        <img src="${escapeHTML(item.image || './descarga.jfif')}" alt="${escapeHTML(item.title)}" onerror="this.src='./descarga.jfif'" />
        <div class="news-content">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="news-category">${escapeHTML(item.category || 'Novedad')}</span>
            ${isAdmin ? `<button type="button" class="btn-inline-action danger delete-news-btn" data-id="${item.id}" title="Eliminar noticia">Eliminar</button>` : ''}
          </div>
          <strong>${escapeHTML(item.title)}</strong>
          <small>${escapeHTML(item.date || '-')} · ${escapeHTML(item.status || 'Publicado')}</small>
          <p>${escapeHTML(item.description)}</p>
        </div>
      </li>
    `)
    .join('');

  if (isAdmin) {
    predioNewsList.querySelectorAll('.delete-news-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Estás seguro de eliminar esta noticia?')) return;
        try {
          await API.news.delete(btn.dataset.id);
          showToast('Noticia eliminada.');
          loadNews();
        } catch (err) {
          showToast(err.message);
        }
      });
    });
  }
}

async function handleCreateNews(event) {
  event.preventDefault();
  const formData = new FormData(createNewsForm);
  const title = String(formData.get('newsTitle') || '').trim();
  const category = String(formData.get('newsCategory') || '').trim();
  const description = String(formData.get('newsDescription') || '').trim();
  const image = String(formData.get('newsImage') || '').trim();

  try {
    await API.news.create({ title, category, description, image });
    showToast('Noticia publicada con éxito.');
    createNewsForm.reset();
    createNewsModal.style.display = 'none';
    loadNews();
  } catch (error) {
    showToast(error.message);
  }
}

// ----------------- VISITAS & INVITACIONES ----------------- //

let cachedInviteCode = null;
let cachedInviteBaseUrl = null;
let cachedInviteCodeExpiry = 0;

async function getInvitationUrl() {
  const now = Date.now();
  if (!cachedInviteCode || now >= cachedInviteCodeExpiry) {
    const data = await API.visits.getInviteToken();
    cachedInviteCode = data.code || data.token;
    cachedInviteBaseUrl = data.baseUrl || window.location.origin;
    // Cache for 30 minutes in frontend memory
    cachedInviteCodeExpiry = now + 30 * 60 * 1000;
  }
  const base = cachedInviteBaseUrl || window.location.origin;
  const path = window.location.pathname.replace(/index\.html$/, '').replace(/\/$/, '');
  return `${base}${path}/i/${encodeURIComponent(cachedInviteCode)}`;
}

async function openGmailInvite() {
  try {
    showToast('Generando enlace seguro...');
    const inviteUrl = await getInvitationUrl();
    const residentName = `${state.authenticatedUser?.nombre || ''} ${state.authenticatedUser?.apellido || ''}`.trim();
    const subject = `Invitación de acceso a Rancho Doble S — ${residentName}`;
    const body = `Hola!\n\nTe envío esta invitación oficial para ingresar al predio Rancho Doble S.\n\nHacé click en el siguiente enlace seguro para registrarte y obtener tu código QR de acceso:\n${inviteUrl}\n\nIngresá con: apellido, nombre, DNI y patente de tu vehículo.\nUna vez registrado, el sistema te devolverá tu código QR de acceso para presentar en la guardia de ingreso.\n\nSaludos,\n${residentName}`;

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const win = window.open(gmailUrl, '_blank');
    if (!win) {
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
  } catch (error) {
    showToast('Error al generar enlace: ' + error.message);
  }
}

async function openWhatsAppInvite() {
  try {
    showToast('Generando enlace para WhatsApp...');
    const inviteUrl = await getInvitationUrl();
    const residentName = `${state.authenticatedUser?.nombre || ''} ${state.authenticatedUser?.apellido || ''}`.trim();
    const message = `👋 *Rancho Doble S — Invitación de Acceso*\n\nHola! Te envío la invitación para ingresar al predio (de parte de *${residentName}*).\n\n🎟️ *TOCÁ AQUÍ PARA TU PASE QR:*\n${inviteUrl}\n\n_Completás tus datos (nombre, DNI y patente) y ya tenés el pase para la guardia._`;

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  } catch (error) {
    showToast('Error al generar enlace: ' + error.message);
  }
}

async function copyInviteLink(buttonElement) {
  try {
    showToast('Generando enlace seguro...');
    const inviteUrl = await getInvitationUrl();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(inviteUrl);
      showToast('Enlace de invitación copiado al portapapeles.');
      if (buttonElement) {
        const original = buttonElement.innerHTML;
        buttonElement.innerHTML = '✅ Copiado';
        setTimeout(() => {
          buttonElement.innerHTML = original;
        }, 2200);
      }
    } else {
      fallbackCopy(inviteUrl);
    }
  } catch (error) {
    showToast('Error al copiar enlace: ' + error.message);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast('Enlace de invitación copiado.');
  } catch (e) {
    showToast('No se pudo copiar automáticamente.');
  }
  document.body.removeChild(ta);
}

function toggleManualVisitForm() {
  if (!visitForm || !toggleManualVisitFormBtn) return;
  const isHidden = visitForm.style.display === 'none' || !visitForm.style.display;
  if (isHidden) {
    visitForm.style.display = 'grid';
    toggleManualVisitFormBtn.textContent = '✖️ Ocultar formulario de carga manual';
    visitForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    visitForm.style.display = 'none';
    toggleManualVisitFormBtn.textContent = '➕ O bien, registrar visita manualmente aquí';
  }
}

function showQrPassModal(visit) {
  if (!viewQrModal) return;

  const modalQrImage = document.getElementById('modalQrImage');
  const modalQrVisitorName = document.getElementById('modalQrVisitorName');
  const modalQrVisitorDni = document.getElementById('modalQrVisitorDni');
  const modalQrVisitorPlate = document.getElementById('modalQrVisitorPlate');
  const modalQrDateTime = document.getElementById('modalQrDateTime');
  const modalQrStatus = document.getElementById('modalQrStatus');
  const downloadModalQrBtn = document.getElementById('downloadModalQrBtn');
  const shareModalQrWhatsAppBtn = document.getElementById('shareModalQrWhatsAppBtn');

  if (modalQrVisitorName) modalQrVisitorName.textContent = visit.visitorName || '--';
  if (modalQrVisitorDni) modalQrVisitorDni.textContent = visit.visitorDni || '--';
  if (modalQrVisitorPlate) modalQrVisitorPlate.textContent = visit.vehiclePlate || 'Sin vehículo';
  if (modalQrDateTime) modalQrDateTime.textContent = `${visit.date || ''} a las ${visit.time || ''} hs`;
  if (modalQrStatus) {
    modalQrStatus.textContent = visit.status || 'Confirmada';
    modalQrStatus.className = `visit-status ${visit.status === 'Ingresado' ? 'confirmed' : 'pending'}`;
  }

  // QR image (strictly internal, avoid sending visitor PII to third-party services)
  if (visit.qrCode) {
    if (modalQrImage) {
      modalQrImage.src = visit.qrCode;
      modalQrImage.style.display = 'block';
    }
    if (downloadModalQrBtn) {
      downloadModalQrBtn.style.display = 'inline-flex';
      downloadModalQrBtn.href = visit.qrCode;
      downloadModalQrBtn.download = `qr-pase-${(visit.visitorName || 'visita').replace(/\s+/g, '-').toLowerCase()}.png`;
    }
  } else {
    if (modalQrImage) {
      modalQrImage.style.display = 'none';
    }
    if (downloadModalQrBtn) {
      downloadModalQrBtn.style.display = 'none';
    }
  }

  if (shareModalQrWhatsAppBtn) {
    shareModalQrWhatsAppBtn.onclick = () => {
      const msg = `Hola ${visit.visitorName}! Este es tu pase de acceso a Rancho Doble S para el ${visit.date} a las ${visit.time} hs.\n\n“Este es tu código QR para el ingreso al predio, presentalo en la guardia de ingreso”`;
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
    };
  }

  viewQrModal.style.display = 'flex';
  document.body.classList.add('modal-open');

  // Push modal state for smooth back-button handling
  window.history.pushState({ modal: 'qrPass', view: state.activeDashboardView }, '', '#qr-modal');
}

function hideQrPassModal(fromPopState = false) {
  if (!viewQrModal) return;
  viewQrModal.style.display = 'none';
  document.body.classList.remove('modal-open');

  if (!fromPopState && window.history.state?.modal === 'qrPass') {
    window.history.back();
  }
}

async function loadUserVisits() {
  try {
    const visits = await API.visits.get();
    state.userVisits = visits;
    renderUserVisits();
  } catch (error) {
    console.error('Error loading visits:', error);
  }
}

function renderUserVisits() {
  if (!userVisitsList) return;

  if (state.userVisits.length === 0) {
    userVisitsList.innerHTML = `
      <li class="visit-item">
        <div>
          <strong>Sin visitas registradas</strong>
          <small>Podés enviar una invitación por Gmail/WhatsApp o registrarla manualmente.</small>
        </div>
      </li>
    `;
    return;
  }

  userVisitsList.innerHTML = state.userVisits
    .map((item) => `
      <li class="visit-item">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; flex-wrap: wrap;">
          <div>
            <strong>${escapeHTML(item.visitorName)}</strong>
            <small>DNI ${escapeHTML(item.visitorDni)} · Patente: <strong>${escapeHTML(item.vehiclePlate || 'Sin vehículo')}</strong></small>
          </div>
          <div class="visit-actions" style="display: flex; gap: 0.4rem; align-items: center;">
            <button type="button" class="btn-inline-action view-visit-qr-btn" data-id="${item.id}" title="Ver Pase con Código QR">📱 Ver QR</button>
            <button type="button" class="btn-inline-action danger cancel-visit-btn" data-id="${item.id}" title="Cancelar visita">Cancelar</button>
          </div>
        </div>
        <div class="visit-meta">
          <span>📅 ${escapeHTML(item.date)} · ${escapeHTML(item.time)} hs</span>
          <em class="visit-status ${item.status === 'Confirmada' || item.status === 'Ingresado' ? 'confirmed' : item.status === 'Pendiente' ? 'pending' : 'neutral'}">${escapeHTML(item.status)}</em>
        </div>
      </li>
    `)
    .join('');

  userVisitsList.querySelectorAll('.view-visit-qr-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const visit = state.userVisits.find((v) => String(v.id) === String(btn.dataset.id));
      if (visit) showQrPassModal(visit);
    });
  });

  userVisitsList.querySelectorAll('.cancel-visit-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Deseas cancelar esta visita?')) return;
      try {
        await API.visits.delete(btn.dataset.id);
        showToast('Visita eliminada.');
        loadUserVisits();
      } catch (err) {
        showToast(err.message);
      }
    });
  });
}

async function handleVisitSubmit(event) {
  event.preventDefault();
  const formData = new FormData(visitForm);
  const visitorName = String(formData.get('visitName') || '').trim();
  const visitorDni = String(formData.get('visitDni') || '').trim();
  const vehiclePlate = String(formData.get('visitPlate') || '').trim() || 'Sin vehículo';
  const date = String(formData.get('visitDate') || '').trim();
  const time = String(formData.get('visitTime') || '').trim();

  if (!visitorName || !visitorDni || !date || !time) {
    showToast('Completá todos los campos de la visita.');
    return;
  }

  try {
    const res = await API.visits.create({ visitorName, visitorDni, vehiclePlate, date, time });
    showToast('Visita registrada con éxito. Pase QR generado.');
    visitForm.reset();
    if (visitDateField) visitDateField.value = getTodayISO();
    loadUserVisits();
    loadNotifications();

    if (res && res.qrCode) {
      showQrPassModal({
        visitorName,
        visitorDni,
        vehiclePlate,
        date,
        time,
        status: 'Confirmada',
        qrCode: res.qrCode
      });
    }
  } catch (error) {
    showToast(error.message);
  }
}

// ----------------- EXPENSAS ----------------- //

async function loadExpenses() {
  try {
    const data = await API.expenses.get();
    state.expenses = data.expenses || [];
    state.bankInfo = data.bankInfo || null;
    renderExpenses();
  } catch (error) {
    console.error('Error loading expenses:', error);
  }
}

function renderExpenses() {
  const expenseCurrentBadge = document.getElementById('expenseCurrentBadge');
  const expenseCurrentAmount = document.getElementById('expenseCurrentAmount');
  const expenseCurrentStatus = document.getElementById('expenseCurrentStatus');
  const expenseCurrentDueDate = document.getElementById('expenseCurrentDueDate');
  const expenseCurrentConcept = document.getElementById('expenseCurrentConcept');
  const payExpenseBtn = document.getElementById('payExpenseBtn');
  const expensesList = document.getElementById('expensesList');
  const bankAlias = document.getElementById('bankAlias');
  const bankCbu = document.getElementById('bankCbu');

  if (state.bankInfo) {
    if (bankAlias) bankAlias.textContent = state.bankInfo.alias || 'RANCHO.DOBLE.S';
    if (bankCbu) bankCbu.textContent = state.bankInfo.cbu || '0070123420000012345678';
  }

  const latest = state.expenses[0];
  if (latest) {
    if (expenseCurrentBadge) expenseCurrentBadge.textContent = latest.period;
    if (expenseCurrentAmount) expenseCurrentAmount.textContent = `$ ${Number(latest.amount).toLocaleString('es-AR')}`;
    if (expenseCurrentDueDate) expenseCurrentDueDate.textContent = latest.dueDate;
    if (expenseCurrentConcept) expenseCurrentConcept.innerHTML = `📄 <strong>Concepto:</strong> ${escapeHTML(latest.concept || 'Expensas ordinarias')}`;

    const isPending = latest.status === 'Pendiente';
    const isInReview = latest.status === 'En revisión';
    const isPaid = latest.status === 'Pagado';

    if (expenseCurrentStatus) {
      expenseCurrentStatus.textContent = latest.status;
      expenseCurrentStatus.className = `visit-status ${isPaid ? 'confirmed' : (isInReview ? 'neutral' : 'pending')}`;
    }

    if (payExpenseBtn) {
      if (isPending) {
        payExpenseBtn.style.display = 'inline-block';
        payExpenseBtn.textContent = 'Informar Pago';
        payExpenseBtn.disabled = false;
        payExpenseBtn.onclick = () => handlePayExpense(latest.id);
      } else if (isInReview) {
        payExpenseBtn.style.display = 'inline-block';
        payExpenseBtn.textContent = '⏳ Pago en revisión';
        payExpenseBtn.disabled = true;
      } else {
        payExpenseBtn.style.display = 'none';
      }
    }
  }

  if (expensesList) {
    if (!state.expenses || state.expenses.length === 0) {
      expensesList.innerHTML = `
        <li class="visit-item">
          <div>
            <strong>Sin liquidaciones registradas</strong>
            <small>No hay registros de expensas para tu unidad.</small>
          </div>
        </li>
      `;
    } else {
      expensesList.innerHTML = state.expenses
        .map((item) => `
          <li class="visit-item">
            <div class="expense-item-row">
              <div class="expense-item-info">
                <strong>${escapeHTML(item.period)} — $ ${Number(item.amount).toLocaleString('es-AR')}</strong>
                <small>${escapeHTML(item.concept || 'Expensas ordinarias')} · Vencimiento: ${escapeHTML(item.dueDate)}</small>
              </div>
              <div class="visit-actions">
                ${item.status === 'Pendiente' ? `
                  <button type="button" class="btn-inline-action success pay-item-btn" data-id="${item.id}">Informar Pago</button>
                ` : item.status === 'En revisión' ? `
                  <span class="badge soft">⏳ En revisión</span>
                ` : `
                  <span class="btn-inline-action" style="cursor: default;">Pagado</span>
                `}
              </div>
            </div>
            <div class="visit-meta">
              <span>${item.paymentReference ? `Ref: ${escapeHTML(item.paymentReference)}` : 'Registrado'}</span>
              <em class="visit-status ${item.status === 'Pagado' ? 'confirmed' : (item.status === 'En revisión' ? 'neutral' : 'pending')}">${escapeHTML(item.status)}</em>
            </div>
          </li>
        `)
        .join('');

      expensesList.querySelectorAll('.pay-item-btn').forEach((btn) => {
        btn.addEventListener('click', () => handlePayExpense(btn.dataset.id));
      });
    }
  }
}

async function handlePayExpense(expenseId) {
  const reference = prompt('Por favor ingresá el número de comprobante o referencia de transferencia:', '');
  if (reference === null) return; // cancelado por usuario
  try {
    const res = await API.expenses.pay(expenseId, reference.trim());
    showToast(res.message || 'Pago informado. En revisión por la administración.');
    loadExpenses();
    loadNotifications();
  } catch (err) {
    showToast(err.message);
  }
}

// ----------------- RESERVAS ----------------- //

async function loadBookings() {
  try {
    const data = await API.bookings.get(state.selectedBookingDate);
    state.bookings = data.bookings || [];
    state.validSlots = data.validSlots || [];
    renderBookingSlots();
  } catch (error) {
    console.error('Error loading bookings:', error);
  }
}

function renderBookingSlots() {
  if (!bookingGrid) return;

  const today = getTodayISO();
  const isToday = state.selectedBookingDate === today;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentUserId = state.authenticatedUser?.id;
  const isAdmin = state.authenticatedUser?.role === 'admin';

  const renderedSlots = state.validSlots.map((slot) => {
    const booking = state.bookings.find((b) => b.slot === slot) || null;
    const isBooked = Boolean(booking);
    const isMine = isBooked && booking.userId === currentUserId;

    // Check if past (only for today)
    const [startHour, , endHour] = slot.split(/[:\s-]+/).filter(Boolean);
    const endMinutes = Number(endHour) * 60;
    const isPast = isToday && endMinutes <= currentMinutes;

    if (state.bookingFilter === 'free' && isBooked) return null;
    if (state.bookingFilter === 'reserved' && !isBooked) return null;

    if (isPast) {
      return `
        <div class="booking-slot past" aria-disabled="true">
          <strong>${escapeHTML(slot)}</strong>
          <small>Finalizado</small>
        </div>
      `;
    }

    if (isBooked && booking.isBlocked) {
      return `
        <div class="booking-slot blocked" data-slot="${escapeHTML(slot)}" style="background: rgba(255, 122, 122, 0.1); border: 1px solid rgba(255, 122, 122, 0.35);" aria-label="Horario bloqueado">
          <strong>${escapeHTML(slot)}</strong>
          <small style="color: var(--danger); font-weight: 600;">🚫 ${escapeHTML(booking.blockReason || 'Bloqueado por Admin')}</small>
          ${isAdmin ? `<button type="button" class="cancel-booking-btn" data-booking-id="${booking.id}" style="margin-top: 0.25rem;">Desbloquear</button>` : ''}
        </div>
      `;
    }

    if (isMine) {
      return `
        <div class="booking-slot booked my-booking" data-slot="${escapeHTML(slot)}" aria-label="Tu horario reservado">
          <strong>${escapeHTML(slot)}</strong>
          <small>Tu reserva (${escapeHTML(booking.userName)})</small>
          <button type="button" class="cancel-booking-btn" data-booking-id="${booking.id}">Cancelar</button>
        </div>
      `;
    }

    if (isBooked) {
      return `
        <div class="booking-slot booked" data-slot="${escapeHTML(slot)}" aria-label="Horario reservado">
          <strong>${escapeHTML(slot)}</strong>
          <small>Reservado (${escapeHTML(booking.userName)})</small>
          ${isAdmin ? `<button type="button" class="cancel-booking-btn" data-booking-id="${booking.id}">Liberar (Admin)</button>` : ''}
        </div>
      `;
    }

    return `
      <button
        type="button"
        class="booking-slot free"
        data-slot="${escapeHTML(slot)}"
        aria-label="Reservar horario"
      >
        <strong>${escapeHTML(slot)}</strong>
        <small>Disponible</small>
      </button>
    `;
  }).filter(Boolean);

  if (renderedSlots.length === 0) {
    bookingGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--muted);">
        No hay turnos que coincidan con el filtro seleccionado para esta fecha.
      </div>
    `;
    return;
  }

  bookingGrid.innerHTML = renderedSlots.join('');

  // Reserve slot handler
  bookingGrid.querySelectorAll('.booking-slot.free').forEach((button) => {
    button.addEventListener('click', () => handleReserveSlot(button.dataset.slot));
  });

  // Cancel reservation handler
  bookingGrid.querySelectorAll('.cancel-booking-btn').forEach((button) => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      handleCancelReservation(button.dataset.bookingId);
    });
  });
}

async function handleReserveSlot(slot) {
  const currentUserId = state.authenticatedUser?.id;
  const isAdmin = state.authenticatedUser?.role === 'admin';

  if (!isAdmin) {
    const myBookingToday = state.bookings.find((b) => b.userId === currentUserId);
    if (myBookingToday) {
      showToast('Ya contás con un turno reservado para esta fecha (máx. 1 turno por día).');
      return;
    }
  }

  if (!confirm(`¿Confirmás la reserva de tenis para el ${state.selectedBookingDate} a las ${slot}?`)) return;
  try {
    await API.bookings.create(state.selectedBookingDate, slot);
    showToast(`Turno ${slot} reservado con éxito.`);
    loadBookings();
    loadNotifications();
  } catch (error) {
    showToast(error.message);
  }
}

async function handleCancelReservation(bookingId) {
  if (!confirm('¿Deseas cancelar esta reserva?')) return;
  try {
    await API.bookings.cancel(bookingId);
    showToast('Reserva cancelada.');
    loadBookings();
    loadNotifications();
  } catch (error) {
    showToast(error.message);
  }
}

function updateDateControls() {
  const today = getTodayISO();
  const tomorrow = getTomorrowISO();
  const isAdmin = state.authenticatedUser?.role === 'admin';

  if (bookingDateInput) {
    bookingDateInput.value = state.selectedBookingDate;
    bookingDateInput.min = today;
    if (!isAdmin) {
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 7);
      bookingDateInput.max = maxDate.toISOString().split('T')[0];
    } else {
      bookingDateInput.removeAttribute('max');
    }
  }
  if (btnDateToday) btnDateToday.classList.toggle('active', state.selectedBookingDate === today);
  if (btnDateTomorrow) btnDateTomorrow.classList.toggle('active', state.selectedBookingDate === tomorrow);
}

// ----------------- ADMIN ----------------- //

async function loadAdminData() {
  if (state.authenticatedUser?.role !== 'admin') return;

  try {
    const courtDate = state.adminCourtDate || getTodayISO();
    state.adminCourtDate = courtDate;

    const [stats, pendingUsers, approvedUsers, allVisits, allExpenses, courtData, broadcasts] = await Promise.all([
      API.admin.getStats(),
      API.admin.getUsers('pending'),
      API.admin.getUsers('approved'),
      API.visits.get({ all: 'true' }),
      API.expenses.getAdminAll(),
      API.bookings.get(courtDate),
      API.notifications.getAdminBroadcasts()
    ]);

    state.adminStats = stats;
    state.pendingUsers = pendingUsers;
    state.approvedUsers = approvedUsers;
    state.adminVisits = allVisits;
    state.adminExpenses = allExpenses;
    state.adminCourtBookings = courtData.bookings || [];
    state.adminBroadcasts = broadcasts || [];
    if (courtData.validSlots && courtData.validSlots.length > 0) {
      state.validSlots = courtData.validSlots;
    }

    renderAdminPanel();
  } catch (error) {
    console.error('Error loading admin data:', error);
  }
}

function renderAdminPanel() {
  // Stats
  if (statTotalUsers) statTotalUsers.textContent = state.adminStats?.totalUsers ?? 0;
  if (statPendingUsers) statPendingUsers.textContent = state.adminStats?.pendingUsers ?? 0;
  if (statTodayVisits) statTodayVisits.textContent = state.adminStats?.todayVisits ?? 0;

  // Pending count badge in home hub
  const pendingCount = state.pendingUsers.length;
  if (homeAdminPendingBadge) {
    homeAdminPendingBadge.textContent = `${pendingCount} pendiente${pendingCount === 1 ? '' : 's'}`;
    homeAdminPendingBadge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
  }
  if (adminPendingStatusCount) {
    adminPendingStatusCount.textContent = `${pendingCount} pendiente${pendingCount === 1 ? '' : 's'}`;
  }

  // Active users roster
  if (activeUsersList) {
    const query = (state.activeUsersSearchQuery || '').trim().toLowerCase();
    let users = state.approvedUsers || [];

    if (adminActiveUsersCount) {
      adminActiveUsersCount.textContent = `${users.length} habilitado${users.length === 1 ? '' : 's'}`;
    }

    if (query) {
      users = users.filter((u) => {
        const full = `${u.nombre || ''} ${u.apellido || ''} ${u.email || ''} ${u.telefono || ''} ${u.numeroDocumento || ''} ${u.username || ''} ${u.lote || ''} ${u.manzana || ''}`.toLowerCase();
        return full.includes(query);
      });
    }

    if (users.length === 0) {
      activeUsersList.innerHTML = `
        <div style="padding: 1.4rem; text-align: center; color: var(--muted); background: rgba(255, 255, 255, 0.02); border-radius: var(--radius-sm); border: 1px dashed rgba(255, 255, 255, 0.08);">
          ${query ? 'No se encontraron vecinos que coincidan con la búsqueda.' : 'No hay vecinos habilitados en el sistema.'}
        </div>
      `;
    } else {
      const currentUserId = state.authenticatedUser?.id;
      activeUsersList.innerHTML = users
        .map((user) => {
          const isSelf = user.id === currentUserId;
          const isAdmin = user.role === 'admin';
          const initials = `${(user.nombre || '')[0] || ''}${(user.apellido || '')[0] || ''}`.toUpperCase() || 'RD';

          let lotBadge = '';
          if (user.lote || user.manzana) {
            lotBadge = `<span class="badge soft" style="background: rgba(138, 206, 255, 0.15); color: var(--secondary); border: 1px solid rgba(138, 206, 255, 0.3);">Lote ${escapeHTML(user.lote || '-')} · Mz ${escapeHTML(user.manzana || '-')}</span>`;
          } else if (isAdmin && !user.lote) {
            lotBadge = `<span class="badge soft" style="background: rgba(255, 255, 255, 0.05); color: var(--muted);">Administración</span>`;
          }

          const roleBadge = isAdmin
            ? `<span class="badge soft" style="background: rgba(247, 199, 109, 0.2); color: var(--gold); border: 1px solid rgba(247, 199, 109, 0.4);">🛡️ Administrador</span>`
            : `<span class="badge soft" style="background: rgba(105, 210, 166, 0.15); color: var(--primary); border: 1px solid rgba(105, 210, 166, 0.3);">🏡 Propietario</span>`;

          const usernameDisplay = user.username ? `👤 Usuario: <strong style="color: #fff;">${escapeHTML(user.username)}</strong> · ` : '';

          let actionsHtml = '';
          if (isSelf) {
            actionsHtml = `<span class="badge soft" style="font-size: 0.78rem; opacity: 0.85;">Tu sesión actual</span>`;
          } else {
            actionsHtml = `
              <button type="button" class="btn-inline-action toggle-user-role-btn" data-id="${user.id}" data-role="${user.role}" data-name="${escapeHTML(user.nombre)} ${escapeHTML(user.apellido)}" style="padding: 0.35rem 0.7rem; font-size: 0.78rem;">
                ${isAdmin ? 'Quitar Admin' : '⭐ Hacer Admin'}
              </button>
              <button type="button" class="danger-btn delete-user-btn" data-id="${user.id}" data-name="${escapeHTML(user.nombre)} ${escapeHTML(user.apellido)}" style="padding: 0.35rem 0.7rem; font-size: 0.78rem;">
                Dar de baja
              </button>
            `;
          }

          return `
            <div class="active-user-card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.8rem; padding: 0.85rem 1rem; border-radius: 14px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.07);">
              <div style="display: flex; align-items: center; gap: 0.85rem; min-width: 260px;">
                <div style="width: 42px; height: 42px; border-radius: 50%; background: ${isAdmin ? 'rgba(247, 199, 109, 0.18)' : 'rgba(105, 210, 166, 0.15)'}; color: ${isAdmin ? 'var(--gold)' : 'var(--primary)'}; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.95rem; flex-shrink: 0; border: 1px solid ${isAdmin ? 'rgba(247, 199, 109, 0.3)' : 'rgba(105, 210, 166, 0.3)'};">
                  ${initials}
                </div>
                <div>
                  <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
                    <strong style="font-size: 0.95rem; color: #fff;">${escapeHTML(user.nombre)} ${escapeHTML(user.apellido)}</strong>
                    ${lotBadge}
                    ${roleBadge}
                  </div>
                  <div style="display: flex; flex-wrap: wrap; gap: 0.6rem; font-size: 0.8rem; color: var(--muted); margin-top: 0.2rem;">
                    <span>${usernameDisplay}🪪 ${escapeHTML(user.tipoDocumento || 'DNI')}: ${escapeHTML(user.numeroDocumento)}</span>
                    <span>📞 ${escapeHTML(user.telefono)}</span>
                    <span>📧 ${escapeHTML(user.email)}</span>
                  </div>
                </div>
              </div>

              <div style="display: flex; gap: 0.45rem; align-items: center; flex-wrap: wrap;">
                ${actionsHtml}
              </div>
            </div>
          `;
        })
        .join('');

      // Event listeners for role toggle
      activeUsersList.querySelectorAll('.toggle-user-role-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const userId = btn.dataset.id;
          const currentRole = btn.dataset.role;
          const targetName = btn.dataset.name;
          const newRole = currentRole === 'admin' ? 'user' : 'admin';
          const actionText = newRole === 'admin' ? 'promover a Administrador' : 'remover el rol de Administrador';

          if (!confirm(`¿Estás seguro de que deseás ${actionText} a ${targetName}?`)) return;

          try {
            await API.admin.updateRole(userId, newRole);
            showToast(`Rol de ${targetName} actualizado.`);
            loadAdminData();
          } catch (err) {
            showToast(err.message || 'Error al actualizar rol.');
          }
        });
      });

      // Event listeners for delete
      activeUsersList.querySelectorAll('.delete-user-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const userId = btn.dataset.id;
          const targetName = btn.dataset.name;

          if (!confirm(`¿Estás seguro de dar de baja al vecino ${targetName}? Se eliminarán todas sus reservas, visitas y accesos.`)) return;

          try {
            await API.admin.deleteUser(userId);
            showToast(`Vecino ${targetName} dado de baja del sistema.`);
            loadAdminData();
          } catch (err) {
            showToast(err.message || 'Error al dar de baja al vecino.');
          }
        });
      });
    }
  }

  // Pending users list
  if (pendingUsersList) {
    if (pendingCount === 0) {
      pendingUsersList.innerHTML = `
        <div style="padding: 1.2rem; text-align: center; color: var(--muted);">
          No hay solicitudes de registro pendientes de aprobación.
        </div>
      `;
    } else {
      pendingUsersList.innerHTML = state.pendingUsers
        .map((user) => `
          <div class="pending-user-card">
            <div class="pending-user-header">
              <strong>${escapeHTML(user.nombre)} ${escapeHTML(user.apellido)}</strong>
              <small>${escapeHTML(user.tipoDocumento)}: ${escapeHTML(user.numeroDocumento)}</small>
            </div>
            <div class="pending-user-details">
              <span>📧 ${escapeHTML(user.email)}</span>
              <span>📞 ${escapeHTML(user.telefono)}</span>
            </div>
            <div class="pending-actions">
              <button type="button" class="success-btn approve-user-btn" data-id="${user.id}">Aprobar acceso</button>
              <button type="button" class="danger-btn reject-user-btn" data-id="${user.id}">Rechazar</button>
            </div>
          </div>
        `)
        .join('');

      pendingUsersList.querySelectorAll('.approve-user-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            await API.admin.approveUser(btn.dataset.id);
            showToast('Usuario aprobado correctamente.');
            loadAdminData();
          } catch (err) {
            showToast(err.message);
          }
        });
      });

      pendingUsersList.querySelectorAll('.reject-user-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('¿Rechazar y eliminar esta solicitud de registro?')) return;
          try {
            await API.admin.deleteUser(btn.dataset.id);
            showToast('Solicitud rechazada y eliminada.');
            loadAdminData();
          } catch (err) {
            showToast(err.message);
          }
        });
      });
    }
  }

  // Admin visits list (Access control for guard)
  if (adminVisitsList) {
    let visits = state.adminVisits || [];

    // Count currently inside
    const insideCount = visits.filter((v) => v.status === 'Ingresado').length;
    if (adminGuardInsideBadge) {
      adminGuardInsideBadge.textContent = `${insideCount} en predio`;
    }

    // Filter by tab
    if (state.guardFilter === 'inside') {
      visits = visits.filter((v) => v.status === 'Ingresado');
    } else if (state.guardFilter === 'expected') {
      visits = visits.filter((v) => v.status === 'Confirmada' || v.status === 'Pendiente');
    } else if (state.guardFilter === 'exited') {
      visits = visits.filter((v) => v.status === 'Egresado');
    }

    // Filter by search query
    if (state.guardSearchQuery) {
      const q = state.guardSearchQuery.toLowerCase();
      visits = visits.filter((v) =>
        (v.visitorName && v.visitorName.toLowerCase().includes(q)) ||
        (v.visitorDni && v.visitorDni.toLowerCase().includes(q)) ||
        (v.vehiclePlate && v.vehiclePlate.toLowerCase().includes(q)) ||
        (v.residentName && v.residentName.toLowerCase().includes(q))
      );
    }

    if (visits.length === 0) {
      const isFiltered = state.guardSearchQuery || state.guardFilter !== 'all';
      adminVisitsList.innerHTML = `
        <li class="visit-item">
          <div>
            <strong>${isFiltered ? 'No se encontraron visitas' : 'Sin visitas registradas'}</strong>
            <small>${isFiltered ? 'Probá con otra patente, DNI o cambiando el filtro.' : 'No hay registros de visitas en el sistema.'}</small>
          </div>
        </li>
      `;
    } else {
      adminVisitsList.innerHTML = visits
        .slice(0, 40)
        .map((visit) => `
          <li class="visit-item">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; flex-wrap: wrap;">
              <div>
                <strong>${escapeHTML(visit.visitorName)} <small>(Visita a ${escapeHTML(visit.residentName)})</small></strong>
                <small>DNI ${escapeHTML(visit.visitorDni)} · Patente: <strong>${escapeHTML(visit.vehiclePlate || 'Sin vehículo')}</strong></small>
                ${visit.entryAt ? `<small style="display: block; color: var(--gold); font-size: 0.8rem; margin-top: 0.15rem;">🟢 Ingresó: ${new Date(visit.entryAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs</small>` : ''}
                ${visit.exitAt ? `<small style="display: block; color: var(--muted); font-size: 0.8rem; margin-top: 0.15rem;">🚪 Egresó: ${new Date(visit.exitAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs</small>` : ''}
              </div>
              <div class="visit-actions" style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
                <button type="button" class="btn-inline-action admin-view-visit-qr-btn" data-id="${visit.id}" title="Ver Pase QR">📱 Ver QR</button>
                ${visit.status !== 'Ingresado' && visit.status !== 'Egresado' ? `
                  <button type="button" class="btn-inline-action success mark-ingreso-btn" data-id="${visit.id}">Marcar Ingreso</button>
                ` : ''}
                ${visit.status === 'Ingresado' ? `
                  <button type="button" class="btn-inline-action danger mark-egreso-btn" data-id="${visit.id}" title="Registrar salida">Marcar Salida</button>
                ` : ''}
              </div>
            </div>
            <div class="visit-meta">
              <span>📅 ${escapeHTML(visit.date)} a las ${escapeHTML(visit.time)} hs</span>
              <em class="visit-status ${visit.status === 'Ingresado' ? 'confirmed' : visit.status === 'Egresado' ? 'neutral' : 'pending'}">
                ${visit.status === 'Ingresado' ? '🟢 En predio' : visit.status === 'Egresado' ? '🚪 Egresó' : escapeHTML(visit.status)}
              </em>
            </div>
          </li>
        `)
        .join('');

      adminVisitsList.querySelectorAll('.admin-view-visit-qr-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const visit = state.adminVisits.find((v) => String(v.id) === String(btn.dataset.id));
          if (visit) showQrPassModal(visit);
        });
      });

      adminVisitsList.querySelectorAll('.mark-ingreso-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            await API.visits.updateStatus(btn.dataset.id, 'Ingresado');
            showToast('Ingreso registrado en guardia. Propietario notificado.');
            loadAdminData();
          } catch (err) {
            showToast(err.message);
          }
        });
      });

      adminVisitsList.querySelectorAll('.mark-egreso-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            await API.visits.updateStatus(btn.dataset.id, 'Egresado');
            showToast('Salida registrada en guardia. Propietario notificado.');
            loadAdminData();
          } catch (err) {
            showToast(err.message);
          }
        });
      });
    }
  }

  // Admin expenses list
  const adminExpensesList = document.getElementById('adminExpensesList');
  const adminExpensesStatusBadge = document.getElementById('adminExpensesStatusBadge');
  if (adminExpensesList) {
    const expenses = state.adminExpenses || [];
    const inReviewCount = expenses.filter((e) => e.status === 'En revisión').length;

    if (adminExpensesStatusBadge) {
      adminExpensesStatusBadge.textContent = inReviewCount > 0 ? `${inReviewCount} en revisión` : `${expenses.length} liquidaciones`;
    }

    if (expenses.length === 0) {
      adminExpensesList.innerHTML = `
        <li class="visit-item">
          <div>
            <strong>Sin liquidaciones cargadas</strong>
            <small>Hacé click en "➕ Emitir Nueva Liquidación" para generar las expensas del mes.</small>
          </div>
        </li>
      `;
    } else {
      adminExpensesList.innerHTML = expenses
        .map((exp) => `
          <li class="visit-item">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; flex-wrap: wrap;">
              <div>
                <strong>${escapeHTML(exp.nombre)} ${escapeHTML(exp.apellido)} <small>(DNI ${escapeHTML(exp.numeroDocumento)})</small></strong>
                <p style="margin: 0.2rem 0; font-size: 0.95rem;">
                  <strong>${escapeHTML(exp.period)}</strong> — $ ${Number(exp.amount).toLocaleString('es-AR')}
                </p>
                <small>${exp.concept ? `📌 ${escapeHTML(exp.concept)} · ` : ''}${exp.paymentReference ? `📄 Ref: <strong>${escapeHTML(exp.paymentReference)}</strong> · ` : ''}Vencimiento: ${escapeHTML(exp.dueDate)}</small>
              </div>
              <div class="visit-actions" style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
                ${exp.status !== 'Pagado' ? `
                  <button type="button" class="btn-inline-action success admin-approve-expense-btn" data-id="${exp.id}" title="Confirmar cobro">Acreditar Pago</button>
                ` : `
                  <span class="badge soft">Acreditado</span>
                `}
                ${exp.status === 'En revisión' ? `
                  <button type="button" class="btn-inline-action danger admin-reject-expense-btn" data-id="${exp.id}" title="Rechazar comprobante informado">Desestimar</button>
                ` : ''}
                ${exp.status === 'Pendiente' ? `
                  <button type="button" class="btn-inline-action danger admin-delete-expense-btn" data-id="${exp.id}" title="Eliminar liquidación emitida por error">Eliminar</button>
                ` : ''}
              </div>
            </div>
            <div class="visit-meta" style="margin-top: 0.4rem;">
              <span>${exp.paidAt ? `Fecha pago: ${new Date(exp.paidAt).toLocaleDateString()}` : 'Emitida'}</span>
              <em class="visit-status ${exp.status === 'Pagado' ? 'confirmed' : (exp.status === 'En revisión' ? 'neutral' : 'pending')}">${escapeHTML(exp.status)}</em>
            </div>
          </li>
        `)
        .join('');

      adminExpensesList.querySelectorAll('.admin-approve-expense-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('¿Confirmar y acreditar el pago de este periodo?')) return;
          try {
            await API.expenses.updateStatus(btn.dataset.id, 'Pagado');
            showToast('Pago acreditado con éxito. Propietario notificado.');
            loadAdminData();
          } catch (err) {
            showToast(err.message);
          }
        });
      });

      adminExpensesList.querySelectorAll('.admin-reject-expense-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('¿Desestimar este aviso de pago y devolverlo a estado Pendiente?')) return;
          try {
            await API.expenses.updateStatus(btn.dataset.id, 'Pendiente');
            showToast('Aviso de pago desestimado. Vuelto a Pendiente.');
            loadAdminData();
          } catch (err) {
            showToast(err.message);
          }
        });
      });

      adminExpensesList.querySelectorAll('.admin-delete-expense-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('¿Estás seguro de eliminar esta liquidación emitida?')) return;
          try {
            await API.expenses.deleteAdmin(btn.dataset.id);
            showToast('Liquidación eliminada correctamente.');
            loadAdminData();
          } catch (err) {
            showToast(err.message);
          }
        });
      });
    }
  }

  // Admin Court Supervision
  if (adminCourtScheduleList) {
    const courtDate = state.adminCourtDate || getTodayISO();
    if (adminCourtDateInput) {
      adminCourtDateInput.value = courtDate;
    }
    const today = getTodayISO();
    const tomorrow = getTomorrowISO();
    if (adminCourtDateTodayBtn) adminCourtDateTodayBtn.classList.toggle('active', courtDate === today);
    if (adminCourtDateTomorrowBtn) adminCourtDateTomorrowBtn.classList.toggle('active', courtDate === tomorrow);

    const bookings = state.adminCourtBookings || [];
    const occupiedCount = bookings.filter((b) => !b.isBlocked).length;
    const blockedCount = bookings.filter((b) => b.isBlocked).length;

    if (adminCourtOccupiedBadge) {
      adminCourtOccupiedBadge.textContent = `${occupiedCount} turno${occupiedCount === 1 ? '' : 's'} reservado${occupiedCount === 1 ? '' : 's'}`;
    }
    if (adminCourtBlockedBadge) {
      if (blockedCount > 0) {
        adminCourtBlockedBadge.style.display = 'inline-block';
        adminCourtBlockedBadge.textContent = `${blockedCount} bloqueado${blockedCount === 1 ? '' : 's'}`;
      } else {
        adminCourtBlockedBadge.style.display = 'none';
      }
    }

    if (adminUnblockDayBtn) {
      adminUnblockDayBtn.style.display = blockedCount > 0 ? 'inline-block' : 'none';
    }

    const slots = state.validSlots || [];
    if (slots.length === 0) {
      adminCourtScheduleList.innerHTML = `
        <div style="padding: 1.2rem; text-align: center; color: var(--muted);">
          No se pudieron cargar los horarios de la cancha.
        </div>
      `;
    } else {
      adminCourtScheduleList.innerHTML = slots
        .map((slot) => {
          const booking = bookings.find((b) => b.slot === slot);
          if (booking && booking.isBlocked) {
            // Blocked slot
            return `
              <div class="glass-card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.6rem; padding: 0.75rem 1rem; border-radius: 12px; background: rgba(255, 122, 122, 0.08); border: 1px solid rgba(255, 122, 122, 0.3);">
                <div style="display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap;">
                  <strong style="font-size: 0.95rem; color: #ff9e9e; min-width: 105px;">⏰ ${escapeHTML(slot)}</strong>
                  <span class="badge soft" style="background: rgba(255, 122, 122, 0.2); color: var(--danger); border: 1px solid rgba(255, 122, 122, 0.4);">
                    🚫 Bloqueado
                  </span>
                  <span style="font-size: 0.85rem; color: var(--muted);">
                    Motivo: <strong style="color: #fff;">${escapeHTML(booking.blockReason || 'Mantenimiento')}</strong>
                  </span>
                </div>
                <div>
                  <button type="button" class="btn-inline-action unblock-slot-btn" data-id="${booking.id}" data-slot="${escapeHTML(slot)}" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">
                    Desbloquear
                  </button>
                </div>
              </div>
            `;
          } else if (booking) {
            // Occupied slot by resident
            let lotText = '';
            if (booking.lote || booking.manzana) {
              lotText = ` · Lote ${escapeHTML(booking.lote || '-')}, Mz ${escapeHTML(booking.manzana || '-')}`;
            }
            const phoneText = booking.telefono ? ` · 📞 ${escapeHTML(booking.telefono)}` : '';
            const emailText = booking.userEmail ? ` · 📧 ${escapeHTML(booking.userEmail)}` : '';

            return `
              <div class="glass-card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.6rem; padding: 0.75rem 1rem; border-radius: 12px; background: rgba(105, 210, 166, 0.06); border: 1px solid rgba(105, 210, 166, 0.25);">
                <div style="display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap;">
                  <strong style="font-size: 0.95rem; color: var(--primary); min-width: 105px;">⏰ ${escapeHTML(slot)}</strong>
                  <span class="badge soft" style="background: rgba(105, 210, 166, 0.2); color: var(--primary); border: 1px solid rgba(105, 210, 166, 0.4);">
                    🎾 Reservado
                  </span>
                  <div style="font-size: 0.85rem;">
                    <strong style="color: #fff;">${escapeHTML(booking.userName)}</strong>
                    <span style="color: var(--muted);">${lotText}${phoneText}${emailText}</span>
                  </div>
                </div>
                <div style="display: flex; gap: 0.4rem; align-items: center;">
                  <button type="button" class="danger-btn cancel-resident-booking-btn" data-id="${booking.id}" data-slot="${escapeHTML(slot)}" data-name="${escapeHTML(booking.userName)}" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">
                    Cancelar Turno
                  </button>
                </div>
              </div>
            `;
          } else {
            // Free slot
            return `
              <div class="glass-card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.6rem; padding: 0.65rem 1rem; border-radius: 12px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06);">
                <div style="display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap;">
                  <span style="font-size: 0.92rem; color: var(--muted); min-width: 105px;">⏰ ${escapeHTML(slot)}</span>
                  <span class="badge soft" style="background: rgba(255, 255, 255, 0.05); color: var(--muted);">
                    🟢 Libre
                  </span>
                </div>
                <div>
                  <button type="button" class="text-btn block-single-slot-btn" data-slot="${escapeHTML(slot)}" style="font-size: 0.8rem; color: #ff9e9e;">
                    🚫 Bloquear este horario
                  </button>
                </div>
              </div>
            `;
          }
        })
        .join('');

      // Event listeners for unblock slot
      adminCourtScheduleList.querySelectorAll('.unblock-slot-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            await API.bookings.cancel(btn.dataset.id);
            showToast(`Horario ${btn.dataset.slot} desbloqueado.`);
            await loadAdminData();
          } catch (err) {
            showToast(err.message || 'Error al desbloquear.');
          }
        });
      });

      // Event listeners for cancel resident booking
      adminCourtScheduleList.querySelectorAll('.cancel-resident-booking-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const reason = prompt(`¿Por qué motivo cancelás el turno de ${btn.dataset.name} (${btn.dataset.slot})? El vecino recibirá este mensaje en su campanita:`, 'Mantenimiento de cancha');
          if (reason === null) return;
          try {
            await API.bookings.cancel(btn.dataset.id, reason.trim());
            showToast('Turno cancelado y vecino notificado.');
            await loadAdminData();
          } catch (err) {
            showToast(err.message || 'Error al cancelar reserva.');
          }
        });
      });

      // Event listeners for quick block single slot
      adminCourtScheduleList.querySelectorAll('.block-single-slot-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          openBlockCourtModal(btn.dataset.slot);
        });
      });
    }
  }

  // Broadcast alerts panel
  if (adminBroadcastAlertsList) {
    const broadcasts = state.adminBroadcasts || [];
    if (adminBroadcastAlertsCount) {
      adminBroadcastAlertsCount.textContent = `${broadcasts.length} emitida${broadcasts.length === 1 ? '' : 's'}`;
    }

    if (broadcasts.length === 0) {
      adminBroadcastAlertsList.innerHTML = `
        <div style="padding: 1.2rem; text-align: center; color: var(--muted); background: rgba(255,255,255,0.02); border-radius: 12px;">
          No hay alertas comunitarias emitidas actualmente.
        </div>
      `;
    } else {
      adminBroadcastAlertsList.innerHTML = broadcasts
        .map((alert) => {
          const formattedDate = alert.createdAt ? new Date(alert.createdAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '';
          return `
            <div class="glass-card" style="padding: 0.85rem 1rem; border-radius: 12px; background: rgba(247, 199, 109, 0.05); border: 1px solid rgba(247, 199, 109, 0.2); display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; flex-wrap: wrap;">
              <div style="flex: 1 1 280px;">
                <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 0.35rem;">
                  <strong style="color: var(--gold); font-size: 0.95rem;">${escapeHTML(alert.title)}</strong>
                  <span style="font-size: 0.75rem; color: var(--muted);">${escapeHTML(formattedDate)}</span>
                </div>
                <p style="margin: 0; font-size: 0.88rem; color: #fff; line-height: 1.45; white-space: pre-line;">${escapeHTML(alert.text)}</p>
              </div>
              <div>
                <button type="button" class="danger-btn delete-broadcast-btn" data-id="${alert.id}" data-title="${escapeHTML(alert.title)}" style="padding: 0.32rem 0.75rem; font-size: 0.8rem;">
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          `;
        })
        .join('');

      // Add delete broadcast event listeners
      adminBroadcastAlertsList.querySelectorAll('.delete-broadcast-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm(`¿Deseás eliminar la alerta "${btn.dataset.title}" de la comunidad? Se quitará de las notificaciones generales.`)) return;
          try {
            await API.notifications.deleteBroadcast(btn.dataset.id);
            showToast('Alerta eliminada de la comunidad.');
            await loadAdminData();
          } catch (err) {
            showToast(err.message || 'Error al eliminar la alerta.');
          }
        });
      });
    }
  }
}

// ----------------- ADMIN EXPENSE EMISSION ----------------- //

function getDefaultNextMonthPeriod() {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function getDefaultDueDate() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  date.setDate(10);
  return date.toISOString().split('T')[0];
}

function openEmitExpense() {
  if (!emitExpenseModal) return;

  if (emitExpensePeriod) emitExpensePeriod.value = getDefaultNextMonthPeriod();
  if (emitExpenseDueDate) emitExpenseDueDate.value = getDefaultDueDate();
  if (emitExpenseAmount) emitExpenseAmount.value = '150000';
  if (emitExpenseConcept) emitExpenseConcept.value = `Expensas ordinarias ${emitExpensePeriod?.value || ''}`.trim();
  if (emitExpenseTarget) emitExpenseTarget.value = 'all';
  if (singleUserContainer) singleUserContainer.style.display = 'none';

  if (emitExpenseUserId) {
    const users = state.approvedUsers || [];
    if (users.length === 0) {
      emitExpenseUserId.innerHTML = '<option value="">No hay propietarios activos</option>';
    } else {
      emitExpenseUserId.innerHTML = users
        .map((u) => `<option value="${u.id}">${escapeHTML(u.nombre)} ${escapeHTML(u.apellido)} (${escapeHTML(u.email)})</option>`)
        .join('');
    }
  }

  emitExpenseModal.style.display = 'grid';
  window.history.pushState({ modal: 'emitExpense', view: state.activeDashboardView }, '', '#emitir-expensas');
}

function closeEmitExpense(fromPopState = false) {
  if (!emitExpenseModal) return;
  emitExpenseModal.style.display = 'none';
  if (!fromPopState && window.history.state?.modal === 'emitExpense') {
    window.history.back();
  }
}

async function handleEmitExpense(e) {
  e.preventDefault();
  if (!emitExpenseForm) return;

  const period = String(emitExpensePeriod?.value || '').trim();
  const dueDate = String(emitExpenseDueDate?.value || '').trim();
  const amount = Number(emitExpenseAmount?.value || 0);
  const concept = String(emitExpenseConcept?.value || '').trim();
  const target = emitExpenseTarget?.value || 'all';
  const userId = target === 'single' ? Number(emitExpenseUserId?.value) : null;

  if (!period || !dueDate || !amount) {
    showToast('Completá periodo, vencimiento y monto.');
    return;
  }

  if (target === 'single' && !userId) {
    showToast('Seleccioná el propietario.');
    return;
  }

  try {
    if (submitEmitExpenseBtn) {
      submitEmitExpenseBtn.disabled = true;
      submitEmitExpenseBtn.textContent = 'Emitiendo...';
    }

    const res = await API.expenses.emit({
      period,
      dueDate,
      amount,
      concept,
      target,
      userId
    });

    showToast(res.message || 'Liquidación emitida con éxito.');
    closeEmitExpense(false);
    emitExpenseForm.reset();
    await loadAdminData();
  } catch (error) {
    showToast(error.message);
  } finally {
    if (submitEmitExpenseBtn) {
      submitEmitExpenseBtn.disabled = false;
      submitEmitExpenseBtn.textContent = 'Generar y Emitir';
    }
  }
}

// ----------------- ACTIVE USERS ROSTER & CREATE USER ----------------- //

function openCreateUserModal() {
  if (!createUserModal) return;
  if (createUserForm) createUserForm.reset();
  if (newUserDocType) newUserDocType.value = 'DNI';
  if (newUserRole) newUserRole.value = 'user';
  if (newUserPassword) newUserPassword.value = 'Vecino2026!';
  createUserModal.style.display = 'grid';
  window.history.pushState({ modal: 'createUser', view: state.activeDashboardView }, '', '#nuevo-vecino');
}

function closeCreateUserModalFn(fromPopState = false) {
  if (!createUserModal) return;
  createUserModal.style.display = 'none';
  if (!fromPopState && window.history.state?.modal === 'createUser') {
    window.history.back();
  }
}

function updateAutoUsername() {
  if (!newUserUsername || !newUserLote || !newUserManzana) return;
  const loteVal = (newUserLote.value || '').trim();
  const manVal = (newUserManzana.value || '').trim();
  if (loteVal && manVal) {
    const cleanL = loteVal.replace(/\D/g, '') || loteVal;
    const cleanM = manVal.replace(/\D/g, '') || manVal;
    // Auto-fill if empty or matches standard pattern
    if (!newUserUsername.value || /^L\d*M\d*$/i.test(newUserUsername.value.trim())) {
      newUserUsername.value = `L${cleanL}M${cleanM}`;
    }
  }
}

async function handleCreateUser(e) {
  e.preventDefault();
  if (!createUserForm) return;

  const submitBtn = document.getElementById('submitCreateUserBtn');
  const nombre = (newUserName?.value || '').trim();
  const apellido = (newUserLastName?.value || '').trim();
  const lote = (newUserLote?.value || '').trim();
  const manzana = (newUserManzana?.value || '').trim();
  const username = (newUserUsername?.value || '').trim();
  const role = newUserRole?.value || 'user';
  const tipoDocumento = newUserDocType?.value || 'DNI';
  const numeroDocumento = (newUserDocNum?.value || '').trim();
  const telefono = (newUserPhone?.value || '').trim();
  const email = (newUserEmail?.value || '').trim();
  const password = (newUserPassword?.value || '').trim();

  if (!nombre || !apellido || !numeroDocumento || !telefono || !email || !password) {
    showToast('Por favor completá los campos obligatorios (*).');
    return;
  }

  if (password.length < 6) {
    showToast('La contraseña debe tener al menos 6 caracteres.');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creando usuario...';
  }

  try {
    const res = await API.admin.createUser({
      nombre,
      apellido,
      lote,
      manzana,
      username,
      role,
      tipoDocumento,
      numeroDocumento,
      telefono,
      email,
      password
    });

    showToast(res.message || 'Vecino creado y habilitado con éxito.');
    closeCreateUserModalFn();
    await loadAdminData();
  } catch (err) {
    showToast(err.message || 'Error al crear el vecino.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Crear y Habilitar Vecino';
    }
  }
}

// ----------------- ADMIN COURT SUPERVISION & BLOCKING ----------------- //

function openBlockCourtModal(targetSlot = null) {
  if (!blockCourtModal) return;
  if (blockCourtForm) blockCourtForm.reset();

  const courtDate = state.adminCourtDate || getTodayISO();
  if (blockCourtDate) blockCourtDate.value = courtDate;

  // Populate slot dropdown
  if (blockCourtSlot) {
    const slots = state.validSlots || [];
    blockCourtSlot.innerHTML = slots
      .map((s) => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`)
      .join('');
    if (targetSlot) {
      blockCourtSlot.value = targetSlot;
      if (blockCourtScope) blockCourtScope.value = 'single';
    } else {
      if (blockCourtScope) blockCourtScope.value = 'single';
    }
  }

  if (blockCourtSlotContainer) {
    blockCourtSlotContainer.style.display = blockCourtScope?.value === 'all' ? 'none' : 'block';
  }

  blockCourtModal.style.display = 'grid';
  window.history.pushState({ modal: 'blockCourt', view: state.activeDashboardView }, '', '#bloquear-cancha');
}

function closeBlockCourtModalFn(fromPopState = false) {
  if (!blockCourtModal) return;
  blockCourtModal.style.display = 'none';
  if (!fromPopState && window.history.state?.modal === 'blockCourt') {
    window.history.back();
  }
}

async function handleBlockCourt(e) {
  e.preventDefault();
  if (!blockCourtForm) return;

  const date = blockCourtDate?.value;
  const scope = blockCourtScope?.value;
  const slot = blockCourtSlot?.value;
  const reason = blockCourtReason?.value;
  const details = (blockCourtDetails?.value || '').trim();

  if (!date) {
    showToast('Seleccioná la fecha a bloquear.');
    return;
  }

  if (scope !== 'all' && !slot) {
    showToast('Seleccioná el horario a bloquear.');
    return;
  }

  if (submitBlockCourtBtn) {
    submitBlockCourtBtn.disabled = true;
    submitBlockCourtBtn.textContent = 'Aplicando bloqueo...';
  }

  try {
    const res = await API.bookings.blockCourt({
      date,
      allDay: scope === 'all',
      slot,
      reason,
      details
    });

    showToast(res.message || 'Cancha bloqueada con éxito.');
    closeBlockCourtModalFn();
    state.adminCourtDate = date;
    await loadAdminData();
  } catch (err) {
    showToast(err.message || 'Error al bloquear la cancha.');
  } finally {
    if (submitBlockCourtBtn) {
      submitBlockCourtBtn.disabled = false;
      submitBlockCourtBtn.textContent = 'Aplicar Bloqueo';
    }
  }
}

// ----------------- ADMIN BROADCAST ALERTS ----------------- //

const BROADCAST_PRESETS = {
  custom: {
    title: '',
    text: ''
  },
  water: {
    title: '💧 Corte programado de suministro de agua',
    text: 'Se informa a todos los vecinos que el día de hoy se realizará un corte temporal en el suministro de agua de 14:00 a 17:00 hs por tareas de reparación y mantenimiento en la red principal. Rogamos tomar las previsiones necesarias.'
  },
  power: {
    title: '⚡ Mantenimiento en red eléctrica / microcortes',
    text: 'Estimados vecinos, cuadrillas de la compañía eléctrica estarán realizando trabajos de mantenimiento preventivo en transformadores del barrio. Podrán registrarse microcortes intermitentes durante la jornada.'
  },
  gas: {
    title: '🔥 Inspección técnica preventiva en red de gas',
    text: 'Se informa a la comunidad que personal técnico estará realizando revisiones y mantenimiento en la red interna de gas. Ante cualquier olor anómalo o consulta, comunicarse inmediatamente con la guardia.'
  },
  works: {
    title: '🚧 Obras viales y reducción de calzada en acceso',
    text: 'Aviso de circulación: Hay maquinarias pesadas trabajando en tareas de pavimentación y bacheo en las arterias principales. Rogamos circular a paso de hombre y respetar las señalizaciones.'
  },
  security: {
    title: '🛡️ Alerta preventiva de seguridad',
    text: 'Se recuerda a todos los vecinos verificar el correcto cierre de portones y perímetros. Ante cualquier vehículo o movimiento sospechoso, avisar de inmediato a la guardia al interno o WhatsApp oficial.'
  },
  admin: {
    title: '📢 Comunicado oficial de la Administración',
    text: 'Estimada comunidad, les compartimos una información de interés general para todos los propietarios y residentes del barrio Rancho Doble S.'
  }
};

function openBroadcastAlertModal() {
  if (!broadcastAlertModal) return;
  if (broadcastAlertForm) broadcastAlertForm.reset();
  if (broadcastAlertPreset) broadcastAlertPreset.value = 'custom';
  broadcastAlertModal.style.display = 'grid';
  window.history.pushState({ modal: 'broadcastAlert', view: state.activeDashboardView }, '', '#alerta-comunitaria');
}

function closeBroadcastAlertModalFn(fromPopState = false) {
  if (!broadcastAlertModal) return;
  broadcastAlertModal.style.display = 'none';
  if (!fromPopState && window.history.state?.modal === 'broadcastAlert') {
    window.history.back();
  }
}

async function handleBroadcastAlert(e) {
  e.preventDefault();
  const title = (broadcastAlertTitle?.value || '').trim();
  const text = (broadcastAlertText?.value || '').trim();

  if (!title || !text) {
    showToast('Por favor completá el título y el mensaje de la alerta.');
    return;
  }

  if (submitBroadcastAlertBtn) {
    submitBroadcastAlertBtn.disabled = true;
    submitBroadcastAlertBtn.textContent = 'Emitiendo alerta...';
  }

  try {
    const res = await API.notifications.broadcast({ title, text });
    showToast(res.message || 'Alerta comunitaria emitida con éxito.');
    closeBroadcastAlertModalFn();
    await loadAdminData();
    loadNotifications();
  } catch (err) {
    showToast(err.message || 'Error al emitir alerta comunitaria.');
  } finally {
    if (submitBroadcastAlertBtn) {
      submitBroadcastAlertBtn.disabled = false;
      submitBroadcastAlertBtn.textContent = '🚨 Enviar Alerta Masiva';
    }
  }
}

// ----------------- GUARD QR SCANNER & VISITOR LOOKUP ----------------- //

let html5QrCodeScanner = null;
let currentCameraId = null;
let availableCameras = [];

async function initCameraList() {
  if (!window.Html5Qrcode) return;
  try {
    availableCameras = await Html5Qrcode.getCameras();
    if (cameraSelect) {
      if (availableCameras.length === 0) {
        cameraSelect.innerHTML = '<option value="">Sin cámaras disponibles</option>';
      } else {
        cameraSelect.innerHTML = availableCameras
          .map((cam, idx) => `<option value="${cam.id}">${escapeHTML(cam.label || `Cámara ${idx + 1}`)}</option>`)
          .join('');
        // Prefer back / environment camera if on mobile
        const backCam = availableCameras.find((c) =>
          c.label.toLowerCase().includes('back') ||
          c.label.toLowerCase().includes('trasera') ||
          c.label.toLowerCase().includes('environment')
        );
        currentCameraId = backCam ? backCam.id : availableCameras[0].id;
        cameraSelect.value = currentCameraId;
      }
    }
  } catch (err) {
    console.warn('Error fetching cameras:', err);
    if (cameraSelect) cameraSelect.innerHTML = '<option value="">Permiso de cámara pendiente o denegado</option>';
  }
}

async function startQrScanner() {
  if (!scanQrModal) return;
  scanQrModal.style.display = 'grid';
  window.history.pushState({ modal: 'scanQr', view: state.activeDashboardView }, '', '#escanear-qr');

  if (scannedVisitResult) scannedVisitResult.style.display = 'none';
  if (qrReaderLoading) {
    qrReaderLoading.style.display = 'flex';
    qrReaderLoading.innerHTML = `
      <span>⏳ Esperando acceso a cámara...</span>
      <small style="color: var(--muted); font-size: 0.8rem;">Asegurate de permitir los permisos de cámara en el navegador.</small>
    `;
  }

  await initCameraList();

  if (!window.Html5Qrcode) {
    if (qrReaderLoading) {
      qrReaderLoading.innerHTML = `<span>Librería de escaneo no disponible. Usá el ingreso manual abajo.</span>`;
    }
    return;
  }

  try {
    if (html5QrCodeScanner) {
      try {
        if (html5QrCodeScanner.isScanning) await html5QrCodeScanner.stop();
      } catch (e) {}
      html5QrCodeScanner = null;
    }

    html5QrCodeScanner = new Html5Qrcode("qrReader");

    const config = {
      fps: 10,
      qrbox: { width: 220, height: 220 },
      aspectRatio: 1.0
    };

    const cameraIdToUse = cameraSelect?.value || currentCameraId || { facingMode: "environment" };

    await html5QrCodeScanner.start(
      cameraIdToUse,
      config,
      (decodedText) => {
        onQrCodeDetected(decodedText);
      },
      () => {
        // frame without QR code
      }
    );

    if (qrReaderLoading) qrReaderLoading.style.display = 'none';
  } catch (err) {
    console.warn('Cannot start camera scanner:', err);
    if (qrReaderLoading) {
      qrReaderLoading.style.display = 'flex';
      qrReaderLoading.innerHTML = `
        <span style="color: #ef4444;">⚠️ No se pudo acceder a la cámara (${escapeHTML(err.message || 'Sin permisos')}).</span>
        <small style="margin-top: 0.25rem;">Podés ingresar el código o usar la pistola lectora abajo.</small>
      `;
    }
  }
}

async function stopQrScanner(fromPopState = false) {
  if (html5QrCodeScanner) {
    try {
      if (html5QrCodeScanner.isScanning) {
        await html5QrCodeScanner.stop();
      }
    } catch (e) {
      console.warn('Error stopping scanner:', e);
    }
    html5QrCodeScanner = null;
  }

  if (scanQrModal) scanQrModal.style.display = 'none';

  if (!fromPopState && window.history.state?.modal === 'scanQr') {
    window.history.back();
  }
}

function playBeepSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  } catch (e) {}
}

async function onQrCodeDetected(qrText) {
  playBeepSound();

  if (html5QrCodeScanner && html5QrCodeScanner.isScanning) {
    try {
      await html5QrCodeScanner.pause();
    } catch (e) {}
  }

  await processVisitLookup(qrText);
}

async function processVisitLookup(queryText) {
  try {
    showToast('Pase detectado. Verificando...');
    const res = await API.visits.scanLookup({ query: queryText });

    if (!res.found || !res.visit) {
      showToast('Visita no encontrada para este código.');
      if (html5QrCodeScanner) {
        try { html5QrCodeScanner.resume(); } catch (e) {}
      }
      return;
    }

    renderScannedVisitResult(res.visit);
  } catch (err) {
    showToast(err.message || 'Error al verificar visita.');
    if (html5QrCodeScanner) {
      try { html5QrCodeScanner.resume(); } catch (e) {}
    }
  }
}

function renderScannedVisitResult(visit) {
  if (!scannedVisitResult) return;

  if (scannedVisitorName) scannedVisitorName.textContent = visit.visitorName;
  if (scannedVisitorDetails) scannedVisitorDetails.textContent = `DNI ${visit.visitorDni} · Patente: ${visit.vehiclePlate || 'Sin vehículo'}`;
  if (scannedResidentName) scannedResidentName.textContent = visit.residentName;

  if (scannedVisitStatusBadge) {
    scannedVisitStatusBadge.textContent = visit.status === 'Ingresado' ? '🟢 En predio' : visit.status === 'Egresado' ? '🚪 Egresó' : visit.status;
    scannedVisitStatusBadge.className = `visit-status ${visit.status === 'Ingresado' ? 'confirmed' : visit.status === 'Egresado' ? 'neutral' : 'pending'}`;
  }

  if (scannedVisitActions) {
    let actionsHtml = '';
    if (visit.status !== 'Ingresado' && visit.status !== 'Egresado') {
      actionsHtml += `
        <button type="button" class="btn-inline-action success scan-mark-ingreso-btn" data-id="${visit.id}" style="padding: 0.5rem 1.1rem; font-size: 0.9rem;">
          ✅ Marcar Ingreso
        </button>
      `;
    } else if (visit.status === 'Ingresado') {
      actionsHtml += `
        <button type="button" class="btn-inline-action danger scan-mark-egreso-btn" data-id="${visit.id}" style="padding: 0.5rem 1.1rem; font-size: 0.9rem;">
          🚪 Marcar Salida / Egreso
        </button>
      `;
    } else {
      actionsHtml += `
        <span style="color: var(--muted); font-size: 0.85rem; align-self: center;">Visita ya egresada${visit.exitAt ? ` a las ${new Date(visit.exitAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs` : ''}.</span>
      `;
    }

    scannedVisitActions.innerHTML = actionsHtml;

    const ingresoBtn = scannedVisitActions.querySelector('.scan-mark-ingreso-btn');
    if (ingresoBtn) {
      ingresoBtn.addEventListener('click', async () => {
        try {
          await API.visits.updateStatus(visit.id, 'Ingresado');
          showToast(`¡Ingreso registrado! Propietario ${visit.residentName} notificado.`);
          stopQrScanner(false);
          loadAdminData();
        } catch (e) {
          showToast(e.message);
        }
      });
    }

    const egresoBtn = scannedVisitActions.querySelector('.scan-mark-egreso-btn');
    if (egresoBtn) {
      egresoBtn.addEventListener('click', async () => {
        try {
          await API.visits.updateStatus(visit.id, 'Egresado');
          showToast(`¡Salida registrada! Propietario notificado.`);
          stopQrScanner(false);
          loadAdminData();
        } catch (e) {
          showToast(e.message);
        }
      });
    }
  }

  scannedVisitResult.style.display = 'block';
  scannedVisitResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ----------------- AUTHENTICATION FLOWS ----------------- //

async function handleLogin(event) {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '').trim();

  if (!email || !password) {
    showToast('Por favor completá email y contraseña.');
    return;
  }

  const submitBtn = document.getElementById('loginSubmitBtn');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const data = await API.auth.login(email, password);
    API.setToken(data.token);
    state.authenticatedUser = data.user;

    loginForm.reset();
    showToast(`Bienvenido ${data.user.nombre} ${data.user.apellido}.`);
    enterDashboard();
  } catch (error) {
    showToast(error.message);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function handleRegister(event) {
  event.preventDefault();
  if (registerStatus) registerStatus.textContent = '';

  const formData = new FormData(registerForm);
  const values = Object.fromEntries(formData.entries());

  const requiredFields = [
    'apellido', 'nombre', 'tipoDocumento', 'numeroDocumento', 'telefono', 'email', 'password', 'confirmPassword'
  ];

  const missing = requiredFields.find((f) => !String(values[f] || '').trim());
  if (missing) {
    if (registerStatus) registerStatus.textContent = 'Completá todos los campos obligatorios.';
    return;
  }

  if (values.password !== values.confirmPassword) {
    if (registerStatus) registerStatus.textContent = 'Las contraseñas no coinciden.';
    return;
  }

  if (values.password.length < 6) {
    if (registerStatus) registerStatus.textContent = 'La contraseña debe tener al menos 6 caracteres.';
    return;
  }

  const submitBtn = document.getElementById('registerSubmitBtn');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const res = await API.auth.register(values);
    registerForm.reset();
    if (registerStatus) registerStatus.textContent = res.message || 'Solicitud enviada para revisión.';
    showToast('Solicitud enviada con éxito.');
  } catch (error) {
    if (registerStatus) registerStatus.textContent = error.message;
    showToast(error.message);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

function handleLogout() {
  API.clearToken();
  state.authenticatedUser = null;
  authScreen.classList.remove('hidden');
  authScreen.style.display = 'grid';
  dashboardScreen.classList.remove('active');
  toggleNotificationsPanel(false);
  setAuthView('login');
  if (window.location.hash) {
    window.history.replaceState(null, '', window.location.pathname);
  }
  showToast('Sesión cerrada correctamente.');
}

function enterDashboard() {
  renderUserProfile();
  authScreen.classList.add('hidden');
  authScreen.style.display = 'none';
  dashboardScreen.classList.add('active');

  let initialView = window.location.hash ? window.location.hash.replace('#', '') : 'home';
  if (['qr-modal', 'notificaciones', 'nueva-publicacion', 'emitir-expensas', 'escanear-qr'].includes(initialView)) {
    initialView = 'home';
  }
  setDashboardView(initialView, false);
  window.history.replaceState({ view: state.activeDashboardView }, '', window.location.hash || window.location.pathname);

  loadNotifications();

  if (state.authenticatedUser?.role === 'admin') {
    loadAdminData();
  }
}

// ----------------- INITIALIZATION & LISTENERS ----------------- //

function attachEventListeners() {
  authTabs.forEach((tab) => {
    tab.addEventListener('click', () => setAuthView(tab.dataset.authView));
  });

  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  if (visitForm) visitForm.addEventListener('submit', handleVisitSubmit);

  // Big menu buttons on main home screen
  document.querySelectorAll('[data-target-view]').forEach((button) => {
    button.addEventListener('click', () => {
      setDashboardView(button.dataset.targetView);
    });
  });

  // Back to menu buttons on inner pages
  document.querySelectorAll('[data-back-to-menu]').forEach((button) => {
    button.addEventListener('click', () => {
      setDashboardView('home');
    });
  });

  // Navigation tabs
  document.querySelectorAll('.nav-link').forEach((button) => {
    button.addEventListener('click', () => setDashboardView(button.dataset.view));
  });

  // Booking filters
  document.querySelectorAll('.booking-filter').forEach((button) => {
    button.addEventListener('click', () => {
      state.bookingFilter = button.dataset.filter;
      document.querySelectorAll('.booking-filter').forEach((b) => {
        const isActive = b.dataset.filter === state.bookingFilter;
        b.classList.toggle('active', isActive);
      });
      renderBookingSlots();
    });
  });

  // Booking Date selectors
  if (bookingDateInput) {
    bookingDateInput.addEventListener('change', (e) => {
      if (e.target.value) {
        state.selectedBookingDate = e.target.value;
        updateDateControls();
        loadBookings();
      }
    });
  }

  if (btnDateToday) {
    btnDateToday.addEventListener('click', () => {
      state.selectedBookingDate = getTodayISO();
      updateDateControls();
      loadBookings();
    });
  }

  if (btnDateTomorrow) {
    btnDateTomorrow.addEventListener('click', () => {
      state.selectedBookingDate = getTomorrowISO();
      updateDateControls();
      loadBookings();
    });
  }

  // Notifications drawer
  if (notificationsToggle) notificationsToggle.addEventListener('click', () => toggleNotificationsPanel());
  if (closeNotifications) closeNotifications.addEventListener('click', () => toggleNotificationsPanel(false));
  if (notificationBackdrop) notificationBackdrop.addEventListener('click', () => toggleNotificationsPanel(false));
  if (markAllRead) markAllRead.addEventListener('click', handleMarkAllNotificationsRead);

  // Admin news creation modal
  function openCreateNews() {
    if (!createNewsModal) return;
    createNewsModal.style.display = 'grid';
    window.history.pushState({ modal: 'createNews', view: state.activeDashboardView }, '', '#nueva-publicacion');
  }

  function closeCreateNews(fromPopState = false) {
    if (!createNewsModal) return;
    createNewsModal.style.display = 'none';
    if (!fromPopState && window.history.state?.modal === 'createNews') {
      window.history.back();
    }
  }

  if (openCreateNewsModalBtn) {
    openCreateNewsModalBtn.addEventListener('click', openCreateNews);
  }

  if (closeCreateNewsModal) {
    closeCreateNewsModal.addEventListener('click', () => closeCreateNews(false));
  }

  if (cancelCreateNewsBtn) {
    cancelCreateNewsBtn.addEventListener('click', () => closeCreateNews(false));
  }

  if (createNewsForm) {
    createNewsForm.addEventListener('submit', handleCreateNews);
  }

  // Admin expense emission modal
  if (openEmitExpenseModalBtn) {
    openEmitExpenseModalBtn.addEventListener('click', openEmitExpense);
  }
  if (closeEmitExpenseModal) {
    closeEmitExpenseModal.addEventListener('click', () => closeEmitExpense(false));
  }
  if (cancelEmitExpenseBtn) {
    cancelEmitExpenseBtn.addEventListener('click', () => closeEmitExpense(false));
  }
  if (emitExpenseTarget) {
    emitExpenseTarget.addEventListener('change', () => {
      if (singleUserContainer) {
        singleUserContainer.style.display = emitExpenseTarget.value === 'single' ? 'block' : 'none';
      }
    });
  }
  if (emitExpenseForm) {
    emitExpenseForm.addEventListener('submit', handleEmitExpense);
  }

  // Guard visit search and filters
  if (guardSearchInput) {
    guardSearchInput.addEventListener('input', (e) => {
      state.guardSearchQuery = e.target.value.trim();
      renderAdminPanel();
    });
  }

  document.querySelectorAll('.guard-filter-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      state.guardFilter = tab.dataset.filter;
      document.querySelectorAll('.guard-filter-tab').forEach((t) => {
        t.classList.toggle('active', t.dataset.filter === state.guardFilter);
      });
      renderAdminPanel();
    });
  });

  // Guard QR scanner modal handlers
  if (openScanQrModalBtn) {
    openScanQrModalBtn.addEventListener('click', startQrScanner);
  }
  if (closeScanQrModal) {
    closeScanQrModal.addEventListener('click', () => stopQrScanner(false));
  }
  if (cancelScanQrBtn) {
    cancelScanQrBtn.addEventListener('click', () => stopQrScanner(false));
  }
  if (switchCameraBtn) {
    switchCameraBtn.addEventListener('click', async () => {
      if (availableCameras.length <= 1) {
        showToast('Solo se detectó una cámara en este dispositivo.');
        return;
      }
      const currentIndex = availableCameras.findIndex((c) => c.id === cameraSelect?.value);
      const nextIndex = (currentIndex + 1) % availableCameras.length;
      if (cameraSelect) {
        cameraSelect.value = availableCameras[nextIndex].id;
      }
      await startQrScanner();
    });
  }
  if (cameraSelect) {
    cameraSelect.addEventListener('change', async () => {
      await startQrScanner();
    });
  }
  if (manualQrCodeForm) {
    manualQrCodeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = String(manualQrInput?.value || '').trim();
      if (!code) return;
      await processVisitLookup(code);
      if (manualQrInput) manualQrInput.value = '';
    });
  }

  if (refreshAdminVisitsBtn) {
    refreshAdminVisitsBtn.addEventListener('click', loadAdminData);
  }

  // Invitations (Gmail & WhatsApp) & Manual form toggle
  if (openGmailInviteBtn) openGmailInviteBtn.addEventListener('click', openGmailInvite);
  if (copyInviteLinkEmailBtn) copyInviteLinkEmailBtn.addEventListener('click', () => copyInviteLink(copyInviteLinkEmailBtn));
  if (openWhatsAppInviteBtn) openWhatsAppInviteBtn.addEventListener('click', openWhatsAppInvite);
  if (copyInviteLinkWhatsappBtn) copyInviteLinkWhatsappBtn.addEventListener('click', () => copyInviteLink(copyInviteLinkWhatsappBtn));
  if (toggleManualVisitFormBtn) toggleManualVisitFormBtn.addEventListener('click', toggleManualVisitForm);

  // Active neighbors search & refresh
  if (activeUsersSearchInput) {
    activeUsersSearchInput.addEventListener('input', (e) => {
      state.activeUsersSearchQuery = e.target.value.trim();
      renderAdminPanel();
    });
  }
  if (refreshActiveUsersBtn) {
    refreshActiveUsersBtn.addEventListener('click', async () => {
      await loadAdminData();
      showToast('Padrón de vecinos actualizado.');
    });
  }
  if (openCreateUserModalBtn) {
    openCreateUserModalBtn.addEventListener('click', openCreateUserModal);
  }
  if (closeCreateUserModal) {
    closeCreateUserModal.addEventListener('click', () => closeCreateUserModalFn(false));
  }
  if (cancelCreateUserBtn) {
    cancelCreateUserBtn.addEventListener('click', () => closeCreateUserModalFn(false));
  }
  if (newUserLote) {
    newUserLote.addEventListener('input', updateAutoUsername);
  }
  if (newUserManzana) {
    newUserManzana.addEventListener('input', updateAutoUsername);
  }
  if (createUserForm) {
    createUserForm.addEventListener('submit', handleCreateUser);
  }

  // Admin Court Supervision Listeners
  if (adminCourtDateInput) {
    adminCourtDateInput.addEventListener('change', (e) => {
      state.adminCourtDate = e.target.value;
      loadAdminData();
    });
  }
  if (adminCourtDateTodayBtn) {
    adminCourtDateTodayBtn.addEventListener('click', () => {
      state.adminCourtDate = getTodayISO();
      loadAdminData();
    });
  }
  if (adminCourtDateTomorrowBtn) {
    adminCourtDateTomorrowBtn.addEventListener('click', () => {
      state.adminCourtDate = getTomorrowISO();
      loadAdminData();
    });
  }
  if (openBlockCourtModalBtn) {
    openBlockCourtModalBtn.addEventListener('click', () => openBlockCourtModal());
  }
  if (closeBlockCourtModal) {
    closeBlockCourtModal.addEventListener('click', () => closeBlockCourtModalFn(false));
  }
  if (cancelBlockCourtBtn) {
    cancelBlockCourtBtn.addEventListener('click', () => closeBlockCourtModalFn(false));
  }
  if (blockCourtScope) {
    blockCourtScope.addEventListener('change', () => {
      if (blockCourtSlotContainer) {
        blockCourtSlotContainer.style.display = blockCourtScope.value === 'all' ? 'none' : 'block';
      }
    });
  }
  if (blockCourtForm) {
    blockCourtForm.addEventListener('submit', handleBlockCourt);
  }
  if (adminUnblockDayBtn) {
    adminUnblockDayBtn.addEventListener('click', async () => {
      const courtDate = state.adminCourtDate || getTodayISO();
      if (!confirm(`¿Estás seguro de desbloquear todos los turnos del día ${courtDate}?`)) return;
      try {
        const res = await API.bookings.unblockDay(courtDate);
        showToast(res.message || 'Horarios desbloqueados.');
        loadAdminData();
      } catch (err) {
        showToast(err.message || 'Error al desbloquear horarios.');
      }
    });
  }
  if (refreshAdminCourtsBtn) {
    refreshAdminCourtsBtn.addEventListener('click', async () => {
      await loadAdminData();
      showToast('Reservas de cancha actualizadas.');
    });
  }

  // Admin Broadcast Alerts Listeners
  if (openBroadcastAlertModalBtn) {
    openBroadcastAlertModalBtn.addEventListener('click', openBroadcastAlertModal);
  }
  if (closeBroadcastAlertModal) {
    closeBroadcastAlertModal.addEventListener('click', () => closeBroadcastAlertModalFn(false));
  }
  if (cancelBroadcastAlertBtn) {
    cancelBroadcastAlertBtn.addEventListener('click', () => closeBroadcastAlertModalFn(false));
  }
  if (broadcastAlertModal) {
    broadcastAlertModal.addEventListener('click', (e) => {
      if (e.target === broadcastAlertModal) closeBroadcastAlertModalFn(false);
    });
  }
  if (broadcastAlertPreset) {
    broadcastAlertPreset.addEventListener('change', (e) => {
      const presetKey = e.target.value;
      const preset = BROADCAST_PRESETS[presetKey];
      if (preset && presetKey !== 'custom') {
        if (broadcastAlertTitle) broadcastAlertTitle.value = preset.title;
        if (broadcastAlertText) broadcastAlertText.value = preset.text;
      }
    });
  }
  if (broadcastAlertForm) {
    broadcastAlertForm.addEventListener('submit', handleBroadcastAlert);
  }
  if (refreshAdminAlertsBtn) {
    refreshAdminAlertsBtn.addEventListener('click', async () => {
      await loadAdminData();
      showToast('Historial de alertas actualizado.');
    });
  }

  // Profile Modal Listeners
  if (openProfileModalBtn) {
    openProfileModalBtn.addEventListener('click', openProfileModal);
  }
  if (homeProfileBtn) {
    homeProfileBtn.addEventListener('click', openProfileModal);
  }
  if (userChip) {
    userChip.addEventListener('click', (e) => {
      if (e.target.closest('#logoutBtn')) return;
      openProfileModal();
    });
  }
  if (closeProfileModal) {
    closeProfileModal.addEventListener('click', () => closeProfileModalFn(false));
  }
  if (cancelProfileBtn) {
    cancelProfileBtn.addEventListener('click', () => closeProfileModalFn(false));
  }
  if (profileModal) {
    profileModal.addEventListener('click', (e) => {
      if (e.target === profileModal) closeProfileModalFn(false);
    });
  }
  if (profileInfoForm) {
    profileInfoForm.addEventListener('submit', handleUpdateProfile);
  }
  if (profilePasswordForm) {
    profilePasswordForm.addEventListener('submit', handleChangePassword);
  }

  // QR Modal close handlers
  if (closeViewQrModal) {
    closeViewQrModal.addEventListener('click', () => hideQrPassModal(false));
  }
  if (viewQrModal) {
    viewQrModal.addEventListener('click', (e) => {
      if (e.target === viewQrModal) hideQrPassModal(false);
    });
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (viewQrModal && viewQrModal.style.display !== 'none') {
        hideQrPassModal(false);
      } else if (createNewsModal && createNewsModal.style.display !== 'none') {
        closeCreateNews(false);
      } else if (emitExpenseModal && emitExpenseModal.style.display !== 'none') {
        closeEmitExpense(false);
      } else if (createUserModal && createUserModal.style.display !== 'none') {
        closeCreateUserModalFn(false);
      } else if (blockCourtModal && blockCourtModal.style.display !== 'none') {
        closeBlockCourtModalFn(false);
      } else if (broadcastAlertModal && broadcastAlertModal.style.display !== 'none') {
        closeBroadcastAlertModalFn(false);
      } else if (profileModal && profileModal.style.display !== 'none') {
        closeProfileModalFn(false);
      } else if (scanQrModal && scanQrModal.style.display !== 'none') {
        stopQrScanner(false);
      } else if (notificationPanel && notificationPanel.classList.contains('open')) {
        toggleNotificationsPanel(false);
      }
    }
  });

  // Mobile & browser back button handling (History API)
  window.addEventListener('popstate', (e) => {
    if (notificationPanel && notificationPanel.classList.contains('open')) {
      toggleNotificationsPanel(false, false);
      return;
    }
    if (viewQrModal && viewQrModal.style.display !== 'none') {
      hideQrPassModal(true);
      return;
    }
    if (createNewsModal && createNewsModal.style.display !== 'none') {
      closeCreateNews(true);
      return;
    }
    if (emitExpenseModal && emitExpenseModal.style.display !== 'none') {
      closeEmitExpense(true);
      return;
    }
    if (createUserModal && createUserModal.style.display !== 'none') {
      closeCreateUserModalFn(true);
      return;
    }
    if (blockCourtModal && blockCourtModal.style.display !== 'none') {
      closeBlockCourtModalFn(true);
      return;
    }
    if (broadcastAlertModal && broadcastAlertModal.style.display !== 'none') {
      closeBroadcastAlertModalFn(true);
      return;
    }
    if (profileModal && profileModal.style.display !== 'none') {
      closeProfileModalFn(true);
      return;
    }
    if (scanQrModal && scanQrModal.style.display !== 'none') {
      stopQrScanner(true);
      return;
    }

    if (dashboardScreen && dashboardScreen.classList.contains('active')) {
      let targetView = e.state?.view || (window.location.hash ? window.location.hash.replace('#', '') : 'home');
      if (['qr-modal', 'notificaciones', 'nueva-publicacion', 'emitir-expensas', 'escanear-qr', 'nuevo-vecino', 'bloquear-cancha', 'alerta-comunitaria', 'mi-perfil'].includes(targetView)) {
        targetView = 'home';
      }
      setDashboardView(targetView, false);
    }
  });

  // Listen to session expiry
  window.addEventListener('auth:expired', () => {
    handleLogout();
    showToast('Tu sesión ha expirado. Por favor ingresá nuevamente.');
  });
}

async function initApp() {
  attachEventListeners();
  updateDateControls();

  if (visitDateField) visitDateField.value = getTodayISO();

  // Check persistent session with server
  const token = API.getToken();
  if (token) {
    try {
      const data = await API.auth.me();
      state.authenticatedUser = data.user;
      enterDashboard();
      return;
    } catch (error) {
      API.clearToken();
      console.warn('Existing token invalid or expired.');
    }
  }

  // If no token or invalid session:
  setAuthView('login');
}

document.addEventListener('DOMContentLoaded', initApp);
