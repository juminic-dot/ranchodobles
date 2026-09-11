const STORAGE_KEYS = {
  users: 'ranchodobles_users',
  bookings: 'ranchodobles_bookings',
  notifications: 'ranchodobles_notifications',
  userVisits: 'ranchodobles_user_visits'
};

const defaultUser = {
  id: 'user-1',
  apellido: 'Sánchez',
  nombre: 'Lucía',
  tipoDocumento: 'DNI',
  numeroDocumento: '30123456',
  telefono: '1123456789',
  username: 'lucia',
  email: 'lucia@ranchodobles.com',
  password: '123456',
  approved: true
};

const adminUser = {
  id: 'admin-1',
  apellido: 'Administrador',
  nombre: 'Admin',
  tipoDocumento: 'DNI',
  numeroDocumento: '00000000',
  telefono: '1100000000',
  username: 'admin',
  email: 'admin@ranchodobles.com',
  password: 'admin123',
  approved: true,
  role: 'admin'
};

const commonUser = {
  id: 'user-2',
  apellido: 'García',
  nombre: 'Nicolás',
  tipoDocumento: 'DNI',
  numeroDocumento: '40222333',
  telefono: '1166677788',
  username: 'nicolas',
  email: 'nicolas@gmail.com',
  password: '123456',
  approved: true
};

const builtInUsers = [defaultUser, adminUser, commonUser];

const defaultBookings = [
  { id: '07:00 - 08:00', slot: '07:00 - 08:00', occupant: 'Gimenez', status: 'booked' },
  { id: '10:00 - 11:00', slot: '10:00 - 11:00', occupant: 'Mendoza', status: 'booked' },
  { id: '15:00 - 16:00', slot: '15:00 - 16:00', occupant: 'Martinez', status: 'booked' },
  { id: '16:00 - 17:00', slot: '16:00 - 17:00', occupant: 'Ruiz', status: 'booked' },
  { id: '17:00 - 18:00', slot: '17:00 - 18:00', occupant: 'Lopez', status: 'booked' },
  { id: '18:00 - 19:00', slot: '18:00 - 19:00', occupant: 'Varela', status: 'booked' },
  { id: '19:00 - 20:00', slot: '19:00 - 20:00', occupant: 'Pereyra', status: 'booked' }
];

function mergeBookings(savedBookings) {
  const merged = [...defaultBookings, ...(Array.isArray(savedBookings) ? savedBookings : [])];
  const seen = new Map();

  merged.forEach((booking) => {
    const key = booking.id || booking.slot;
    if (!seen.has(key)) {
      seen.set(key, booking);
    }
  });

  return [...seen.values()];
}

const defaultNotifications = [
  {
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-n1',
    title: 'Mantenimiento programado',
    text: 'Se realizará mantenimiento del portón principal el viernes a las 10:00 hs.',
    time: 'Hace 15 min',
    read: false
  },
  {
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-n2',
    title: 'Reserva confirmada',
    text: 'Tu reserva de cancha para mañana a las 18:00 hs fue confirmada.',
    time: 'Hace 1 hora',
    read: false
  },
  {
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-n3',
    title: 'Novedad de administración',
    text: 'La reunión vecinal se realizará este miércoles a las 20:00 hs.',
    time: 'Ayer',
    read: true
  }
];

function getInitialUsers() {
  const savedUsers = loadStorage(STORAGE_KEYS.users, builtInUsers);
  const mergedUsers = [...builtInUsers, ...savedUsers.filter((user) => !builtInUsers.some((builtUser) => builtUser.email.toLowerCase() === user.email.toLowerCase()))];
  return mergedUsers;
}

const defaultPredioNews = [
  {
    title: 'Inauguracion de la nueva cancha de voley del predio!! Los esperamos con las reservas.',
    category: 'Infraestructura',
    date: '2026-09-12',
    status: 'Nueva',
    description: 'La inauguración de la nueva cancha de voley del predio!! Los esperamos con las reservas.',
    image: 'https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Se terminó la obra de iluminación del ingreso por Solís.',
    category: 'Seguridad',
    date: '2026-09-11',
    status: 'Actualizado',
    description: 'Quedó finalizada la obra de iluminación del ingreso por Solís, mejorando la visibilidad y la seguridad del acceso al predio.',
    image: './descarga.jfif'
  }
];

