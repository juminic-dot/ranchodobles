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
  pendingUsers: [],
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
const adminNavBtn = document.getElementById('adminNavBtn');
const adminPendingCountBadge = document.getElementById('adminPendingCountBadge');
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

function setDashboardView(view) {
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
  if (adminNavBtn) adminNavBtn.style.display = isAdmin ? 'inline-flex' : 'none';
  if (adminNewsActions) adminNewsActions.style.display = isAdmin ? 'block' : 'none';

  const homeAdminBtn = document.getElementById('homeAdminBtn');
  if (homeAdminBtn) homeAdminBtn.style.display = isAdmin ? 'flex' : 'none';
}

function toggleNotificationsPanel(forceOpen) {
  if (!notificationPanel) return;
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !notificationPanel.classList.contains('open');
  notificationPanel.classList.toggle('open', shouldOpen);
  if (notificationBackdrop) {
    notificationBackdrop.classList.toggle('open', shouldOpen);
  }
  document.body.classList.toggle('notification-open', shouldOpen);
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

function getInvitationUrl() {
  const hostId = state.authenticatedUser?.id || '';
  const hostName = encodeURIComponent(`${state.authenticatedUser?.nombre || ''} ${state.authenticatedUser?.apellido || ''}`.trim());
  const origin = window.location.origin;
  const path = window.location.pathname.replace(/index\.html$/, '').replace(/\/$/, '');
  return `${origin}${path}/invitacion.html?host=${hostId}&name=${hostName}`;
}

function openGmailInvite() {
  const inviteUrl = getInvitationUrl();
  const residentName = `${state.authenticatedUser?.nombre || ''} ${state.authenticatedUser?.apellido || ''}`.trim();
  const subject = `Invitación de acceso a Rancho Doble S — ${residentName}`;
  const body = `Hola!\n\nTe envío esta invitación para ingresar al predio Rancho Doble S.\n\nPor favor completá tus datos en el formulario de acreditación:\n${inviteUrl}\n\nIngresá con: apellido, nombre, DNI y patente de tu vehículo.\nUna vez registrado, el sistema te devolverá tu código QR de acceso con la indicación:\n“Este es tu código QR para el ingreso al predio, presentalo en la guardia de ingreso”\n\nSaludos,\n${residentName}`;

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const win = window.open(gmailUrl, '_blank');
  if (!win) {
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
}

function openWhatsAppInvite() {
  const inviteUrl = getInvitationUrl();
  const residentName = `${state.authenticatedUser?.nombre || ''} ${state.authenticatedUser?.apellido || ''}`.trim();
  const message = `Hola! Te envío la invitación para ingresar a Rancho Doble S (de parte de ${residentName}).\n\nCompletá tus datos (apellido, nombre, DNI y patente del vehículo) en este enlace:\n${inviteUrl}\n\nAl registrarte recibirás tu código QR con el siguiente texto: “Este es tu código QR para el ingreso al predio, presentalo en la guardia de ingreso”.`;

  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  window.open(waUrl, '_blank');
}

function copyInviteLink(buttonElement) {
  const inviteUrl = getInvitationUrl();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      showToast('Enlace de invitación copiado al portapapeles.');
      if (buttonElement) {
        const original = buttonElement.innerHTML;
        buttonElement.innerHTML = '✅ Copiado';
        setTimeout(() => {
          buttonElement.innerHTML = original;
        }, 2200);
      }
    }).catch(() => {
      fallbackCopy(inviteUrl);
    });
  } else {
    fallbackCopy(inviteUrl);
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

  // QR image
  const qrSrc = visit.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`RDS-PASS|VISITANTE:${visit.visitorName}|DNI:${visit.visitorDni}|PATENTE:${visit.vehiclePlate || 'Sin vehículo'}|FECHA:${visit.date}`)}`;
  if (modalQrImage) {
    modalQrImage.src = qrSrc;
  }

  if (downloadModalQrBtn) {
    downloadModalQrBtn.href = qrSrc;
    downloadModalQrBtn.download = `qr-pase-${(visit.visitorName || 'visita').replace(/\s+/g, '-').toLowerCase()}.png`;
  }

  if (shareModalQrWhatsAppBtn) {
    shareModalQrWhatsAppBtn.onclick = () => {
      const msg = `Hola ${visit.visitorName}! Este es tu pase de acceso a Rancho Doble S para el ${visit.date} a las ${visit.time} hs.\n\n“Este es tu código QR para el ingreso al predio, presentalo en la guardia de ingreso”`;
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
    };
  }

  viewQrModal.style.display = 'grid';
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
    if (expenseCurrentStatus) {
      expenseCurrentStatus.textContent = latest.status;
      expenseCurrentStatus.className = `visit-status ${isPending ? 'pending' : 'confirmed'}`;
    }

    if (payExpenseBtn) {
      if (isPending) {
        payExpenseBtn.style.display = 'inline-block';
        payExpenseBtn.textContent = 'Informar Pago';
        payExpenseBtn.onclick = () => handlePayExpense(latest.id);
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
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <strong>${escapeHTML(item.period)} — $ ${Number(item.amount).toLocaleString('es-AR')}</strong>
                <small>${escapeHTML(item.concept || 'Expensas ordinarias')} · Vencimiento: ${escapeHTML(item.dueDate)}</small>
              </div>
              <div class="visit-actions">
                ${item.status === 'Pendiente' ? `
                  <button type="button" class="btn-inline-action success pay-item-btn" data-id="${item.id}">Informar Pago</button>
                ` : `
                  <span class="btn-inline-action" style="cursor: default;">Pagado</span>
                `}
              </div>
            </div>
            <div class="visit-meta">
              <span>Registrado</span>
              <em class="visit-status ${item.status === 'Pendiente' ? 'pending' : 'confirmed'}">${escapeHTML(item.status)}</em>
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
  if (!confirm('¿Deseas informar el pago de este periodo?')) return;
  try {
    await API.expenses.pay(expenseId);
    showToast('Pago informado correctamente.');
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

  if (bookingDateInput) bookingDateInput.value = state.selectedBookingDate;
  if (btnDateToday) btnDateToday.classList.toggle('active', state.selectedBookingDate === today);
  if (btnDateTomorrow) btnDateTomorrow.classList.toggle('active', state.selectedBookingDate === tomorrow);
}

// ----------------- ADMIN ----------------- //

async function loadAdminData() {
  if (state.authenticatedUser?.role !== 'admin') return;

  try {
    const [stats, pendingUsers, allVisits] = await Promise.all([
      API.admin.getStats(),
      API.admin.getUsers('pending'),
      API.visits.get({ all: 'true' })
    ]);

    state.adminStats = stats;
    state.pendingUsers = pendingUsers;
    state.adminVisits = allVisits;

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

  // Pending count badge in nav and home hub
  const pendingCount = state.pendingUsers.length;
  if (adminPendingCountBadge) {
    adminPendingCountBadge.textContent = pendingCount;
    adminPendingCountBadge.style.display = pendingCount > 0 ? 'inline-flex' : 'none';
  }
  const homeAdminPendingBadge = document.getElementById('homeAdminPendingBadge');
  if (homeAdminPendingBadge) {
    homeAdminPendingBadge.textContent = `${pendingCount} pendiente${pendingCount === 1 ? '' : 's'}`;
    homeAdminPendingBadge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
  }
  if (adminPendingStatusCount) {
    adminPendingStatusCount.textContent = `${pendingCount} pendiente${pendingCount === 1 ? '' : 's'}`;
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
    if (!state.adminVisits || state.adminVisits.length === 0) {
      adminVisitsList.innerHTML = `
        <li class="visit-item">
          <div>
            <strong>Sin visitas registradas</strong>
            <small>No hay registros de visitas en el sistema.</small>
          </div>
        </li>
      `;
    } else {
      adminVisitsList.innerHTML = state.adminVisits
        .slice(0, 30)
        .map((visit) => `
          <li class="visit-item">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; flex-wrap: wrap;">
              <div>
                <strong>${escapeHTML(visit.visitorName)} <small>(Visita a ${escapeHTML(visit.residentName)})</small></strong>
                <small>DNI ${escapeHTML(visit.visitorDni)} · Patente: <strong>${escapeHTML(visit.vehiclePlate || 'Sin vehículo')}</strong></small>
              </div>
              <div class="visit-actions" style="display: flex; gap: 0.4rem; align-items: center;">
                <button type="button" class="btn-inline-action admin-view-visit-qr-btn" data-id="${visit.id}" title="Ver Pase QR">📱 Ver QR</button>
                ${visit.status !== 'Ingresado' ? `
                  <button type="button" class="btn-inline-action success mark-ingreso-btn" data-id="${visit.id}">Marcar Ingreso</button>
                ` : ''}
              </div>
            </div>
            <div class="visit-meta">
              <span>📅 ${escapeHTML(visit.date)} a las ${escapeHTML(visit.time)} hs</span>
              <em class="visit-status ${visit.status === 'Ingresado' ? 'confirmed' : 'pending'}">${escapeHTML(visit.status)}</em>
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
    }
  }
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
  showToast('Sesión cerrada correctamente.');
}

function enterDashboard() {
  renderUserProfile();
  authScreen.classList.add('hidden');
  authScreen.style.display = 'none';
  dashboardScreen.classList.add('active');

  setDashboardView('home');
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
  if (openCreateNewsModalBtn) {
    openCreateNewsModalBtn.addEventListener('click', () => {
      createNewsModal.style.display = 'grid';
    });
  }

  if (closeCreateNewsModal) {
    closeCreateNewsModal.addEventListener('click', () => {
      createNewsModal.style.display = 'none';
    });
  }

  if (cancelCreateNewsBtn) {
    cancelCreateNewsBtn.addEventListener('click', () => {
      createNewsModal.style.display = 'none';
    });
  }

  if (createNewsForm) {
    createNewsForm.addEventListener('submit', handleCreateNews);
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

  // QR Modal close handlers
  if (closeViewQrModal) {
    closeViewQrModal.addEventListener('click', () => {
      if (viewQrModal) viewQrModal.style.display = 'none';
    });
  }
  if (viewQrModal) {
    viewQrModal.addEventListener('click', (e) => {
      if (e.target === viewQrModal) viewQrModal.style.display = 'none';
    });
  }

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