const defaultUserVisits = [
  {
    userId: defaultUser.id,
    userEmail: defaultUser.email,
    name: 'María López',
    dni: '24.222.333',
    date: '2026-09-12',
    time: '18:30',
    status: 'Confirmada'
  },
  {
    userId: defaultUser.id,
    userEmail: defaultUser.email,
    name: 'José Martínez',
    dni: '28.556.441',
    date: '2026-09-15',
    time: '12:00',
    status: 'Pendiente'
  }
];

const state = {
  authenticatedUser: null,
  activeAuthView: 'login',
  activeDashboardView: 'visits',
  bookingFilter: 'all',
  bookings: mergeBookings(loadStorage(STORAGE_KEYS.bookings, defaultBookings)),
  notifications: loadStorage(STORAGE_KEYS.notifications, defaultNotifications),
  users: getInitialUsers(),
  newsItems: [...defaultPredioNews],
  userVisits: loadStorage(STORAGE_KEYS.userVisits, defaultUserVisits).map((visit) => ({
    ...visit,
    userId: visit.userId || defaultUser.id,
    userEmail: visit.userEmail || defaultUser.email
  }))
};

const authTabs = document.querySelectorAll('.auth-tab');
const authForms = document.querySelectorAll('.auth-form');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const registerStatus = document.getElementById('registerStatus');
const dashboardScreen = document.getElementById('dashboardScreen');
const authScreen = document.getElementById('authScreen');
const notificationPanel = document.getElementById('notificationPanel');
const notificationList = document.getElementById('notificationList');
const bookingGrid = document.getElementById('bookingGrid');
const visitForm = document.getElementById('visitForm');
const toast = document.getElementById('toast');
const userFullName = document.getElementById('userFullName');
const userInitials = document.getElementById('userInitials');
const notificationBadge = document.getElementById('notificationBadge');
const statNotifications = document.getElementById('statNotifications');
const userVisitsList = document.getElementById('userVisitsList');
const predioNewsList = document.getElementById('predioNewsList');

const timeSlots = [
  '07:00 - 08:00', '08:00 - 09:00', '09:00 - 10:00', '10:00 - 11:00',
  '11:00 - 12:00', '12:00 - 13:00', '13:00 - 14:00', '14:00 - 15:00',
  '15:00 - 16:00', '16:00 - 17:00', '17:00 - 18:00', '18:00 - 19:00',
  '19:00 - 20:00', '20:00 - 21:00', '21:00 - 22:00'
];

function loadStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function saveStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
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
    news: 'newsSection',
    visits: 'myVisitsSection',
    booking: 'bookingSection'
  };

  document.querySelectorAll('.content-section').forEach((section) => {
    section.classList.toggle('active', section.id === sectionMap[view]);
  });
}

function renderUserProfile() {
  if (!state.authenticatedUser) return;

  const user = state.authenticatedUser;
  const initials = `${user.nombre[0] || ''}${user.apellido[0] || ''}`.toUpperCase();
  userFullName.textContent = `${user.nombre} ${user.apellido}`;
  userInitials.textContent = initials;
}

function getUnreadNotificationsCount() {
  return state.notifications.filter((notification) => !notification.read).length;
}

function renderNotifications() {
  const unreadCount = getUnreadNotificationsCount();

  if (notificationBadge) {
    notificationBadge.textContent = unreadCount;
    notificationBadge.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
  }

  if (statNotifications) {
    statNotifications.textContent = state.notifications.length;
  }

  notificationList.innerHTML = state.notifications
    .map(
      (notification) => `
        <li class="notification-item ${notification.read ? '' : 'unread'}">
          <strong>${notification.title}</strong>
          <small>${notification.time}</small>
          <p>${notification.text}</p>
        </li>
      `
    )
    .join('');
}

function renderPredioNews() {
  if (!predioNewsList) return;

  const news = state.newsItems.length ? state.newsItems : [{
    title: 'Sin novedades por el momento',
    category: 'Actualización',
    date: '-',
    status: 'Sin registro',
    description: 'No hay publicaciones del sector de administración cargadas.',
    image: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80'
  }];

  predioNewsList.innerHTML = news
    .map(
      (item) => `
        <li class="news-card">
          <img src="${item.image || 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80'}" alt="${item.title || 'Novedad del predio'}" />
          <div class="news-content">
            <span class="news-category">${item.category || 'Novedad'}</span>
            <strong>${item.title || item.name}</strong>
            <small>${item.date || '-'} · ${item.status || 'Aviso'}</small>
            <p>${item.description || ''}</p>
          </div>
        </li>
      `
    )
    .join('');
}

function renderUserVisits() {
  if (!userVisitsList) return;

  const currentUserId = state.authenticatedUser?.id;
  const currentUserEmail = state.authenticatedUser?.email?.toLowerCase();

  const visits = state.userVisits.filter((item) => {
    const itemUserId = item.userId ? String(item.userId) : '';
    const itemUserEmail = typeof item.userEmail === 'string' ? item.userEmail.toLowerCase() : '';

    if (currentUserId && itemUserId === String(currentUserId)) return true;
    if (currentUserEmail && itemUserEmail === currentUserEmail) return true;
    return false;
  });

  const displayVisits = visits.length ? visits : [{
    name: 'Sin visitas registradas',
    dni: '',
    date: '-',
    time: '-',
    status: 'Sin registro'
  }];

  userVisitsList.innerHTML = displayVisits
    .map(
      (item) => `
        <li class="visit-item">
          <div>
            <strong>${item.name}</strong>
            <small>${item.dni ? `DNI ${item.dni}` : 'Sin DNI'}</small>
          </div>
          <div class="visit-meta">
            <span>${item.date || '-'} · ${item.time || '-'}</span>
            <em class="visit-status ${item.status === 'Confirmada' ? 'confirmed' : item.status === 'Pendiente' ? 'pending' : 'neutral'}">${item.status || 'Sin estado'}</em>
          </div>
        </li>
      `
    )
    .join('');
}

function markAllNotificationsRead() {
  state.notifications = state.notifications.map((notification) => ({ ...notification, read: true }));
  saveStorage(STORAGE_KEYS.notifications, state.notifications);
  renderNotifications();
}

function toggleNotificationsPanel(forceOpen) {
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !notificationPanel.classList.contains('open');
  notificationPanel.classList.toggle('open', shouldOpen);
}

function getFilteredBookings() {
  const currentUserName = state.authenticatedUser?.apellido || '';
  const now = new Date();
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

  return timeSlots
    .filter((slot) => {
      const [startHour, , endHour] = slot.split(/[:\s-]+/).filter(Boolean);
      const startMinutes = Number(startHour) * 60;
      const endMinutes = Number(endHour) * 60;
      return endMinutes > currentTimeMinutes && startMinutes >= 0;
    })
    .map((slot) => {
      const booking = state.bookings.find((item) => item.id === slot || item.slot === slot) || null;
      const isBooked = Boolean(booking);
      const isActive = isBooked && booking.occupant === currentUserName;
      const isReserved = isBooked;

      if (state.bookingFilter === 'free' && isBooked) return null;
      if (state.bookingFilter === 'reserved' && !isReserved) return null;
      if (state.bookingFilter === 'all') {
        return { slot, booking, isBooked, isActive, isReserved };
      }

      return { slot, booking, isBooked, isActive, isReserved };
    })
    .filter(Boolean);
}

function updateBookingFilterButtons() {
  document.querySelectorAll('.booking-filter').forEach((button) => {
    const isActive = button.dataset.filter === state.bookingFilter;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });
}

function generateBookingSlots() {
  const filteredSlots = getFilteredBookings();

  bookingGrid.innerHTML = filteredSlots
    .map(({ slot, booking, isBooked, isActive }) => {
      const statusText = state.bookingFilter === 'free'
        ? 'Libre'
        : state.bookingFilter === 'reserved' && isBooked
          ? 'Reservada'
          : isBooked
            ? booking.occupant
            : 'Disponible';

      if (isActive) {
        return `
          <div class="booking-slot booked my-booking" data-slot="${slot}" aria-label="Tu horario reservado">
            <strong>${slot}</strong>
            <small>Tu reserva</small>
            <button type="button" class="cancel-booking-btn" data-slot="${slot}">Cancelar</button>
          </div>
        `;
      }

      return `
        <button
          type="button"
          class="booking-slot ${isBooked ? 'booked' : 'free'}"
          data-slot="${slot}"
          ${isBooked ? 'disabled' : ''}
          aria-label="${isBooked ? 'Horario reservado' : 'Reservar horario'}"
        >
          <strong>${slot}</strong>
          <small>${statusText}</small>
        </button>
      `;
    })
    .join('');

  bookingGrid.querySelectorAll('.booking-slot.free').forEach((slotButton) => {
    slotButton.addEventListener('click', () => reserveSlot(slotButton.dataset.slot));
  });

  bookingGrid.querySelectorAll('.cancel-booking-btn').forEach((cancelButton) => {
    cancelButton.addEventListener('click', (event) => {
      event.stopPropagation();
      cancelReservation(cancelButton.dataset.slot);
    });
  });
}

function cancelReservation(slotKey) {
  if (!state.authenticatedUser) {
    showToast('Debes iniciar sesión para cancelar una reserva.');
    return;
  }

  const booking = state.bookings.find((item) => item.id === slotKey || item.slot === slotKey);
  if (!booking) {
    showToast('La reserva no existe.');
    return;
  }

  if (booking.occupant !== state.authenticatedUser.apellido) {
    showToast('Solo podés cancelar una reserva realizada por vos.');
    return;
  }

  state.bookings = state.bookings.filter((item) => item.id !== slotKey && item.slot !== slotKey);
  saveStorage(STORAGE_KEYS.bookings, state.bookings);
  generateBookingSlots();
  showToast(`Reserva de ${slotKey} cancelada.`);
}

function reserveSlot(slotKey) {
  if (!state.authenticatedUser) {
    showToast('Debes iniciar sesión para reservar una cancha.');
    return;
  }

  const slotAlreadyTaken = state.bookings.some((booking) => booking.id === slotKey);
  if (slotAlreadyTaken) {
    showToast('Este horario ya está reservado.');
    return;
  }

  const booking = {
    id: slotKey,
    slot: slotKey,
    occupant: state.authenticatedUser.apellido,
    status: 'booked'
  };

  state.bookings = [...state.bookings, booking];
  saveStorage(STORAGE_KEYS.bookings, state.bookings);
  generateBookingSlots();
  showToast(`Horario ${slotKey} reservado a nombre de ${state.authenticatedUser.apellido}.`);
}

function handleLogin(event) {
  event.preventDefault();

  const formData = new FormData(loginForm);
  const loginInput = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '').trim();
  const normalizedInput = loginInput.toLowerCase();

  const user = state.users.find((item) => {
    if (!item.approved || item.password !== password) return false;

    const usernameMatches = (item.username || '').toLowerCase() === normalizedInput;
    const emailMatches = (item.email || '').toLowerCase() === normalizedInput;
    const fullNameMatches = `${item.nombre} ${item.apellido}`.toLowerCase() === normalizedInput;

    return usernameMatches || emailMatches || fullNameMatches;
  });

  if (!user) {
    showToast('Credenciales inválidas o usuario pendiente de aprobación.');
    return;
  }

  state.authenticatedUser = user;
  renderUserProfile();
  renderUserVisits();
  authScreen.classList.add('hidden');
  authScreen.style.display = 'none';
  dashboardScreen.classList.add('active');
  toggleNotificationsPanel(false);
  showToast(`Bienvenido ${user.nombre} ${user.apellido}.`);
}

function handleRegister(event) {
  event.preventDefault();
  registerStatus.textContent = '';

  const formData = new FormData(registerForm);
  const values = Object.fromEntries(formData.entries());

  const requiredFields = [
    'apellido', 'nombre', 'tipoDocumento', 'numeroDocumento', 'telefono', 'email', 'password', 'confirmPassword'
  ];

  const missingField = requiredFields.find((field) => !String(values[field] || '').trim());
  if (missingField) {
    registerStatus.textContent = 'Completa todos los campos obligatorios.';
    return;
  }

  if (values.password !== values.confirmPassword) {
    registerStatus.textContent = 'Las contraseñas no coinciden.';
    return;
  }

  const alreadyExists = state.users.some(
    (user) => user.email.toLowerCase() === String(values.email).trim().toLowerCase()
  );

  if (alreadyExists) {
    registerStatus.textContent = 'Ya existe un usuario con ese email.';
    return;
  }

  const newUser = {
    id: `user-${Date.now()}`,
    apellido: String(values.apellido).trim(),
    nombre: String(values.nombre).trim(),
    tipoDocumento: String(values.tipoDocumento).trim(),
    numeroDocumento: String(values.numeroDocumento).trim(),
    telefono: String(values.telefono).trim(),
    email: String(values.email).trim(),
    password: String(values.password).trim(),
    approved: false
  };

  state.users = [...state.users, newUser];
  saveStorage(STORAGE_KEYS.users, state.users);
  registerForm.reset();
  registerStatus.textContent = 'Pendiente de aprobación por la administración.';
  showToast('Solicitud de registro enviada.');
}

function handleVisit(event) {
  event.preventDefault();

  const formData = new FormData(visitForm);
  const visitName = String(formData.get('visitName') || '').trim();
  const visitDni = String(formData.get('visitDni') || '').trim();
  const visitDate = String(formData.get('visitDate') || '').trim();
  const visitTime = String(formData.get('visitTime') || '').trim();

  if (!visitName || !visitDni || !visitDate || !visitTime) {
    showToast('Completá todos los campos de la visita.');
    return;
  }

  const newNotification = {
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-visit',
    title: 'Aviso de ingreso registrado',
    text: `${visitName} (DNI ${visitDni}) tiene ingreso previsto para ${visitDate} a las ${visitTime}.`,
    time: 'Ahora',
    read: false
  };

  const visitEntry = {
    userId: state.authenticatedUser?.id || 'guest',
    userEmail: state.authenticatedUser?.email || '',
    name: visitName,
    dni: visitDni,
    date: visitDate,
    time: visitTime,
    status: 'Pendiente'
  };

  state.notifications = [newNotification, ...state.notifications];
  state.userVisits = [visitEntry, ...state.userVisits];
  saveStorage(STORAGE_KEYS.notifications, state.notifications);
  saveStorage(STORAGE_KEYS.userVisits, state.userVisits);
  renderNotifications();
  renderUserVisits();
  visitForm.reset();
  showToast('Visita registrada correctamente.');
}

function attachEventListeners() {
  authTabs.forEach((tab) => {
    tab.addEventListener('click', () => setAuthView(tab.dataset.authView));
  });

  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
  if (visitForm) visitForm.addEventListener('submit', handleVisit);

  document.querySelectorAll('.nav-link').forEach((button) => {
    button.addEventListener('click', () => setDashboardView(button.dataset.view));
  });

  document.querySelectorAll('.booking-filter').forEach((button) => {
    button.addEventListener('click', () => {
      state.bookingFilter = button.dataset.filter;
      updateBookingFilterButtons();
      generateBookingSlots();
    });
  });

  const notificationsToggle = document.getElementById('notificationsToggle');
  const closeNotifications = document.getElementById('closeNotifications');
  const markAllRead = document.getElementById('markAllRead');

  if (notificationsToggle) notificationsToggle.addEventListener('click', () => toggleNotificationsPanel());
  if (closeNotifications) closeNotifications.addEventListener('click', () => toggleNotificationsPanel(false));
  if (markAllRead) markAllRead.addEventListener('click', markAllNotificationsRead);
}

function initApp() {
  attachEventListeners();
  setAuthView('login');
  setDashboardView('news');
  updateBookingFilterButtons();
  renderNotifications();
  generateBookingSlots();
  renderPredioNews();
  renderUserVisits();
  renderUserProfile();

  if (visitForm) {
    const dateField = visitForm.querySelector('input[name="visitDate"]');
    if (dateField) {
      const today = new Date();
      const isoDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      dateField.value = isoDate;
    }
  }
}

initApp();
