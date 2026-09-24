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
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function getTomorrowISO() {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(tomorrow);
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
  newsUploadedImageBase64: null,
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
  adminStats: null,
  selectedReceiptFile: null,
  activeViewingExpense: null,
  activeAdminTab: 'vecinos',
  activeVecinosSubtab: 'activos',
  activeGuardAdminSubtab: 'accesos',
  guardVisits: [],
  guardVisitsFilter: 'all',
  guardPlateQuery: '',
  guardActivityLogs: [],
  adminGuardLogs: [],
  adminAuditLogs: [],
  adminAuditRoleFilter: 'all',
  adminAuditSearchQuery: '',
  notificationRoleFilter: 'all',
  residentNotices: [],
  activeNoticeCategory: 'Delivery',
  guardNotices: [],
  guardNoticeFilter: 'all',
  guardResidentsList: [],
  selectedNotifyResidentId: null,
  adminExpensesSearchQuery: '',
  adminNotifyResidentsSearchQuery: '',
  adminNotifySelectedResidents: new Set()
};

// DOM Elements
const authScreen = document.getElementById('authScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const authTabs = document.querySelectorAll('.auth-tab');
const authForms = document.querySelectorAll('.auth-form');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const registerStatus = document.getElementById('registerStatus');
const registerLote = document.getElementById('registerLote');
const registerManzana = document.getElementById('registerManzana');
const registerUsernamePreview = document.getElementById('registerUsernamePreview');
const registerUsernamePreviewText = document.getElementById('registerUsernamePreviewText');
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
const notificationRoleFilterBar = document.getElementById('notificationRoleFilterBar');
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
const newsImageFileInput = document.getElementById('newsImageFileInput');
const newsImagePreviewContainer = document.getElementById('newsImagePreviewContainer');
const newsImagePreview = document.getElementById('newsImagePreview');
const removeNewsImageBtn = document.getElementById('removeNewsImageBtn');
const newsImageInput = document.getElementById('newsImageInput');

// Admin DOM
const pendingUsersList = document.getElementById('pendingUsersList');
const adminPendingStatusCount = document.getElementById('adminPendingStatusCount');
const adminVisitsList = document.getElementById('adminVisitsList');
const refreshAdminVisitsBtn = document.getElementById('refreshAdminVisitsBtn');
const statTotalUsers = document.getElementById('statTotalUsers');
const statPendingUsers = document.getElementById('statPendingUsers');
const statTodayVisits = document.getElementById('statTodayVisits');
const adminNavPendingBadge = document.getElementById('adminNavPendingBadge');
const adminNavGuardBadge = document.getElementById('adminNavGuardBadge');

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

// Guard Dedicated DOM Elements (@guardia)
const guardSection = document.getElementById('guardSection');
const guardOperatorName = document.getElementById('guardOperatorName');
const guardOperatorUser = document.getElementById('guardOperatorUser');
const guardTopbarLogoutBtn = document.getElementById('guardTopbarLogoutBtn');
const guardScanQrBtn = document.getElementById('guardScanQrBtn');
const guardSearchPlateBtn = document.getElementById('guardSearchPlateBtn');
const guardNotificationsBtn = document.getElementById('guardNotificationsBtn');
const guardShiftChangeBtn = document.getElementById('guardShiftChangeBtn');
const guardVehiclesInsideBadge = document.getElementById('guardVehiclesInsideBadge');
const guardNotifBadge = document.getElementById('guardNotifBadge');
const guardVisitsCountBadge = document.getElementById('guardVisitsCountBadge');
const guardPlateSearchInput = document.getElementById('guardPlateSearchInput');
const guardVisitsList = document.getElementById('guardVisitsList');
const refreshGuardVisitsBtn = document.getElementById('refreshGuardVisitsBtn');
const guardLogsCountBadge = document.getElementById('guardLogsCountBadge');
const refreshGuardLogsBtn = document.getElementById('refreshGuardLogsBtn');
const guardActivityLogsList = document.getElementById('guardActivityLogsList');
const adminGuardLogsList = document.getElementById('adminGuardLogsList');
const refreshAdminGuardLogsBtn = document.getElementById('refreshAdminGuardLogsBtn');
const adminGuardAccesosSubpanel = document.getElementById('adminGuardAccesosSubpanel');
const adminGuardAuditoriaSubpanel = document.getElementById('adminGuardAuditoriaSubpanel');
const adminAuditLogsCountBadge = document.getElementById('adminAuditLogsCountBadge');
const refreshAdminAuditLogsBtn = document.getElementById('refreshAdminAuditLogsBtn');
const adminAuditSearchInput = document.getElementById('adminAuditSearchInput');
const adminGlobalAuditLogsList = document.getElementById('adminGlobalAuditLogsList');
const adminGoToAuditFromGuardBtn = document.getElementById('adminGoToAuditFromGuardBtn');

// Resident Avisos a Guardia DOM Elements
const guardNoticesSection = document.getElementById('guardNoticesSection');
const guardNoticeForm = document.getElementById('guardNoticeForm');
const guardNoticeCategoryInput = document.getElementById('guardNoticeCategoryInput');
const selectedNoticeCategoryBadge = document.getElementById('selectedNoticeCategoryBadge');
const guardNoticeCompanyInput = document.getElementById('guardNoticeCompanyInput');
const guardNoticeCompanyLabel = document.getElementById('guardNoticeCompanyLabel');
const guardNoticeTimeInput = document.getElementById('guardNoticeTimeInput');
const guardNoticeDetailsInput = document.getElementById('guardNoticeDetailsInput');
const submitGuardNoticeBtn = document.getElementById('submitGuardNoticeBtn');
const residentNoticesCountBadge = document.getElementById('residentNoticesCountBadge');
const residentNoticesList = document.getElementById('residentNoticesList');
const refreshResidentNoticesBtn = document.getElementById('refreshResidentNoticesBtn');

// Guard Resident Notices Subpanel DOM Elements
const guardResidentNoticesBtn = document.getElementById('guardResidentNoticesBtn');
const guardResidentNoticesBadge = document.getElementById('guardResidentNoticesBadge');
const guardResidentNoticesBlock = document.getElementById('guardResidentNoticesBlock');
const guardResidentNoticesCountBadge = document.getElementById('guardResidentNoticesCountBadge');
const guardOpenNotifyResidentTopBtn = document.getElementById('guardOpenNotifyResidentTopBtn');
const refreshGuardResidentNoticesBtn = document.getElementById('refreshGuardResidentNoticesBtn');
const guardResidentNoticesList = document.getElementById('guardResidentNoticesList');

// Guard Notify Resident Modal DOM Elements
const guardNotifyResidentBtn = document.getElementById('guardNotifyResidentBtn');
const guardNotifyResidentModal = document.getElementById('guardNotifyResidentModal');
const closeGuardNotifyResidentModal = document.getElementById('closeGuardNotifyResidentModal');
const cancelGuardNotifyBtn = document.getElementById('cancelGuardNotifyBtn');
const guardNotifyResidentForm = document.getElementById('guardNotifyResidentForm');
const guardNotifyTargetSelect = document.getElementById('guardNotifyTargetSelect');
const guardNotifySelectedNeighborInfo = document.getElementById('guardNotifySelectedNeighborInfo');
const guardNotifyNeighborName = document.getElementById('guardNotifyNeighborName');
const guardNotifyNeighborLocation = document.getElementById('guardNotifyNeighborLocation');
const guardNotifyNeighborPhone = document.getElementById('guardNotifyNeighborPhone');
const guardNotifyPresetSelect = document.getElementById('guardNotifyPresetSelect');
const guardNotifyTitleInput = document.getElementById('guardNotifyTitleInput');
const guardNotifyMessageInput = document.getElementById('guardNotifyMessageInput');
const submitGuardNotifyBtn = document.getElementById('submitGuardNotifyBtn');

// Resident Pay Expense Modal DOM
const payExpenseModal = document.getElementById('payExpenseModal');
const closePayExpenseModal = document.getElementById('closePayExpenseModal');
const cancelPayExpenseBtn = document.getElementById('cancelPayExpenseBtn');
const payExpenseForm = document.getElementById('payExpenseForm');
const payExpenseId = document.getElementById('payExpenseId');
const payExpenseModalPeriod = document.getElementById('payExpenseModalPeriod');
const payExpenseModalAmount = document.getElementById('payExpenseModalAmount');
const payExpenseModalConcept = document.getElementById('payExpenseModalConcept');
const receiptDropzone = document.getElementById('receiptDropzone');
const payExpenseFileInput = document.getElementById('payExpenseFileInput');
const dropzoneEmpty = document.getElementById('dropzoneEmpty');
const dropzonePreview = document.getElementById('dropzonePreview');
const previewThumbnail = document.getElementById('previewThumbnail');
const previewFileName = document.getElementById('previewFileName');
const previewFileSize = document.getElementById('previewFileSize');
const removeReceiptFileBtn = document.getElementById('removeReceiptFileBtn');
const payExpenseReference = document.getElementById('payExpenseReference');
const submitPayExpenseBtn = document.getElementById('submitPayExpenseBtn');
const viewCurrentReceiptBtn = document.getElementById('viewCurrentReceiptBtn');

// View Receipt Modal DOM
const viewReceiptModal = document.getElementById('viewReceiptModal');
const closeViewReceiptModal = document.getElementById('closeViewReceiptModal');
const closeViewReceiptBtn = document.getElementById('closeViewReceiptBtn');
const viewReceiptModalTitle = document.getElementById('viewReceiptModalTitle');
const viewReceiptModalSubtitle = document.getElementById('viewReceiptModalSubtitle');
const receiptOwnerName = document.getElementById('receiptOwnerName');
const receiptPeriodAmount = document.getElementById('receiptPeriodAmount');
const receiptReferenceCode = document.getElementById('receiptReferenceCode');
const receiptPaidDate = document.getElementById('receiptPaidDate');
const receiptStatusBadge = document.getElementById('receiptStatusBadge');
const receiptViewerContainer = document.getElementById('receiptViewerContainer');
const downloadReceiptBtn = document.getElementById('downloadReceiptBtn');
const openReceiptExternalBtn = document.getElementById('openReceiptExternalBtn');
const receiptAdminApproveBtn = document.getElementById('receiptAdminApproveBtn');
const receiptAdminRejectBtn = document.getElementById('receiptAdminRejectBtn');

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

// Edit User Modal DOM (Admin)
const editUserModal = document.getElementById('editUserModal');
const editUserForm = document.getElementById('editUserForm');
const editUserId = document.getElementById('editUserId');
const editUserNombre = document.getElementById('editUserNombre');
const editUserApellido = document.getElementById('editUserApellido');
const editUserTipoDoc = document.getElementById('editUserTipoDoc');
const editUserNumDoc = document.getElementById('editUserNumDoc');
const editUserLote = document.getElementById('editUserLote');
const editUserManzana = document.getElementById('editUserManzana');
const editUserUsernamePreview = document.getElementById('editUserUsernamePreview');
const editUserTelefono = document.getElementById('editUserTelefono');
const editUserEmail = document.getElementById('editUserEmail');
const closeEditUserModal = document.getElementById('closeEditUserModal');
const cancelEditUserBtn = document.getElementById('cancelEditUserBtn');
const submitEditUserBtn = document.getElementById('submitEditUserBtn');
const editUserGenerateResetLinkBtn = document.getElementById('editUserGenerateResetLinkBtn');

// Forgot Password Modal DOM (Resident / Self-service)
const openForgotPasswordBtn = document.getElementById('openForgotPasswordBtn');
const forgotPasswordModal = document.getElementById('forgotPasswordModal');
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const forgotPasswordIdentifier = document.getElementById('forgotPasswordIdentifier');
const forgotPasswordStatus = document.getElementById('forgotPasswordStatus');
const closeForgotPasswordModal = document.getElementById('closeForgotPasswordModal');
const cancelForgotPasswordBtn = document.getElementById('cancelForgotPasswordBtn');
const submitForgotPasswordBtn = document.getElementById('submitForgotPasswordBtn');

// Reset Password Modal DOM (with Token)
const resetPasswordModal = document.getElementById('resetPasswordModal');
const resetPasswordForm = document.getElementById('resetPasswordForm');
const resetPasswordToken = document.getElementById('resetPasswordToken');
const resetPasswordSubtitle = document.getElementById('resetPasswordSubtitle');
const resetNewPassword = document.getElementById('resetNewPassword');
const resetConfirmPassword = document.getElementById('resetConfirmPassword');
const resetPasswordStatus = document.getElementById('resetPasswordStatus');
const closeResetPasswordModal = document.getElementById('closeResetPasswordModal');
const cancelResetPasswordBtn = document.getElementById('cancelResetPasswordBtn');
const submitResetPasswordBtn = document.getElementById('submitResetPasswordBtn');

// Admin Reset Link Modal DOM (Admin-Assisted)
const adminResetLinkModal = document.getElementById('adminResetLinkModal');
const closeAdminResetLinkModal = document.getElementById('closeAdminResetLinkModal');
const dismissAdminResetLinkBtn = document.getElementById('dismissAdminResetLinkBtn');
const adminResetTargetName = document.getElementById('adminResetTargetName');
const adminResetTargetUser = document.getElementById('adminResetTargetUser');
const adminResetTargetEmail = document.getElementById('adminResetTargetEmail');
const adminResetLinkInput = document.getElementById('adminResetLinkInput');
const copyAdminResetLinkBtn = document.getElementById('copyAdminResetLinkBtn');
const shareAdminResetWhatsAppBtn = document.getElementById('shareAdminResetWhatsAppBtn');
const sendAdminResetEmailBtn = document.getElementById('sendAdminResetEmailBtn');

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

// Admin Expenses Search DOM
const adminExpensesSearchInput = document.getElementById('adminExpensesSearchInput');

// Admin Notify Specific Residents Modal DOM
const openNotifySpecificResidentsModalBtn = document.getElementById('openNotifySpecificResidentsModalBtn');
const adminNotifySpecificResidentsModal = document.getElementById('adminNotifySpecificResidentsModal');
const closeAdminNotifySpecificResidentsModal = document.getElementById('closeAdminNotifySpecificResidentsModal');
const cancelAdminNotifySpecificBtn = document.getElementById('cancelAdminNotifySpecificBtn');
const adminNotifySpecificResidentsForm = document.getElementById('adminNotifySpecificResidentsForm');
const adminNotifyResidentsSearchInput = document.getElementById('adminNotifyResidentsSearchInput');
const adminNotifyResidentsCheckboxesList = document.getElementById('adminNotifyResidentsCheckboxesList');
const adminNotifySelectAllBtn = document.getElementById('adminNotifySelectAllBtn');
const adminNotifyDeselectAllBtn = document.getElementById('adminNotifyDeselectAllBtn');
const adminNotifySelectedCount = document.getElementById('adminNotifySelectedCount');
const adminNotifySpecificTitleInput = document.getElementById('adminNotifySpecificTitleInput');
const adminNotifySpecificMessageInput = document.getElementById('adminNotifySpecificMessageInput');
const submitAdminNotifySpecificBtn = document.getElementById('submitAdminNotifySpecificBtn');

// Guard Notify Admin Modal DOM
const guardNotifyAdminBtn = document.getElementById('guardNotifyAdminBtn');
const guardNotifyAdminModal = document.getElementById('guardNotifyAdminModal');
const closeGuardNotifyAdminModal = document.getElementById('closeGuardNotifyAdminModal');
const cancelGuardNotifyAdminBtn = document.getElementById('cancelGuardNotifyAdminBtn');
const guardNotifyAdminForm = document.getElementById('guardNotifyAdminForm');
const guardNotifyAdminPresetSelect = document.getElementById('guardNotifyAdminPresetSelect');
const guardNotifyAdminTitleInput = document.getElementById('guardNotifyAdminTitleInput');
const guardNotifyAdminMessageInput = document.getElementById('guardNotifyAdminMessageInput');
const submitGuardNotifyAdminBtn = document.getElementById('submitGuardNotifyAdminBtn');

// Admin Notify Guard Modal DOM
const openNotifyGuardModalBtn = document.getElementById('openNotifyGuardModalBtn');
const adminNotifyGuardFromGuardBtn = document.getElementById('adminNotifyGuardFromGuardBtn');
const adminNotifyGuardModal = document.getElementById('adminNotifyGuardModal');
const closeAdminNotifyGuardModal = document.getElementById('closeAdminNotifyGuardModal');
const cancelAdminNotifyGuardBtn = document.getElementById('cancelAdminNotifyGuardBtn');
const adminNotifyGuardForm = document.getElementById('adminNotifyGuardForm');
const adminNotifyGuardPresetSelect = document.getElementById('adminNotifyGuardPresetSelect');
const adminNotifyGuardTitleInput = document.getElementById('adminNotifyGuardTitleInput');
const adminNotifyGuardMessageInput = document.getElementById('adminNotifyGuardMessageInput');
const submitAdminNotifyGuardBtn = document.getElementById('submitAdminNotifyGuardBtn');

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

function showToast(message, duration = 2600) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
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
  const isGuard = state.authenticatedUser?.role === 'guardia';
  if (isGuard) {
    view = 'guard';
  } else {
    const validViews = ['home', 'expenses', 'news', 'visits', 'booking', 'guardNotices', 'admin'];
    if (!validViews.includes(view)) {
      view = 'home';
    }
    // Prevent unauthorized view access
    if (view === 'admin' && state.authenticatedUser?.role !== 'admin') {
      view = 'home';
    }
    if (view === 'guard') {
      view = 'home';
    }
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
    guardNotices: 'guardNoticesSection',
    admin: 'adminSection',
    guard: 'guardSection'
  };

  document.querySelectorAll('.content-section').forEach((section) => {
    section.classList.toggle('active', section.id === sectionMap[view]);
  });

  // History API: sync browser URL hash and back button support
  if (pushHistory) {
    const currentHash = window.location.hash.replace('#', '');
    const targetHash = (view === 'home' || (isGuard && view === 'guard')) ? '' : `#${view}`;
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
  if (view === 'guardNotices') loadResidentGuardNotices();
  if (view === 'guard') loadGuardData();
  if (view === 'admin' && state.authenticatedUser?.role === 'admin') {
    setAdminTab(state.activeAdminTab || 'vecinos');
    setVecinosSubtab(state.activeVecinosSubtab || 'activos');
    loadAdminData();
  }
  if (view === 'home' && state.authenticatedUser?.role === 'admin') loadAdminData();
}

function renderUserProfile() {
  if (!state.authenticatedUser) return;
  const user = state.authenticatedUser;
  const initials = `${user.nombre?.[0] || ''}${user.apellido?.[0] || ''}`.toUpperCase();

  if (userFullName) userFullName.textContent = `${user.nombre} ${user.apellido}`;
  if (userInitials) userInitials.textContent = initials || 'US';

  const isGuard = user.role === 'guardia';
  const isAdmin = user.role === 'admin';

  if (userRoleBadge) {
    if (isGuard) {
      userRoleBadge.textContent = '🛡️ Personal de Guardia';
      userRoleBadge.style.color = 'var(--gold)';
    } else if (isAdmin) {
      userRoleBadge.textContent = 'Administrador';
      userRoleBadge.style.color = 'var(--gold)';
    } else {
      userRoleBadge.textContent = 'Propietario';
      userRoleBadge.style.color = 'var(--muted)';
    }
  }

  const homeWelcomeTitle = document.getElementById('homeWelcomeTitle');
  if (homeWelcomeTitle) {
    homeWelcomeTitle.textContent = `¡Hola, ${user.nombre}!`;
  }

  if (guardOperatorName) guardOperatorName.textContent = `${user.nombre} ${user.apellido}`;
  if (guardOperatorUser) guardOperatorUser.textContent = user.username || user.email;

  // Show or hide admin controls
  if (adminNewsActions) adminNewsActions.style.display = isAdmin ? 'block' : 'none';
  if (homeAdminBtn) homeAdminBtn.style.display = isAdmin ? 'flex' : 'none';

  // For guards: hide user profile button
  const openProfileModalBtn = document.getElementById('openProfileModalBtn');
  if (openProfileModalBtn) openProfileModalBtn.style.display = isGuard ? 'none' : 'flex';
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
  const isAdmin = state.authenticatedUser?.role === 'admin';

  // Toggle role filter bar visibility for admin
  if (notificationRoleFilterBar) {
    notificationRoleFilterBar.style.display = isAdmin ? 'flex' : 'none';
  }

  const allNotifications = state.notifications || [];
  const unreadCount = allNotifications.filter((n) => !n.read).length;

  if (notificationBadge) {
    notificationBadge.textContent = unreadCount;
    notificationBadge.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
  }

  if (guardNotifBadge) {
    guardNotifBadge.textContent = unreadCount > 0 ? `${unreadCount} nuevas (masivas)` : 'Solo masivas';
  }

  // Filter notifications if active filter is applied (admin only)
  let displayed = allNotifications;
  if (isAdmin && state.notificationRoleFilter && state.notificationRoleFilter !== 'all') {
    if (state.notificationRoleFilter === 'admin') {
      displayed = displayed.filter((n) => n.targetRole === 'admin');
    } else if (state.notificationRoleFilter === 'community') {
      displayed = displayed.filter((n) => n.targetRole === 'all');
    } else if (state.notificationRoleFilter === 'user') {
      displayed = displayed.filter((n) => n.targetRole === 'user' || !n.targetRole);
    }
  }

  if (displayed.length === 0) {
    const emptyMsg = (isAdmin && state.notificationRoleFilter !== 'all')
      ? 'No hay avisos en esta categoría.'
      : 'No tenés notificaciones pendientes.';
    notificationList.innerHTML = `
      <li class="notification-item">
        <p>${emptyMsg}</p>
      </li>
    `;
    return;
  }

  notificationList.innerHTML = displayed
    .map((notification) => {
      const dateStr = notification.createdAt ? new Date(notification.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '';

      let badgeHtml = '';
      if (notification.targetRole === 'admin') {
        badgeHtml = `<span class="badge soft mini" style="background: rgba(105, 210, 166, 0.2); color: var(--primary); border: 1px solid rgba(105, 210, 166, 0.4); font-size: 0.72rem; margin-left: 0.4rem;">🛡️ Gestión Admin</span>`;
      } else if (notification.targetRole === 'all') {
        badgeHtml = `<span class="badge soft mini" style="background: rgba(247, 199, 109, 0.2); color: var(--gold); border: 1px solid rgba(247, 199, 109, 0.4); font-size: 0.72rem; margin-left: 0.4rem;">📢 Comunidad</span>`;
      } else if (isAdmin) {
        badgeHtml = `<span class="badge soft mini" style="background: rgba(138, 206, 255, 0.15); color: var(--secondary); border: 1px solid rgba(138, 206, 255, 0.3); font-size: 0.72rem; margin-left: 0.4rem;">👤 Personal</span>`;
      }

      return `
        <li class="notification-item ${notification.read ? '' : 'unread'}" data-id="${notification.id}">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.4rem; flex-wrap: wrap;">
            <div>
              <strong style="color: #fff;">${escapeHTML(notification.title)}</strong>
              ${badgeHtml}
            </div>
            <small style="color: var(--muted);">${escapeHTML(dateStr)}</small>
          </div>
          <p style="margin: 0.3rem 0 0 0; line-height: 1.4;">${escapeHTML(notification.text)}</p>
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

function compressImageFile(file, maxWidth = 1200, maxHeight = 900, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('El archivo seleccionado no es una imagen válida.'));
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('No se pudo decodificar la imagen.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function resetCreateNewsModal() {
  if (createNewsForm) createNewsForm.reset();
  state.newsUploadedImageBase64 = null;
  if (newsImagePreview) newsImagePreview.src = '';
  if (newsImagePreviewContainer) newsImagePreviewContainer.style.display = 'none';
  if (newsImageFileInput) newsImageFileInput.value = '';
}

async function handleCreateNews(event) {
  event.preventDefault();
  const formData = new FormData(createNewsForm);
  const title = String(formData.get('newsTitle') || '').trim();
  const category = String(formData.get('newsCategory') || '').trim();
  const description = String(formData.get('newsDescription') || '').trim();
  const urlImage = String(formData.get('newsImage') || '').trim();
  const image = state.newsUploadedImageBase64 || urlImage || './descarga.jfif';

  try {
    showToast('Publicando noticia...');
    await API.news.create({ title, category, description, image });
    showToast('Noticia publicada con éxito.');
    resetCreateNewsModal();
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
  return `${base}${path}/invitacion.html?c=${encodeURIComponent(cachedInviteCode)}`;
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
        payExpenseBtn.onclick = () => openPayExpenseModal(latest.id);
      } else if (isInReview) {
        payExpenseBtn.style.display = 'inline-block';
        payExpenseBtn.textContent = '⏳ Pago en revisión';
        payExpenseBtn.disabled = true;
      } else {
        payExpenseBtn.style.display = 'none';
      }
    }

    if (viewCurrentReceiptBtn) {
      if (latest.receiptPath) {
        viewCurrentReceiptBtn.style.display = 'inline-flex';
        viewCurrentReceiptBtn.onclick = () => openViewReceiptModal(latest);
      } else {
        viewCurrentReceiptBtn.style.display = 'none';
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
              <div class="visit-actions" style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
                ${item.receiptPath ? `
                  <button type="button" class="btn-inline-action view-receipt-btn view-resident-receipt-btn" data-id="${item.id}" title="Ver comprobante de pago digital">
                    <span>📎</span> Ver Comprobante
                  </button>
                ` : ''}
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
              <span>${item.paymentReference ? `Ref: ${escapeHTML(item.paymentReference)}` : (item.receiptPath ? 'Comprobante adjunto' : 'Registrado')}${item.paidAt ? ` · ${new Date(item.paidAt).toLocaleDateString()}` : ''}</span>
              <em class="visit-status ${item.status === 'Pagado' ? 'confirmed' : (item.status === 'En revisión' ? 'neutral' : 'pending')}">${escapeHTML(item.status)}</em>
            </div>
          </li>
        `)
        .join('');

      expensesList.querySelectorAll('.pay-item-btn').forEach((btn) => {
        btn.addEventListener('click', () => openPayExpenseModal(btn.dataset.id));
      });

      expensesList.querySelectorAll('.view-resident-receipt-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const item = (state.expenses || []).find((e) => String(e.id) === String(btn.dataset.id));
          if (item) openViewReceiptModal(item);
        });
      });
    }
  }
}

// ----------------- COMPROBANTE DIGITAL: SUBIDA Y VISUALIZACIÓN ----------------- //

function setupReceiptDropzone() {
  if (!receiptDropzone || !payExpenseFileInput) return;

  const handleFiles = (files) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    // File validation: up to 10MB
    if (file.size > 10 * 1024 * 1024) {
      showToast('El archivo supera el tamaño máximo permitido de 10 MB.');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
    const isPdfExt = file.name.toLowerCase().endsWith('.pdf');
    if (!validTypes.includes(file.type.toLowerCase()) && !isPdfExt) {
      showToast('Formato no permitido. Por favor seleccioná una imagen (JPG, PNG, WEBP) o un archivo PDF.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      state.selectedReceiptFile = {
        file,
        dataUrl,
        name: file.name,
        type: file.type || (isPdfExt ? 'application/pdf' : 'image/jpeg'),
        size: file.size
      };
      renderReceiptPreview();
    };
    reader.onerror = () => {
      showToast('Error al procesar el archivo seleccionado.');
    };
    reader.readAsDataURL(file);
  };

  receiptDropzone.addEventListener('click', (e) => {
    if (e.target.closest('#removeReceiptFileBtn')) return;
    payExpenseFileInput.click();
  });

  payExpenseFileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });

  receiptDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    receiptDropzone.classList.add('dragover');
  });

  receiptDropzone.addEventListener('dragleave', () => {
    receiptDropzone.classList.remove('dragover');
  });

  receiptDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    receiptDropzone.classList.remove('dragover');
    if (e.dataTransfer && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  });

  if (removeReceiptFileBtn) {
    removeReceiptFileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearReceiptFile();
    });
  }
}

function clearReceiptFile() {
  state.selectedReceiptFile = null;
  if (payExpenseFileInput) payExpenseFileInput.value = '';
  if (dropzoneEmpty) dropzoneEmpty.style.display = 'block';
  if (dropzonePreview) dropzonePreview.style.display = 'none';
  if (previewThumbnail) previewThumbnail.innerHTML = '';
}

function renderReceiptPreview() {
  if (!state.selectedReceiptFile) {
    clearReceiptFile();
    return;
  }

  const { name, size, type, dataUrl } = state.selectedReceiptFile;
  const isPdf = type === 'application/pdf' || name.toLowerCase().endsWith('.pdf');

  if (dropzoneEmpty) dropzoneEmpty.style.display = 'none';
  if (dropzonePreview) dropzonePreview.style.display = 'flex';
  if (previewFileName) previewFileName.textContent = name;
  if (previewFileSize) {
    const kb = (size / 1024).toFixed(1);
    const mb = (size / (1024 * 1024)).toFixed(2);
    previewFileSize.textContent = size > 1024 * 1024 ? `${mb} MB` : `${kb} KB`;
  }

  if (previewThumbnail) {
    if (isPdf) {
      previewThumbnail.innerHTML = '<span style="font-size: 1.5rem;">📄</span>';
    } else {
      previewThumbnail.innerHTML = `<img src="${dataUrl}" alt="Preview comprobante" />`;
    }
  }
}

function openPayExpenseModal(expenseId) {
  if (!payExpenseModal) return;
  const idNum = Number(expenseId);
  const expense = (state.expenses || []).find((e) => e.id === idNum) || state.expenses?.[0];

  if (!expense) {
    showToast('Liquidación de expensas no encontrada.');
    return;
  }

  if (payExpenseId) payExpenseId.value = expense.id;
  if (payExpenseModalPeriod) payExpenseModalPeriod.textContent = expense.period;
  if (payExpenseModalAmount) payExpenseModalAmount.textContent = `$ ${Number(expense.amount).toLocaleString('es-AR')}`;
  if (payExpenseModalConcept) payExpenseModalConcept.textContent = expense.concept || 'Expensas ordinarias';
  if (payExpenseReference) payExpenseReference.value = '';

  clearReceiptFile();

  if (submitPayExpenseBtn) {
    submitPayExpenseBtn.disabled = false;
    submitPayExpenseBtn.textContent = 'Enviar Comprobante';
  }

  payExpenseModal.style.display = 'grid';
  document.body.classList.add('modal-open');
  window.history.pushState({ modal: 'payExpense', view: state.activeDashboardView }, '', '#informar-pago');
}

function closePayExpenseModalFn(fromPopState = false) {
  if (!payExpenseModal) return;
  payExpenseModal.style.display = 'none';
  document.body.classList.remove('modal-open');
  clearReceiptFile();
  if (!fromPopState && window.history.state?.modal === 'payExpense') {
    window.history.back();
  }
}

async function handlePayExpenseSubmit(e) {
  e.preventDefault();
  const expenseId = Number(payExpenseId?.value);
  if (!expenseId) {
    showToast('Identificador de expensa inválido.');
    return;
  }

  const reference = String(payExpenseReference?.value || '').trim();
  const fileData = state.selectedReceiptFile;

  if (!fileData && !reference) {
    showToast('Por favor adjuntá el comprobante digital o indicá el número de transferencia.');
    return;
  }

  try {
    if (submitPayExpenseBtn) {
      submitPayExpenseBtn.disabled = true;
      submitPayExpenseBtn.textContent = 'Enviando comprobante...';
    }

    const payload = {
      reference: reference || (fileData ? 'Comprobante digital adjunto' : 'Informado por portal'),
      receiptData: fileData?.dataUrl || null,
      receiptName: fileData?.name || null,
      receiptMime: fileData?.type || null
    };

    const res = await API.expenses.pay(expenseId, payload);
    showToast(res.message || 'Comprobante enviado con éxito. La administración revisará tu pago.');
    closePayExpenseModalFn(false);
    loadExpenses();
    loadNotifications();
  } catch (err) {
    showToast(err.message || 'Error al enviar comprobante.');
  } finally {
    if (submitPayExpenseBtn) {
      submitPayExpenseBtn.disabled = false;
      submitPayExpenseBtn.textContent = 'Enviar Comprobante';
    }
  }
}

function openViewReceiptModal(expense) {
  if (!viewReceiptModal || !expense) return;
  state.activeViewingExpense = expense;

  const isAdmin = state.authenticatedUser?.role === 'admin';
  const ownerFullName = expense.nombre
    ? `${expense.nombre} ${expense.apellido}`
    : `${state.authenticatedUser?.nombre || ''} ${state.authenticatedUser?.apellido || ''}`.trim() || 'Propietario';

  const docText = expense.numeroDocumento ? `(DNI ${expense.numeroDocumento})` : '';
  const unitText = expense.lote ? ` · Lote ${expense.lote} Mz ${expense.manzana || '-'}` : '';

  if (viewReceiptModalTitle) {
    viewReceiptModalTitle.textContent = `Comprobante de Pago — ${expense.period}`;
  }
  if (viewReceiptModalSubtitle) {
    viewReceiptModalSubtitle.textContent = `${ownerFullName} ${docText} ${unitText}`;
  }
  if (receiptOwnerName) {
    receiptOwnerName.textContent = `${ownerFullName} ${docText} ${unitText}`;
  }
  if (receiptPeriodAmount) {
    receiptPeriodAmount.textContent = `${expense.period} — $ ${Number(expense.amount).toLocaleString('es-AR')}`;
  }
  if (receiptReferenceCode) {
    receiptReferenceCode.textContent = expense.paymentReference || 'Sin referencia registrada';
  }
  if (receiptPaidDate) {
    if (expense.paidAt) {
      const d = new Date(expense.paidAt);
      receiptPaidDate.textContent = `${d.toLocaleDateString('es-AR')} ${d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs`;
    } else {
      receiptPaidDate.textContent = 'Pendiente de acreditación';
    }
  }
  if (receiptStatusBadge) {
    receiptStatusBadge.textContent = expense.status;
    const isPaid = expense.status === 'Pagado';
    const isInReview = expense.status === 'En revisión';
    receiptStatusBadge.className = `visit-status ${isPaid ? 'confirmed' : (isInReview ? 'neutral' : 'pending')}`;
  }

  // Setup viewer container
  if (receiptViewerContainer) {
    if (expense.receiptPath) {
      const receiptUrl = API.expenses.getReceiptUrl(expense.id);
      const isPdf = (expense.receiptMime && expense.receiptMime.includes('pdf')) ||
                    (expense.receiptName && expense.receiptName.toLowerCase().endsWith('.pdf'));

      if (isPdf) {
        receiptViewerContainer.innerHTML = `
          <iframe class="receipt-viewer-pdf" src="${receiptUrl}" title="Comprobante en formato PDF"></iframe>
        `;
      } else {
        receiptViewerContainer.innerHTML = `
          <img class="receipt-viewer-img" src="${receiptUrl}" alt="Comprobante digital" id="activeReceiptImg" title="Hacé clic para ampliar o reducir" />
        `;
        const img = receiptViewerContainer.querySelector('#activeReceiptImg');
        if (img) {
          img.addEventListener('click', () => {
            img.classList.toggle('zoomed');
          });
        }
      }

      if (downloadReceiptBtn) {
        downloadReceiptBtn.style.display = 'inline-flex';
        downloadReceiptBtn.href = API.expenses.getReceiptUrl(expense.id, true);
        downloadReceiptBtn.setAttribute('download', expense.receiptName || `comprobante-${expense.period}.pdf`);
      }
      if (openReceiptExternalBtn) {
        openReceiptExternalBtn.style.display = 'inline-flex';
        openReceiptExternalBtn.href = receiptUrl;
      }
    } else {
      receiptViewerContainer.innerHTML = `
        <div class="receipt-empty-state">
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">📄</div>
          <strong style="color: #fff; font-size: 1rem; display: block;">No se adjuntó archivo digital</strong>
          <p style="margin: 0.3rem 0; font-size: 0.85rem; color: var(--muted);">El pago fue informado únicamente con la referencia bancaria: <strong>${escapeHTML(expense.paymentReference || 'Transferencia')}</strong>.</p>
        </div>
      `;
      if (downloadReceiptBtn) downloadReceiptBtn.style.display = 'none';
      if (openReceiptExternalBtn) openReceiptExternalBtn.style.display = 'none';
    }
  }

  // Admin In-Modal Actions
  if (receiptAdminApproveBtn) {
    receiptAdminApproveBtn.style.display = (isAdmin && expense.status !== 'Pagado') ? 'inline-block' : 'none';
  }
  if (receiptAdminRejectBtn) {
    receiptAdminRejectBtn.style.display = (isAdmin && expense.status === 'En revisión') ? 'inline-block' : 'none';
  }

  viewReceiptModal.style.display = 'grid';
  document.body.classList.add('modal-open');
  window.history.pushState({ modal: 'viewReceipt', view: state.activeDashboardView }, '', '#ver-comprobante');
}

function closeViewReceiptModalFn(fromPopState = false) {
  if (!viewReceiptModal) return;
  viewReceiptModal.style.display = 'none';
  document.body.classList.remove('modal-open');
  if (receiptViewerContainer) receiptViewerContainer.innerHTML = '';
  state.activeViewingExpense = null;
  if (!fromPopState && window.history.state?.modal === 'viewReceipt') {
    window.history.back();
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
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  }).formatToParts(new Date());
  const curHour = Number(parts.find(p => p.type === 'hour')?.value || 0);
  const curMin = Number(parts.find(p => p.type === 'minute')?.value || 0);
  const currentMinutes = curHour * 60 + curMin;
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
    if (state.activeAdminTab === 'auditoria') {
      loadAdminAuditLogs();
    }
  } catch (error) {
    console.error('Error loading admin data:', error);
  }
}

function setAdminTab(tabName) {
  if (!tabName) return;
  state.activeAdminTab = tabName;
  document.querySelectorAll('.admin-nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.adminTab === tabName);
  });
  const tabMap = {
    vecinos: 'adminTabVecinos',
    guardia: 'adminTabGuardia',
    expensas: 'adminTabExpensas',
    canchas: 'adminTabCanchas',
    alertas: 'adminTabAlertas',
    auditoria: 'adminTabAuditoria'
  };
  document.querySelectorAll('.admin-tab-view').forEach((view) => {
    view.classList.toggle('active', view.id === tabMap[tabName]);
  });
  if (tabName === 'auditoria') {
    loadAdminAuditLogs();
  }
}

function setVecinosSubtab(subtabName) {
  if (!subtabName) return;
  state.activeVecinosSubtab = subtabName;
  document.querySelectorAll('.vecinos-subnav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.vecinosSubtab === subtabName);
  });
  const subpanelMap = {
    activos: 'adminActiveUsersSubpanel',
    solicitudes: 'adminPendingUsersSubpanel'
  };
  document.querySelectorAll('.vecinos-subpanel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === subpanelMap[subtabName]);
  });
}

function renderAdminPanel() {
  // Synchronize active admin tab and subtab
  setAdminTab(state.activeAdminTab || 'vecinos');
  setVecinosSubtab(state.activeVecinosSubtab || 'activos');

  // Stats
  if (statTotalUsers) statTotalUsers.textContent = state.adminStats?.totalUsers ?? 0;
  if (statPendingUsers) statPendingUsers.textContent = state.adminStats?.pendingUsers ?? 0;
  if (statTodayVisits) statTodayVisits.textContent = state.adminStats?.todayVisits ?? 0;

  // Pending count badge in home hub and admin navigation
  const pendingCount = state.pendingUsers.length;
  if (homeAdminPendingBadge) {
    homeAdminPendingBadge.textContent = `${pendingCount} pendiente${pendingCount === 1 ? '' : 's'}`;
    homeAdminPendingBadge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
  }
  if (adminPendingStatusCount) {
    adminPendingStatusCount.textContent = `${pendingCount} pendiente${pendingCount === 1 ? '' : 's'}`;
  }
  if (adminNavPendingBadge) {
    adminNavPendingBadge.textContent = pendingCount;
    adminNavPendingBadge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
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
          const isGuard = user.role === 'guardia';
          const initials = `${(user.nombre || '')[0] || ''}${(user.apellido || '')[0] || ''}`.toUpperCase() || 'RD';

          let lotBadge = '';
          if (user.lote || user.manzana) {
            lotBadge = `<span class="badge soft" style="background: rgba(138, 206, 255, 0.15); color: var(--secondary); border: 1px solid rgba(138, 206, 255, 0.3);">Lote ${escapeHTML(user.lote || '-')} · Mz ${escapeHTML(user.manzana || '-')}</span>`;
          } else if (isAdmin && !user.lote) {
            lotBadge = `<span class="badge soft" style="background: rgba(255, 255, 255, 0.05); color: var(--muted);">Administración</span>`;
          } else if (isGuard && !user.lote) {
            lotBadge = `<span class="badge soft" style="background: rgba(212, 163, 89, 0.15); color: var(--gold); border: 1px solid rgba(212, 163, 89, 0.3);">Garita / Guardia</span>`;
          }

          const roleBadge = isAdmin
            ? `<span class="badge soft" style="background: rgba(247, 199, 109, 0.2); color: var(--gold); border: 1px solid rgba(247, 199, 109, 0.4);">🛡️ Administrador</span>`
            : isGuard
            ? `<span class="badge soft" style="background: rgba(212, 163, 89, 0.2); color: var(--gold); border: 1px solid rgba(212, 163, 89, 0.4);">🛡️ Guardia (@guardia)</span>`
            : `<span class="badge soft" style="background: rgba(105, 210, 166, 0.15); color: var(--primary); border: 1px solid rgba(105, 210, 166, 0.3);">🏡 Propietario</span>`;

          const usernameDisplay = user.username ? `👤 Usuario: <strong style="color: #fff;">${escapeHTML(user.username)}</strong> · ` : '';

          let actionsHtml = '';
          if (isSelf) {
            actionsHtml = `
              <button type="button" class="btn-inline-action edit-active-user-btn" data-id="${user.id}" style="padding: 0.35rem 0.7rem; font-size: 0.78rem;">
                ✏️ Modificar datos
              </button>
              <button type="button" class="btn-inline-action reset-user-pass-btn" data-id="${user.id}" title="Generar enlace de restablecimiento de clave" style="padding: 0.35rem 0.7rem; font-size: 0.78rem;">
                🔑 Blanquear clave
              </button>
              <span class="badge soft" style="font-size: 0.78rem; opacity: 0.85;">Tu sesión actual</span>
            `;
          } else {
            actionsHtml = `
              <button type="button" class="btn-inline-action edit-active-user-btn" data-id="${user.id}" style="padding: 0.35rem 0.7rem; font-size: 0.78rem;">
                ✏️ Modificar datos
              </button>
              <button type="button" class="btn-inline-action reset-user-pass-btn" data-id="${user.id}" title="Generar enlace de restablecimiento de clave" style="padding: 0.35rem 0.7rem; font-size: 0.78rem;">
                🔑 Blanquear clave
              </button>
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

      // Event listeners for edit active user
      activeUsersList.querySelectorAll('.edit-active-user-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const user = state.approvedUsers.find((u) => String(u.id) === String(btn.dataset.id));
          if (user) openEditUserModal(user);
        });
      });

      // Event listeners for reset active user password
      activeUsersList.querySelectorAll('.reset-user-pass-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          openAdminResetModalForUser(btn.dataset.id);
        });
      });

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
        .map((user) => {
          const lotInfo = (user.lote || user.manzana)
            ? `<span class="badge soft" style="background: rgba(138, 206, 255, 0.15); color: var(--secondary); border: 1px solid rgba(138, 206, 255, 0.3);">Lote ${escapeHTML(user.lote || '-')} · Mz ${escapeHTML(user.manzana || '-')}</span>`
            : '';
          const userBadge = user.username
            ? `<span class="badge soft" style="background: rgba(247, 199, 109, 0.15); color: var(--gold); border: 1px solid rgba(247, 199, 109, 0.3);">👤 ${escapeHTML(user.username)}</span>`
            : '';

          return `
            <div class="pending-user-card">
              <div class="pending-user-header">
                <div>
                  <strong>${escapeHTML(user.nombre)} ${escapeHTML(user.apellido)}</strong>
                  <div style="margin-top: 0.25rem; display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
                    ${lotInfo}
                    ${userBadge}
                  </div>
                </div>
                <small>${escapeHTML(user.tipoDocumento)}: ${escapeHTML(user.numeroDocumento)}</small>
              </div>
              <div class="pending-user-details">
                <span>📧 ${escapeHTML(user.email)}</span>
                <span>📞 ${escapeHTML(user.telefono)}</span>
              </div>
              <div class="pending-actions" style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.6rem;">
                <button type="button" class="btn-inline-action edit-pending-user-btn" data-id="${user.id}">✏️ Modificar datos</button>
                <button type="button" class="btn-inline-action reset-user-pass-btn" data-id="${user.id}" title="Generar enlace de restablecimiento de clave">🔑 Restablecer clave</button>
                <button type="button" class="success-btn approve-user-btn" data-id="${user.id}">Aprobar acceso</button>
                <button type="button" class="danger-btn reject-user-btn" data-id="${user.id}">Rechazar</button>
              </div>
            </div>
          `;
        })
        .join('');

      pendingUsersList.querySelectorAll('.edit-pending-user-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const user = state.pendingUsers.find((u) => String(u.id) === String(btn.dataset.id));
          if (user) openEditUserModal(user);
        });
      });

      pendingUsersList.querySelectorAll('.reset-user-pass-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          openAdminResetModalForUser(btn.dataset.id);
        });
      });

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
    if (adminNavGuardBadge) {
      adminNavGuardBadge.textContent = insideCount;
      adminNavGuardBadge.style.display = insideCount > 0 ? 'inline-block' : 'none';
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
  renderAdminExpensesList();

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

function renderAdminExpensesList() {
  const adminExpensesList = document.getElementById('adminExpensesList');
  const adminExpensesStatusBadge = document.getElementById('adminExpensesStatusBadge');
  if (!adminExpensesList) return;

  let expenses = state.adminExpenses || [];
  const inReviewCount = expenses.filter((e) => e.status === 'En revisión').length;

  if (adminExpensesStatusBadge) {
    adminExpensesStatusBadge.textContent = inReviewCount > 0 ? `${inReviewCount} en revisión` : `${expenses.length} liquidaciones`;
  }

  // Filter by search query (lote, manzana, dni, nombre, apellido, period, ref)
  if (state.adminExpensesSearchQuery && state.adminExpensesSearchQuery.trim()) {
    const q = state.adminExpensesSearchQuery.trim().toLowerCase();
    const cleanQ = q.replace(/[^a-z0-9]/gi, '');
    expenses = expenses.filter((exp) => {
      const lote = String(exp.lote || '').toLowerCase();
      const manzana = String(exp.manzana || '').toLowerCase();
      const dni = String(exp.numeroDocumento || '').toLowerCase();
      const nombre = String(exp.nombre || '').toLowerCase();
      const apellido = String(exp.apellido || '').toLowerCase();
      const fullName = `${nombre} ${apellido}`;
      const period = String(exp.period || '').toLowerCase();
      const ref = String(exp.paymentReference || '').toLowerCase();

      // Combined formats like L2, L2M2, Lote 2 Mz 2
      const lotFormats = [
        lote,
        `l${lote}`,
        `lote ${lote}`,
        `l${lote}m${manzana}`,
        `l${lote}mz${manzana}`,
        `lote ${lote} mz ${manzana}`
      ];

      return (
        dni.includes(q) ||
        apellido.includes(q) ||
        nombre.includes(q) ||
        fullName.includes(q) ||
        period.includes(q) ||
        ref.includes(q) ||
        lotFormats.some((fmt) => fmt.includes(q)) ||
        (cleanQ && `${lote}${manzana}`.includes(cleanQ))
      );
    });
  }

  if (expenses.length === 0) {
    const isFiltered = Boolean(state.adminExpensesSearchQuery && state.adminExpensesSearchQuery.trim());
    adminExpensesList.innerHTML = `
      <li class="visit-item">
        <div>
          <strong>${isFiltered ? 'No se encontraron liquidaciones' : 'Sin liquidaciones cargadas'}</strong>
          <small>${isFiltered ? 'No coinciden con el término de búsqueda (lote, DNI o apellido).' : 'Hacé click en "➕ Emitir Nueva Liquidación" para generar las expensas del mes.'}</small>
        </div>
      </li>
    `;
    return;
  }

  adminExpensesList.innerHTML = expenses
    .map((exp) => `
      <li class="visit-item">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; flex-wrap: wrap;">
          <div>
            <strong>${escapeHTML(exp.nombre)} ${escapeHTML(exp.apellido)} <small>(DNI ${escapeHTML(exp.numeroDocumento)}${exp.lote ? ` · Lote ${escapeHTML(exp.lote)} Mz ${escapeHTML(exp.manzana || '-')}` : ''})</small></strong>
            <p style="margin: 0.2rem 0; font-size: 0.95rem;">
              <strong>${escapeHTML(exp.period)}</strong> — $ ${Number(exp.amount).toLocaleString('es-AR')}
            </p>
            <small>${exp.concept ? `📌 ${escapeHTML(exp.concept)} · ` : ''}${exp.paymentReference ? `📄 Ref: <strong>${escapeHTML(exp.paymentReference)}</strong> · ` : ''}Vencimiento: ${escapeHTML(exp.dueDate)}</small>
          </div>
          <div class="visit-actions" style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
            ${exp.receiptPath ? `
              <button type="button" class="btn-inline-action view-receipt-btn admin-view-receipt-btn" data-id="${exp.id}" title="Ver comprobante de pago digital">
                <span>📎</span> Ver Comprobante
              </button>
            ` : ''}
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
          <span>${exp.paidAt ? `Fecha pago: ${new Date(exp.paidAt).toLocaleDateString()}` : 'Emitida'}${exp.receiptPath ? ' · 📎 Comprobante adjunto' : ''}</span>
          <em class="visit-status ${exp.status === 'Pagado' ? 'confirmed' : (exp.status === 'En revisión' ? 'neutral' : 'pending')}">${escapeHTML(exp.status)}</em>
        </div>
      </li>
    `)
    .join('');

  adminExpensesList.querySelectorAll('.admin-view-receipt-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const exp = (state.adminExpenses || []).find((e) => String(e.id) === String(btn.dataset.id));
      if (exp) openViewReceiptModal(exp);
    });
  });

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

function updateCreateUserRoleUI() {
  const role = newUserRole?.value || 'user';
  const isGuard = role === 'guardia';
  const helperNotice = document.getElementById('guardUserHelperNotice');
  const submitBtn = document.getElementById('submitCreateUserBtn');
  const emailLabel = document.getElementById('newUserEmailLabel');

  if (helperNotice) helperNotice.style.display = isGuard ? 'block' : 'none';
  if (submitBtn) {
    submitBtn.textContent = isGuard ? 'Crear Usuario de Guardia (@guardia)' : 'Crear y Habilitar Vecino';
  }
  if (emailLabel) {
    emailLabel.textContent = isGuard ? 'Usuario / Identificador de Guardia *' : 'Correo electrónico *';
  }
  if (newUserEmail) {
    newUserEmail.placeholder = isGuard ? 'ej: jorgecabral@guardia' : 'ejemplo@correo.com';
  }
  if (newUserUsername) {
    newUserUsername.placeholder = isGuard ? 'ej: jorgecabral@guardia' : 'Ej: L9M2';
  }
  if (newUserLote && newUserManzana) {
    if (isGuard) {
      newUserLote.placeholder = 'No aplica';
      newUserManzana.placeholder = 'No aplica';
    } else {
      newUserLote.placeholder = 'Ej: 9 o L9';
      newUserManzana.placeholder = 'Ej: 2 o M2';
    }
  }
}

function openCreateUserModal() {
  if (!createUserModal) return;
  if (createUserForm) createUserForm.reset();
  if (newUserDocType) newUserDocType.value = 'DNI';
  if (newUserRole) newUserRole.value = 'user';
  if (newUserPassword) newUserPassword.value = 'Vecino2026!';
  updateCreateUserRoleUI();
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
  if (newUserRole?.value === 'guardia') return;
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
  let lote = (newUserLote?.value || '').trim();
  let manzana = (newUserManzana?.value || '').trim();
  let username = (newUserUsername?.value || '').trim();
  const role = newUserRole?.value || 'user';
  const tipoDocumento = newUserDocType?.value || 'DNI';
  const numeroDocumento = (newUserDocNum?.value || '').trim();
  const telefono = (newUserPhone?.value || '').trim();
  let email = (newUserEmail?.value || '').trim();
  const password = (newUserPassword?.value || '').trim();

  if (!nombre || !apellido || !numeroDocumento || !telefono || !email || !password) {
    showToast('Por favor completá los campos obligatorios (*).');
    return;
  }

  if (password.length < 6) {
    showToast('La contraseña debe tener al menos 6 caracteres.');
    return;
  }

  if (role === 'guardia') {
    // Format guardia username and email to guarantee @guardia
    if (!email.includes('@')) {
      email = `${email}@guardia`;
    } else if (!email.toLowerCase().endsWith('@guardia')) {
      email = `${email.split('@')[0]}@guardia`;
    }
    if (!username) {
      username = email;
    } else if (!username.toLowerCase().endsWith('@guardia')) {
      username = `${username.split('@')[0]}@guardia`;
    }
    lote = '';
    manzana = '';
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

    showToast(res.message || 'Usuario creado y habilitado con éxito.');
    closeCreateUserModalFn();
    await loadAdminData();
  } catch (err) {
    showToast(err.message || 'Error al crear el usuario.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = role === 'guardia' ? 'Crear Usuario de Guardia (@guardia)' : 'Crear y Habilitar Vecino';
    }
  }
}

// ----------------- EDIT USER MODAL (ADMIN) ----------------- //

function openEditUserModal(user) {
  if (!editUserModal || !user) return;
  if (editUserForm) editUserForm.reset();

  if (editUserId) editUserId.value = user.id || '';
  if (editUserNombre) editUserNombre.value = user.nombre || '';
  if (editUserApellido) editUserApellido.value = user.apellido || '';
  if (editUserTipoDoc) editUserTipoDoc.value = user.tipoDocumento || 'DNI';
  if (editUserNumDoc) editUserNumDoc.value = user.numeroDocumento || '';
  if (editUserLote) editUserLote.value = user.lote || '';
  if (editUserManzana) editUserManzana.value = user.manzana || '';
  if (editUserTelefono) editUserTelefono.value = user.telefono || '';
  if (editUserEmail) editUserEmail.value = user.email || '';

  updateEditUserUsernamePreview();

  editUserModal.style.display = 'grid';
  window.history.pushState({ modal: 'editUser', view: state.activeDashboardView }, '', '#editar-vecino');
}

function closeEditUserModalFn(fromPopState = false) {
  if (!editUserModal) return;
  editUserModal.style.display = 'none';
  if (!fromPopState && window.history.state?.modal === 'editUser') {
    window.history.back();
  }
}

function updateEditUserUsernamePreview() {
  if (!editUserUsernamePreview) return;
  const cleanL = (editUserLote?.value || '').trim().replace(/\D/g, '');
  const cleanM = (editUserManzana?.value || '').trim().replace(/\D/g, '');
  if (cleanL && cleanM) {
    editUserUsernamePreview.textContent = `L${cleanL}M${cleanM}`;
  } else {
    editUserUsernamePreview.textContent = 'Indique lote y manzana';
  }
}

async function handleEditUserSubmit(e) {
  e.preventDefault();
  if (!editUserForm) return;

  const submitBtn = document.getElementById('submitEditUserBtn');
  const userId = editUserId?.value;
  if (!userId) return;

  const nombre = (editUserNombre?.value || '').trim();
  const apellido = (editUserApellido?.value || '').trim();
  const tipoDocumento = editUserTipoDoc?.value || 'DNI';
  const numeroDocumento = (editUserNumDoc?.value || '').trim();
  const lote = (editUserLote?.value || '').trim();
  const manzana = (editUserManzana?.value || '').trim();
  const telefono = (editUserTelefono?.value || '').trim();
  const email = (editUserEmail?.value || '').trim();

  if (!nombre || !apellido || !numeroDocumento || !lote || !manzana || !telefono || !email) {
    showToast('Por favor completá todos los campos requeridos (*).');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';
  }

  try {
    const res = await API.admin.updateUser(userId, {
      nombre,
      apellido,
      tipoDocumento,
      numeroDocumento,
      lote,
      manzana,
      telefono,
      email
    });

    showToast(res.message || 'Datos del vecino actualizados con éxito.');
    closeEditUserModalFn();
    await loadAdminData();
  } catch (err) {
    showToast(err.message || 'Error al actualizar los datos del vecino.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Guardar Cambios';
    }
  }
}

// ----------------- REGISTRATION USERNAME PREVIEW ----------------- //

function updateRegisterUsernamePreview() {
  if (!registerLote || !registerManzana || !registerUsernamePreview || !registerUsernamePreviewText) return;
  const loteVal = (registerLote.value || '').trim().replace(/\D/g, '');
  const manVal = (registerManzana.value || '').trim().replace(/\D/g, '');
  if (loteVal && manVal) {
    registerUsernamePreviewText.textContent = `L${loteVal}M${manVal}`;
    registerUsernamePreview.style.display = 'block';
  } else {
    registerUsernamePreview.style.display = 'none';
  }
}

// ----------------- PASSWORD RECOVERY (HYBRID SCHEME) ----------------- //

function openForgotPasswordModal() {
  if (!forgotPasswordModal) return;
  if (forgotPasswordForm) forgotPasswordForm.reset();
  if (forgotPasswordStatus) {
    forgotPasswordStatus.style.display = 'none';
    forgotPasswordStatus.textContent = '';
  }
  forgotPasswordModal.style.display = 'grid';
  window.history.pushState({ modal: 'forgotPassword', view: state.activeDashboardView }, '', '#recuperar-clave');
}

function closeForgotPasswordModalFn(fromPopState = false) {
  if (!forgotPasswordModal) return;
  forgotPasswordModal.style.display = 'none';
  if (!fromPopState && window.history.state?.modal === 'forgotPassword') {
    window.history.back();
  }
}

async function handleForgotPasswordSubmit(e) {
  e.preventDefault();
  if (!forgotPasswordForm) return;

  const identifier = (forgotPasswordIdentifier?.value || '').trim();
  if (!identifier) {
    showToast('Ingresá tu usuario o correo electrónico.');
    return;
  }

  const submitBtn = document.getElementById('submitForgotPasswordBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';
  }

  try {
    const res = await API.auth.forgotPassword(identifier);
    if (forgotPasswordStatus) {
      forgotPasswordStatus.style.display = 'block';
      forgotPasswordStatus.style.background = 'rgba(105, 210, 166, 0.12)';
      forgotPasswordStatus.style.border = '1px solid rgba(105, 210, 166, 0.3)';
      forgotPasswordStatus.style.color = '#a3e6cb';

      let html = `<strong>¡Solicitud enviada!</strong><br>${escapeHTML(res.message)}`;
      if (res.maskedEmail) {
        html += `<br><span style="color: var(--gold); font-size: 0.8rem;">Enviado a: ${escapeHTML(res.maskedEmail)}</span>`;
      }
      if (res.resetLink && res.simulated) {
        html += `<div style="margin-top: 0.6rem; padding-top: 0.5rem; border-top: 1px dashed rgba(255,255,255,0.15); font-size: 0.78rem;">
          <a href="${res.resetLink}" style="color: var(--gold); font-weight: 600; text-decoration: underline;">👉 Abrir enlace seguro de recuperación</a>
        </div>`;
      }
      forgotPasswordStatus.innerHTML = html;
    }
    showToast('Instrucciones enviadas con éxito.', 5000);
  } catch (err) {
    if (forgotPasswordStatus) {
      forgotPasswordStatus.style.display = 'block';
      forgotPasswordStatus.style.background = 'rgba(255, 107, 107, 0.12)';
      forgotPasswordStatus.style.border = '1px solid rgba(255, 107, 107, 0.3)';
      forgotPasswordStatus.style.color = '#ff9999';
      forgotPasswordStatus.textContent = err.message || 'Error al procesar la solicitud.';
    }
    showToast(err.message || 'Error al procesar solicitud.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar Enlace';
    }
  }
}

async function checkUrlForResetToken() {
  const hash = window.location.hash || '';
  const search = window.location.search || '';

  let token = null;
  if (hash.includes('token=')) {
    const match = hash.match(/token=([a-f0-9]+)/i);
    if (match) token = match[1];
  } else if (search.includes('token=')) {
    const params = new URLSearchParams(search);
    token = params.get('token');
  }

  if (token && (hash.includes('restablecer-clave') || search.includes('token='))) {
    await openResetPasswordModal(token);
  }
}

async function openResetPasswordModal(token) {
  if (!resetPasswordModal) return;
  if (resetPasswordForm) resetPasswordForm.reset();
  if (resetPasswordToken) resetPasswordToken.value = token;
  if (resetPasswordStatus) {
    resetPasswordStatus.style.display = 'none';
    resetPasswordStatus.textContent = '';
  }

  try {
    const verifyRes = await API.auth.verifyResetToken(token);
    if (resetPasswordSubtitle && verifyRes.nombre) {
      resetPasswordSubtitle.innerHTML = `Hola <strong>${escapeHTML(verifyRes.nombre)}</strong> (Usuario: <strong style="color: var(--gold);">${escapeHTML(verifyRes.username)}</strong>), elegí tu nueva contraseña de acceso:`;
    }
    resetPasswordModal.style.display = 'grid';
  } catch (err) {
    showToast(err.message || 'El enlace de recuperación es inválido o ha expirado.', 6000);
    if (window.location.hash.includes('restablecer-clave')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }
}

function closeResetPasswordModalFn(fromPopState = false) {
  if (!resetPasswordModal) return;
  resetPasswordModal.style.display = 'none';
  if (window.location.hash.includes('restablecer-clave')) {
    window.history.replaceState(null, '', window.location.pathname);
  }
}

async function handleResetPasswordSubmit(e) {
  e.preventDefault();
  if (!resetPasswordForm) return;

  const token = resetPasswordToken?.value;
  const newPassword = (resetNewPassword?.value || '').trim();
  const confirmPassword = (resetConfirmPassword?.value || '').trim();

  if (!token) {
    showToast('Token inválido.');
    return;
  }

  if (!newPassword || !confirmPassword) {
    showToast('Completá ambos campos de contraseña.');
    return;
  }

  if (newPassword !== confirmPassword) {
    showToast('Las contraseñas no coinciden.');
    return;
  }

  if (newPassword.length < 6) {
    showToast('La contraseña debe tener al menos 6 caracteres.');
    return;
  }

  const submitBtn = document.getElementById('submitResetPasswordBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Restableciendo...';
  }

  try {
    const res = await API.auth.resetPassword(token, newPassword, confirmPassword);
    showToast(res.message || 'Contraseña restablecida con éxito.', 6000);
    closeResetPasswordModalFn();

    // Redirigir al login y precargar el usuario
    setAuthView('login');
    const loginEmailInput = document.getElementById('loginEmail');
    if (loginEmailInput && res.username) {
      loginEmailInput.value = res.username;
    }
  } catch (err) {
    if (resetPasswordStatus) {
      resetPasswordStatus.style.display = 'block';
      resetPasswordStatus.style.background = 'rgba(255, 107, 107, 0.12)';
      resetPasswordStatus.style.border = '1px solid rgba(255, 107, 107, 0.3)';
      resetPasswordStatus.style.color = '#ff9999';
      resetPasswordStatus.textContent = err.message || 'Error al restablecer la contraseña.';
    }
    showToast(err.message || 'Error al restablecer contraseña.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Restablecer Contraseña';
    }
  }
}

// Admin-assisted password reset functions
async function openAdminResetModalForUser(userId) {
  if (!adminResetLinkModal) return;

  const allUsers = [...(state.approvedUsers || []), ...(state.pendingUsers || [])];
  const user = allUsers.find((u) => String(u.id) === String(userId));
  if (!user) {
    showToast('Vecino no encontrado.');
    return;
  }

  try {
    showToast('Generando enlace seguro...');
    const res = await API.admin.generateResetToken(userId, false);

    let finalResetLink = res.resetLink;
    if (finalResetLink && window.location.pathname.startsWith('/ranchos') && !finalResetLink.includes('/ranchos')) {
      const appBase = window.location.origin + window.location.pathname.replace(/index\.html$/, '').replace(/\/$/, '');
      const match = finalResetLink.match(/token=([a-f0-9]+)/i);
      if (match) {
        finalResetLink = `${appBase}/#restablecer-clave?token=${match[1]}`;
      }
    }

    state.adminResetContext = {
      userId,
      name: `${user.nombre} ${user.apellido}`,
      username: user.username || `Lote ${user.lote || ''}`,
      email: user.email,
      resetLink: finalResetLink
    };

    if (adminResetTargetName) adminResetTargetName.textContent = state.adminResetContext.name;
    if (adminResetTargetUser) adminResetTargetUser.textContent = state.adminResetContext.username;
    if (adminResetTargetEmail) adminResetTargetEmail.textContent = state.adminResetContext.email;
    if (adminResetLinkInput) adminResetLinkInput.value = finalResetLink;

    adminResetLinkModal.style.display = 'grid';
  } catch (err) {
    showToast(err.message || 'Error al generar enlace de restablecimiento.');
  }
}

function closeAdminResetLinkModalFn(fromPopState = false) {
  if (!adminResetLinkModal) return;
  adminResetLinkModal.style.display = 'none';
  state.adminResetContext = null;
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

// ----------------- GUARD TO ADMIN NOTIFICATIONS ----------------- //

const GUARD_TO_ADMIN_PRESETS = {
  custom: {
    title: 'Novedad de Guardia para Administración',
    text: ''
  },
  incidente: {
    title: '🚨 Novedad / Incidente de seguridad en predio',
    text: 'Se informa a la administración que se ha registrado una novedad o incidente de seguridad en el predio. Detalle constatado por el personal de garita: '
  },
  mantenimiento: {
    title: '🔧 Solicitud urgente de mantenimiento o reparación',
    text: 'Se solicita intervención de mantenimiento con carácter prioritario debido a un desperfecto en garita / barrera de acceso / luminaria perimetral: '
  },
  paquete_admin: {
    title: '📦 Correspondencia o paquetería para administración',
    text: 'Ha arribado a la garita correspondencia o paquetería dirigida a la Administración de Rancho Doble S. Queda resguardada en garita para su retiro.'
  },
  consulta: {
    title: '📋 Consulta operativa o de autorización',
    text: 'Se eleva la siguiente consulta operativa a la administración respecto a la autorización o situación de: '
  },
  relevo: {
    title: '🛡️ Reporte o novedad de cierre de turno',
    text: 'Reporte del personal de guardia al cierre de turno sin novedades operativas relevantes / novedades del turno a considerar: '
  }
};

function openGuardNotifyAdminModal() {
  if (!guardNotifyAdminModal) return;
  if (guardNotifyAdminForm) guardNotifyAdminForm.reset();
  if (guardNotifyAdminPresetSelect) guardNotifyAdminPresetSelect.value = 'custom';
  if (guardNotifyAdminTitleInput) guardNotifyAdminTitleInput.value = 'Novedad de Guardia para Administración';
  if (guardNotifyAdminMessageInput) guardNotifyAdminMessageInput.value = '';
  guardNotifyAdminModal.style.display = 'grid';
  window.history.pushState({ modal: 'guardNotifyAdmin', view: state.activeDashboardView }, '', '#guardia-a-admin');
}

function closeGuardNotifyAdminModalFn(fromPopState = false) {
  if (!guardNotifyAdminModal) return;
  guardNotifyAdminModal.style.display = 'none';
  if (!fromPopState && window.history.state?.modal === 'guardNotifyAdmin') {
    window.history.back();
  }
}

async function handleGuardNotifyAdminSubmit(e) {
  e.preventDefault();
  const title = guardNotifyAdminTitleInput ? guardNotifyAdminTitleInput.value.trim() : '';
  const text = guardNotifyAdminMessageInput ? guardNotifyAdminMessageInput.value.trim() : '';

  if (!title || !text) {
    showToast('Por favor completá el título y el mensaje para la administración.');
    return;
  }

  try {
    if (submitGuardNotifyAdminBtn) {
      submitGuardNotifyAdminBtn.disabled = true;
      submitGuardNotifyAdminBtn.textContent = 'Enviando...';
    }

    const res = await API.notifications.guardToAdmin({ title, text });
    showToast(res.message || 'Notificación enviada a la Administración.');
    closeGuardNotifyAdminModalFn(false);
    if (guardNotifyAdminForm) guardNotifyAdminForm.reset();
    await loadNotifications();
  } catch (err) {
    showToast(err.message || 'Error al enviar notificación a la administración.');
  } finally {
    if (submitGuardNotifyAdminBtn) {
      submitGuardNotifyAdminBtn.disabled = false;
      submitGuardNotifyAdminBtn.textContent = '📨 Enviar a Administración';
    }
  }
}

// ----------------- ADMIN TO GUARD NOTIFICATIONS ----------------- //

const ADMIN_TO_GUARD_PRESETS = {
  custom: {
    title: 'Instrucción de Administración para Guardia',
    text: ''
  },
  autorizacion: {
    title: '🚗 Autorización de ingreso especial',
    text: 'Se autoriza por parte de la administración el ingreso del siguiente vehículo / proveedor / visita al lote: '
  },
  seguridad: {
    title: '🚨 Alerta preventiva de seguridad para accesos',
    text: 'Instrucción preventiva para el personal de garita: extremar los controles de ingreso y verificación de patentes durante el día de hoy.'
  },
  obra: {
    title: '🔨 Directiva sobre horarios de obras y proveedores',
    text: 'Recordatorio para garita: el horario de ingreso de cuadrillas de obra y proveedores es de 08:00 a 17:00 hs. No permitir ingresos fuera de ese rango salvo expresa autorización.'
  },
  protocolo: {
    title: '🔄 Actualización de directiva o protocolo de garita',
    text: 'Se instruye al personal de guardia implementar la siguiente directiva operativa en el control de accesos: '
  }
};

function openAdminNotifyGuardModal() {
  if (!adminNotifyGuardModal) return;
  if (adminNotifyGuardForm) adminNotifyGuardForm.reset();
  if (adminNotifyGuardPresetSelect) adminNotifyGuardPresetSelect.value = 'custom';
  if (adminNotifyGuardTitleInput) adminNotifyGuardTitleInput.value = 'Instrucción de Administración para Guardia';
  if (adminNotifyGuardMessageInput) adminNotifyGuardMessageInput.value = '';
  adminNotifyGuardModal.style.display = 'grid';
  window.history.pushState({ modal: 'adminNotifyGuard', view: state.activeDashboardView }, '', '#admin-a-guardia');
}

function closeAdminNotifyGuardModalFn(fromPopState = false) {
  if (!adminNotifyGuardModal) return;
  adminNotifyGuardModal.style.display = 'none';
  if (!fromPopState && window.history.state?.modal === 'adminNotifyGuard') {
    window.history.back();
  }
}

async function handleAdminNotifyGuardSubmit(e) {
  e.preventDefault();
  const title = adminNotifyGuardTitleInput ? adminNotifyGuardTitleInput.value.trim() : '';
  const text = adminNotifyGuardMessageInput ? adminNotifyGuardMessageInput.value.trim() : '';

  if (!title || !text) {
    showToast('Por favor completá el título y la instrucción para la guardia.');
    return;
  }

  try {
    if (submitAdminNotifyGuardBtn) {
      submitAdminNotifyGuardBtn.disabled = true;
      submitAdminNotifyGuardBtn.textContent = 'Enviando...';
    }

    const res = await API.notifications.adminToGuard({ title, text });
    showToast(res.message || 'Instrucción enviada al personal de Guardia.');
    closeAdminNotifyGuardModalFn(false);
    if (adminNotifyGuardForm) adminNotifyGuardForm.reset();
    await loadNotifications();
  } catch (err) {
    showToast(err.message || 'Error al enviar instrucción a la guardia.');
  } finally {
    if (submitAdminNotifyGuardBtn) {
      submitAdminNotifyGuardBtn.disabled = false;
      submitAdminNotifyGuardBtn.textContent = '📨 Enviar a Guardia';
    }
  }
}

// ----------------- ADMIN TO SPECIFIC RESIDENTS NOTIFICATIONS ----------------- //

async function openAdminNotifySpecificResidentsModal() {
  if (!adminNotifySpecificResidentsModal) return;
  state.adminNotifySelectedResidents = new Set();
  state.adminNotifyResidentsSearchQuery = '';
  if (adminNotifyResidentsSearchInput) adminNotifyResidentsSearchInput.value = '';
  if (adminNotifySpecificTitleInput) adminNotifySpecificTitleInput.value = 'Aviso de Administración';
  if (adminNotifySpecificMessageInput) adminNotifySpecificMessageInput.value = '';

  // Ensure approved users roster is available
  if (!state.approvedUsers || state.approvedUsers.length === 0) {
    try {
      const activeUsers = await API.admin.getApprovedUsers();
      state.approvedUsers = activeUsers || [];
    } catch (e) {
      console.warn('Error fetching active users for notification', e);
    }
  }

  renderAdminNotifyResidentsCheckboxes();
  adminNotifySpecificResidentsModal.style.display = 'grid';
  window.history.pushState({ modal: 'adminNotifySpecific', view: state.activeDashboardView }, '', '#notificar-vecinos');
}

function closeAdminNotifySpecificResidentsModalFn(fromPopState = false) {
  if (!adminNotifySpecificResidentsModal) return;
  adminNotifySpecificResidentsModal.style.display = 'none';
  if (!fromPopState && window.history.state?.modal === 'adminNotifySpecific') {
    window.history.back();
  }
}

function updateAdminNotifyCountBadge() {
  if (!adminNotifySelectedCount) return;
  const count = state.adminNotifySelectedResidents ? state.adminNotifySelectedResidents.size : 0;
  adminNotifySelectedCount.textContent = `${count} seleccionado${count === 1 ? '' : 's'}`;
}

function renderAdminNotifyResidentsCheckboxes() {
  if (!adminNotifyResidentsCheckboxesList) return;

  let residents = (state.approvedUsers || []).filter((u) => u.role === 'user' || (u.lote && u.role !== 'guardia'));

  if (state.adminNotifyResidentsSearchQuery && state.adminNotifyResidentsSearchQuery.trim()) {
    const q = state.adminNotifyResidentsSearchQuery.trim().toLowerCase();
    residents = residents.filter((r) => {
      const lote = String(r.lote || '').toLowerCase();
      const manzana = String(r.manzana || '').toLowerCase();
      const dni = String(r.numeroDocumento || '').toLowerCase();
      const nombre = String(r.nombre || '').toLowerCase();
      const apellido = String(r.apellido || '').toLowerCase();
      const user = String(r.username || '').toLowerCase();
      const email = String(r.email || '').toLowerCase();
      return (
        lote.includes(q) ||
        `l${lote}`.includes(q) ||
        `l${lote}m${manzana}`.includes(q) ||
        dni.includes(q) ||
        nombre.includes(q) ||
        apellido.includes(q) ||
        `${nombre} ${apellido}`.includes(q) ||
        user.includes(q) ||
        email.includes(q)
      );
    });
  }

  if (residents.length === 0) {
    adminNotifyResidentsCheckboxesList.innerHTML = `
      <div style="padding: 0.8rem; text-align: center; color: var(--muted); font-size: 0.82rem;">
        No se encontraron vecinos habilitados que coincidan con la búsqueda.
      </div>
    `;
    updateAdminNotifyCountBadge();
    return;
  }

  adminNotifyResidentsCheckboxesList.innerHTML = residents
    .map((r) => {
      const isChecked = state.adminNotifySelectedResidents.has(Number(r.id)) || state.adminNotifySelectedResidents.has(String(r.id));
      const loc = r.lote || r.manzana ? `Lote ${escapeHTML(r.lote || '-')}, Mz ${escapeHTML(r.manzana || '-')}` : 'Sin lote';
      return `
        <label style="display: flex; align-items: center; gap: 0.6rem; padding: 0.4rem 0.6rem; border-radius: 6px; background: rgba(255,255,255,0.03); cursor: pointer; user-select: none;">
          <input type="checkbox" class="admin-notify-resident-cb" value="${r.id}" ${isChecked ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px;" />
          <div style="font-size: 0.83rem; flex: 1;">
            <strong style="color: #fff;">${escapeHTML(r.apellido)}, ${escapeHTML(r.nombre)}</strong>
            <span style="color: var(--muted); font-size: 0.76rem;"> · 📍 ${loc} · 🪪 DNI ${escapeHTML(r.numeroDocumento || '-')}</span>
          </div>
        </label>
      `;
    })
    .join('');

  adminNotifyResidentsCheckboxesList.querySelectorAll('.admin-notify-resident-cb').forEach((cb) => {
    cb.addEventListener('change', (e) => {
      const val = Number(e.target.value);
      if (e.target.checked) {
        state.adminNotifySelectedResidents.add(val);
      } else {
        state.adminNotifySelectedResidents.delete(val);
      }
      updateAdminNotifyCountBadge();
    });
  });

  updateAdminNotifyCountBadge();
}

async function handleAdminNotifySpecificSubmit(e) {
  e.preventDefault();
  const residentIds = Array.from(state.adminNotifySelectedResidents || []);
  const title = adminNotifySpecificTitleInput ? adminNotifySpecificTitleInput.value.trim() : '';
  const text = adminNotifySpecificMessageInput ? adminNotifySpecificMessageInput.value.trim() : '';

  if (residentIds.length === 0) {
    showToast('Por favor seleccioná al menos un vecino destinatario.');
    return;
  }

  if (!title || !text) {
    showToast('Por favor completá el título y el mensaje.');
    return;
  }

  try {
    if (submitAdminNotifySpecificBtn) {
      submitAdminNotifySpecificBtn.disabled = true;
      submitAdminNotifySpecificBtn.textContent = 'Enviando...';
    }

    const res = await API.notifications.adminNotifyResidents({ residentIds, title, text });
    showToast(res.message || `Notificación privada enviada a ${residentIds.length} vecino(s).`);
    closeAdminNotifySpecificResidentsModalFn(false);
    if (adminNotifySpecificResidentsForm) adminNotifySpecificResidentsForm.reset();
    state.adminNotifySelectedResidents.clear();
    await loadNotifications();
  } catch (err) {
    showToast(err.message || 'Error al enviar notificación a los vecinos.');
  } finally {
    if (submitAdminNotifySpecificBtn) {
      submitAdminNotifySpecificBtn.disabled = false;
      submitAdminNotifySpecificBtn.textContent = '📨 Enviar a Vecinos Seleccionados';
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
          if (state.authenticatedUser?.role === 'guardia') {
            loadGuardData();
          } else {
            loadAdminData();
          }
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
          if (state.authenticatedUser?.role === 'guardia') {
            loadGuardData();
          } else {
            loadAdminData();
          }
        } catch (e) {
          showToast(e.message);
        }
      });
    }
  }

  scannedVisitResult.style.display = 'block';
  scannedVisitResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ----------------- GUARD PANEL FUNCTIONS (@guardia) ----------------- //

async function loadGuardData() {
  if (state.authenticatedUser?.role !== 'guardia') return;
  await Promise.all([
    loadGuardVisits(),
    loadGuardResidentNotices(),
    loadNotifications()
  ]);
}

async function loadGuardVisits() {
  try {
    const visits = await API.visits.get({ all: 'true' });
    state.guardVisits = visits || [];
    renderGuardVisits();
  } catch (error) {
    console.error('Error cargando visitas en garita:', error);
  }
}

function renderGuardVisits() {
  if (!guardVisitsList) return;

  let visits = state.guardVisits || [];
  const insideCount = visits.filter((v) => v.status === 'Ingresado').length;
  if (guardVehiclesInsideBadge) {
    guardVehiclesInsideBadge.textContent = `${insideCount} en predio`;
  }

  // Filter by status tab
  const filter = state.guardVisitsFilter || 'all';
  if (filter === 'inside') {
    visits = visits.filter((v) => v.status === 'Ingresado');
  } else if (filter === 'expected') {
    visits = visits.filter((v) => v.status === 'Confirmada' || v.status === 'Pendiente');
  } else if (filter === 'exited') {
    visits = visits.filter((v) => v.status === 'Egresado');
  }

  // Filter by search query
  const query = (state.guardPlateQuery || '').trim().toLowerCase();
  if (query) {
    visits = visits.filter((v) => {
      const plate = (v.vehiclePlate || '').toLowerCase();
      const dni = (v.visitorDni || '').toLowerCase();
      const name = (v.visitorName || '').toLowerCase();
      const resName = (v.residentName || '').toLowerCase();
      return plate.includes(query) || dni.includes(query) || name.includes(query) || resName.includes(query);
    });
  }

  if (guardVisitsCountBadge) {
    guardVisitsCountBadge.textContent = `${visits.length} registro${visits.length === 1 ? '' : 's'}`;
  }

  if (visits.length === 0) {
    guardVisitsList.innerHTML = `
      <li class="visit-item" style="text-align: center; padding: 1.5rem; color: var(--muted); justify-content: center;">
        <div>
          <strong style="display: block; font-size: 1rem; color: #fff; margin-bottom: 0.25rem;">
            ${query ? 'No se encontraron visitantes con los datos ingresados' : 'No hay visitas en esta categoría'}
          </strong>
          <small>${query ? 'Probá buscando por letras de la patente, DNI o apellido.' : 'Los registros aparecerán aquí automáticamente cuando los vecinos registren visitas.'}</small>
        </div>
      </li>
    `;
    return;
  }

  guardVisitsList.innerHTML = visits
    .map((visit) => {
      const isInside = visit.status === 'Ingresado';
      const isExited = visit.status === 'Egresado';
      const plateFormatted = visit.vehiclePlate ? escapeHTML(visit.vehiclePlate) : 'Sin vehículo';

      let statusBadge = '';
      if (isInside) {
        statusBadge = `<span class="badge soft" style="background: rgba(105, 210, 166, 0.2); color: var(--primary); border: 1px solid rgba(105, 210, 166, 0.4);">🟢 En predio</span>`;
      } else if (isExited) {
        statusBadge = `<span class="badge soft" style="background: rgba(255, 255, 255, 0.08); color: var(--muted); border: 1px solid rgba(255, 255, 255, 0.15);">🚪 Egresó</span>`;
      } else {
        statusBadge = `<span class="badge soft" style="background: rgba(247, 199, 109, 0.2); color: var(--gold); border: 1px solid rgba(247, 199, 109, 0.4);">⏳ Esperada (${escapeHTML(visit.status)})</span>`;
      }

      const entryTime = visit.entryAt
        ? `<small style="display: block; color: var(--gold); font-size: 0.8rem; margin-top: 0.15rem;">🟢 Ingresó: ${new Date(visit.entryAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs</small>`
        : '';
      const exitTime = visit.exitAt
        ? `<small style="display: block; color: var(--muted); font-size: 0.8rem; margin-top: 0.15rem;">🚪 Egresó: ${new Date(visit.exitAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs</small>`
        : '';

      let actionButtons = '';
      if (!isInside && !isExited) {
        actionButtons = `
          <button type="button" class="btn-inline-action success guard-confirm-entry-btn" data-id="${visit.id}" data-name="${escapeHTML(visit.visitorName)}" data-plate="${plateFormatted}">
            🟢 Confirmar Ingreso
          </button>
        `;
      } else if (isInside) {
        actionButtons = `
          <button type="button" class="btn-inline-action danger guard-confirm-exit-btn" data-id="${visit.id}" data-name="${escapeHTML(visit.visitorName)}" data-plate="${plateFormatted}">
            🚪 Confirmar Egreso
          </button>
        `;
      }

      return `
        <li class="visit-item guard-visit-card">
          <div class="guard-visit-header">
            <div class="guard-visit-info">
              <div class="guard-visit-tags">
                <span class="badge soft guard-plate-badge">
                  🚗 ${plateFormatted}
                </span>
                ${statusBadge}
              </div>
              <strong class="guard-visitor-name">${escapeHTML(visit.visitorName)}</strong>
              <small class="guard-visitor-dest">DNI: <strong>${escapeHTML(visit.visitorDni)}</strong> · Destino: <strong>${escapeHTML(visit.residentName)}</strong></small>
              ${entryTime}
              ${exitTime}
            </div>

            <div class="visit-actions guard-visit-actions">
              ${actionButtons}
              <button type="button" class="btn-inline-action guard-view-qr-btn" data-id="${visit.id}" title="Ver código QR del pase">
                📱 Ver Pase QR
              </button>
            </div>
          </div>
          <div class="visit-meta guard-visit-meta">
            <span>📅 Fecha prevista: ${escapeHTML(visit.date)} a las ${escapeHTML(visit.time)} hs</span>
          </div>
        </li>
      `;
    })
    .join('');

  // Event handlers for Confirmar Ingreso
  guardVisitsList.querySelectorAll('.guard-confirm-entry-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const visitId = btn.dataset.id;
      const visitorName = btn.dataset.name;
      const plate = btn.dataset.plate;
      btn.disabled = true;
      try {
        await API.visits.updateStatus(visitId, 'Ingresado');
        showToast(`🟢 Ingreso confirmado: ${visitorName} (Patente: ${plate})`);
        await loadGuardVisits();
      } catch (err) {
        showToast(err.message || 'Error al registrar ingreso.');
        btn.disabled = false;
      }
    });
  });

  // Event handlers for Confirmar Egreso
  guardVisitsList.querySelectorAll('.guard-confirm-exit-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const visitId = btn.dataset.id;
      const visitorName = btn.dataset.name;
      const plate = btn.dataset.plate;
      btn.disabled = true;
      try {
        await API.visits.updateStatus(visitId, 'Egresado');
        showToast(`🚪 Egreso confirmado: ${visitorName} (Patente: ${plate})`);
        await loadGuardVisits();
      } catch (err) {
        showToast(err.message || 'Error al registrar egreso.');
        btn.disabled = false;
      }
    });
  });

  // Event handlers for Ver Pase QR
  guardVisitsList.querySelectorAll('.guard-view-qr-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const visit = state.guardVisits.find((v) => String(v.id) === String(btn.dataset.id));
      if (visit) showQrPassModal(visit);
    });
  });
}

async function loadGuardActivityLogs() {
  // Activity audit is restricted to administrators only.
  return;
}

function renderGuardActivityLogs() {
  return;
}

async function handleGuardShiftChange() {
  if (!confirm('¿Confirmás el cambio de guardia? Se cerrará la sesión actual para dar paso al nuevo operador.')) {
    return;
  }
  try {
    await API.activityLogs.log('CAMBIO_GUARDIA', 'Cierre de sesión / Cambio de turno de guardia');
    await API.auth.logout();
  } catch (e) {}

  handleLogout();

  const loginEmailInput = document.getElementById('loginEmail');
  if (loginEmailInput) {
    loginEmailInput.value = '';
    loginEmailInput.placeholder = 'ej: jorgecabral@guardia';
    loginEmailInput.focus();
  }
  showToast('Cambio de guardia completado. Ingrese las credenciales del operador entrante.');
}

// =========================================================================
// AVISOS A GUARDIA & NOTIFICACIONES DE GUARDIA A VECINOS
// =========================================================================

const NOTICE_CATEGORY_CONFIG = {
  'Delivery': {
    icon: '🛵',
    tag: 'Ingreso',
    companyLabel: 'Empresa / Comercio / Repartidor (opcional)',
    companyPlaceholder: 'Ej: PedidosYa, Rappi, Coto, etc.',
    detailsPlaceholder: 'Ej: Llega repartidor de PedidosYa en moto roja. Autorizo el ingreso al Lote.'
  },
  'Proveedor de servicios': {
    icon: '🔧',
    tag: 'Trabajos',
    companyLabel: 'Proveedor / Empresa / Rubro (opcional)',
    companyPlaceholder: 'Ej: Piletero Juan Pérez / Jardinero',
    detailsPlaceholder: 'Ej: Ingresa jardinero Carlos Gómez (DNI ...) a realizar corte de pasto en el día de hoy.'
  },
  'Consulta de ingresos': {
    icon: '🔍',
    tag: 'Control',
    companyLabel: 'Persona o servicio a consultar (opcional)',
    companyPlaceholder: 'Ej: Flete / Técnico de internet / Visita',
    detailsPlaceholder: 'Ej: Deseo consultar si ingresó el service técnico de internet o si se encuentra alguien en el lote.'
  },
  'Animales sueltos': {
    icon: '🐕',
    tag: 'Alerta',
    companyLabel: 'Ubicación observada / Raza (opcional)',
    companyPlaceholder: 'Ej: Calle Los Álamos / Labrador dorado',
    detailsPlaceholder: 'Ej: Hay un perro labrador suelto sobre la calle principal cerca del lote 5.'
  },
  'Otros…': {
    icon: '📝',
    tag: 'General',
    companyLabel: 'Referencia u organismo (opcional)',
    companyPlaceholder: 'Ej: Consulta general / Inspección',
    detailsPlaceholder: 'Escribí tu consulta, observación o aviso particular para el personal de garita...'
  }
};

function setNoticeCategory(category) {
  state.activeNoticeCategory = category;
  const config = NOTICE_CATEGORY_CONFIG[category] || NOTICE_CATEGORY_CONFIG['Otros…'];

  // Update category buttons active state
  document.querySelectorAll('.notice-option-card').forEach((btn) => {
    const isSelected = btn.dataset.noticeCat === category;
    btn.classList.toggle('active', isSelected);
  });

  if (guardNoticeCategoryInput) {
    guardNoticeCategoryInput.value = category;
  }

  if (selectedNoticeCategoryBadge) {
    selectedNoticeCategoryBadge.textContent = `${config.icon} ${category}`;
  }

  if (guardNoticeCompanyLabel) {
    guardNoticeCompanyLabel.textContent = config.companyLabel;
  }

  if (guardNoticeCompanyInput) {
    guardNoticeCompanyInput.placeholder = config.companyPlaceholder;
  }

  if (guardNoticeDetailsInput) {
    guardNoticeDetailsInput.placeholder = config.detailsPlaceholder;
  }
}

async function loadResidentGuardNotices() {
  if (!state.authenticatedUser) return;
  try {
    const notices = await API.guardNotices.get();
    state.residentNotices = notices || [];
    renderResidentGuardNotices();
  } catch (error) {
    console.error('Error cargando avisos de guardia del residente:', error);
  }
}

function renderResidentGuardNotices() {
  if (!residentNoticesList) return;
  const notices = state.residentNotices || [];

  if (residentNoticesCountBadge) {
    residentNoticesCountBadge.textContent = `${notices.length} aviso${notices.length === 1 ? '' : 's'}`;
  }

  if (notices.length === 0) {
    residentNoticesList.innerHTML = `
      <div style="text-align: center; padding: 1.5rem; color: var(--muted); background: rgba(255,255,255,0.02); border-radius: var(--radius-sm); border: 1px dashed rgba(255,255,255,0.1);">
        <span style="font-size: 1.8rem; display: block; margin-bottom: 0.35rem;">🛎️</span>
        <strong style="color: #fff; display: block; font-size: 0.95rem;">Aún no enviaste avisos a la guardia</strong>
        <p style="font-size: 0.82rem; margin: 0.25rem 0 0 0;">Seleccioná una opción arriba para coordinar entregas o informar novedades al puesto de acceso.</p>
      </div>
    `;
    return;
  }

  residentNoticesList.innerHTML = notices
    .map((notice) => {
      const isPending = notice.status === 'Pendiente';
      const cfg = NOTICE_CATEGORY_CONFIG[notice.category] || { icon: '🛎️' };
      const date = new Date(notice.createdAt);
      const dateStr = date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let statusBadge = '';
      if (isPending) {
        statusBadge = `<span class="badge soft" style="background: rgba(245, 158, 11, 0.18); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.35);">🟡 Pendiente en guardia</span>`;
      } else {
        statusBadge = `<span class="badge soft" style="background: rgba(16, 185, 129, 0.18); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.35);">🟢 Atendido</span>`;
      }

      let extraInfo = '';
      if (notice.company || notice.timeEstimated) {
        const parts = [];
        if (notice.company) parts.push(`<strong>Empresa/Repartidor:</strong> ${escapeHTML(notice.company)}`);
        if (notice.timeEstimated) parts.push(`<strong>Horario estimado:</strong> ${escapeHTML(notice.timeEstimated)}`);
        extraInfo = `<div style="font-size: 0.82rem; color: var(--gold); margin-bottom: 0.35rem;">${parts.join(' · ')}</div>`;
      }

      let responseBlock = '';
      if (notice.response || notice.resolvedBy) {
        const resDate = notice.resolvedAt ? new Date(notice.resolvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        responseBlock = `
          <div class="notice-item-response">
            <span>🛡️</span>
            <div>
              <strong>Atendido por ${escapeHTML(notice.resolvedBy || 'Personal de Guardia')}</strong> ${resDate ? `(${resDate} hs)` : ''}
              ${notice.response ? `<div style="margin-top: 0.2rem; color: #fff;">${escapeHTML(notice.response)}</div>` : ''}
            </div>
          </div>
        `;
      }

      return `
        <div class="guard-notice-item-card ${isPending ? 'pending' : 'attended'}">
          <div class="notice-item-header">
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <span style="font-size: 1.25rem;">${cfg.icon}</span>
              <strong style="font-size: 1rem; color: #fff;">${escapeHTML(notice.category)}</strong>
              ${statusBadge}
            </div>
            <span class="notice-item-meta">📅 ${dateStr} ${timeStr} hs</span>
          </div>

          ${extraInfo}

          <div class="notice-item-details">
            ${escapeHTML(notice.details)}
          </div>

          ${responseBlock}
        </div>
      `;
    })
    .join('');
}

// ----------------- GUARD RESIDENT NOTICES & NOTIFICATION FUNCTIONS ----------------- //

async function loadGuardResidentNotices() {
  try {
    const notices = await API.guardNotices.get();
    state.guardNotices = notices || [];
    renderGuardResidentNotices();
  } catch (error) {
    console.error('Error cargando avisos de residentes en garita:', error);
  }
}

function renderGuardResidentNotices() {
  if (!guardResidentNoticesList) return;

  const notices = state.guardNotices || [];
  const pendingCount = notices.filter((n) => n.status === 'Pendiente').length;

  if (guardResidentNoticesBadge) {
    guardResidentNoticesBadge.textContent = `${pendingCount} pendiente${pendingCount === 1 ? '' : 's'}`;
  }

  let filtered = notices;
  const filter = state.guardNoticeFilter || 'all';
  if (filter === 'pending') {
    filtered = notices.filter((n) => n.status === 'Pendiente');
  } else if (filter === 'attended') {
    filtered = notices.filter((n) => n.status === 'Atendido' || n.status === 'Finalizado');
  }

  if (guardResidentNoticesCountBadge) {
    guardResidentNoticesCountBadge.textContent = `${filtered.length} aviso${filtered.length === 1 ? '' : 's'}`;
  }

  if (filtered.length === 0) {
    guardResidentNoticesList.innerHTML = `
      <div style="text-align: center; padding: 1.5rem; color: var(--muted); background: rgba(255,255,255,0.02); border-radius: var(--radius-sm); border: 1px dashed rgba(255,255,255,0.1);">
        <span style="font-size: 1.8rem; display: block; margin-bottom: 0.35rem;">🛎️</span>
        <strong style="color: #fff; display: block; font-size: 0.95rem;">No hay avisos en esta sección</strong>
        <p style="font-size: 0.82rem; margin: 0.25rem 0 0 0;">Los avisos de delivery, servicios y consultas de los vecinos aparecerán aquí automáticamente.</p>
      </div>
    `;
    return;
  }

  guardResidentNoticesList.innerHTML = filtered
    .map((notice) => {
      const isPending = notice.status === 'Pendiente';
      const cfg = NOTICE_CATEGORY_CONFIG[notice.category] || { icon: '🛎️' };
      const date = new Date(notice.createdAt);
      const dateStr = date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let statusBadge = isPending
        ? `<span class="badge soft" style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.4);">🟡 Pendiente</span>`
        : `<span class="badge soft" style="background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.4);">🟢 Atendido</span>`;

      const locationStr = notice.lote || notice.manzana ? `(Lote ${escapeHTML(notice.lote || '-')}, Mz ${escapeHTML(notice.manzana || '-')})` : '';

      let extraInfo = '';
      if (notice.company || notice.timeEstimated) {
        const parts = [];
        if (notice.company) parts.push(`<strong>Empresa/Repartidor:</strong> ${escapeHTML(notice.company)}`);
        if (notice.timeEstimated) parts.push(`<strong>Horario estimado:</strong> ${escapeHTML(notice.timeEstimated)}`);
        extraInfo = `<div style="font-size: 0.82rem; color: var(--gold); margin-bottom: 0.25rem;">${parts.join(' · ')}</div>`;
      }

      let responseBlock = '';
      if (notice.response || notice.resolvedBy) {
        const resTime = notice.resolvedAt ? new Date(notice.resolvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        responseBlock = `
          <div class="notice-item-response" style="margin-top: 0.4rem;">
            <span>🛡️</span>
            <div>
              <strong>Atendido por ${escapeHTML(notice.resolvedBy || 'Personal de Guardia')}</strong> ${resTime ? `(${resTime} hs)` : ''}
              ${notice.response ? `<div style="color: #fff; margin-top: 0.15rem;">${escapeHTML(notice.response)}</div>` : ''}
            </div>
          </div>
        `;
      }

      let actionButtons = '';
      if (isPending) {
        actionButtons = `
          <button type="button" class="btn-inline-action success btn-attend-notice" data-notice-id="${notice.id}" style="font-size: 0.82rem; padding: 0.4rem 0.8rem; font-weight: 700;">
            ✅ Marcar como Atendido
          </button>
        `;
      }

      return `
        <div class="guard-notice-item-card ${isPending ? 'pending' : 'attended'}">
          <div class="notice-item-header">
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span style="font-size: 1.25rem;">${cfg.icon}</span>
                <strong style="font-size: 1rem; color: #fff;">${escapeHTML(notice.category)}</strong>
                ${statusBadge}
              </div>
              <div style="font-size: 0.88rem; color: #fff; margin-top: 0.25rem;">
                🏡 <strong>${escapeHTML(notice.residentName)}</strong> <span style="color: var(--gold);">${locationStr}</span>
              </div>
            </div>
            <span class="notice-item-meta">📅 ${dateStr} ${timeStr} hs</span>
          </div>

          ${extraInfo}

          <div class="notice-item-details">
            ${escapeHTML(notice.details)}
          </div>

          ${responseBlock}

          <div style="display: flex; gap: 0.5rem; justify-content: flex-end; flex-wrap: wrap; margin-top: 0.4rem; padding-top: 0.5rem; border-top: 1px solid rgba(255, 255, 255, 0.06);">
            ${actionButtons}
            <button type="button" class="btn-inline-action btn-notify-resident-from-notice" data-user-id="${notice.userId}" data-cat="${escapeHTML(notice.category)}" data-name="${escapeHTML(notice.residentName)}" style="font-size: 0.82rem; padding: 0.4rem 0.8rem;">
              💬 Notificar al Vecino
            </button>
          </div>
        </div>
      `;
    })
    .join('');
}

async function handleAttendNotice(noticeId) {
  const customResponse = prompt('¿Deseás agregar una respuesta o aclaración para el vecino? (Opcional, podés dejar vacío para marcar atendido directo):');
  if (customResponse === null) return; // user cancelled prompt

  try {
    await API.guardNotices.updateStatus(noticeId, {
      status: 'Atendido',
      response: customResponse.trim() || undefined
    });
    showToast('Aviso marcado como atendido. Notificación enviada al vecino.');
    await loadGuardResidentNotices();
  } catch (error) {
    showToast(error.message || 'Error al actualizar estado del aviso.');
  }
}

// ----------------- GUARD TO RESIDENT NOTIFICATION MODAL ----------------- //

async function openGuardNotifyResidentModal(targetUserId = null, defaultTitle = '', defaultMessage = '') {
  try {
    if (!state.guardResidentsList || state.guardResidentsList.length === 0) {
      const residents = await API.guardNotices.getResidents();
      state.guardResidentsList = residents || [];
    }
  } catch (err) {
    console.error('Error cargando lista de residentes para guardia:', err);
  }

  if (guardNotifyTargetSelect) {
    const list = state.guardResidentsList || [];
    if (list.length === 0) {
      guardNotifyTargetSelect.innerHTML = '<option value="">No se encontraron vecinos registrados activos</option>';
    } else {
      guardNotifyTargetSelect.innerHTML = `
        <option value="">-- Seleccionar vecino destinatario (${list.length} disponibles) --</option>
        ${list
          .map((r) => {
            const loc = r.lote || r.manzana ? `(Lote ${escapeHTML(r.lote || '-')}, Mz ${escapeHTML(r.manzana || '-')})` : '';
            return `<option value="${r.id}">${escapeHTML(r.apellido)}, ${escapeHTML(r.nombre)} ${loc} — ${escapeHTML(r.username || r.email)}</option>`;
          })
          .join('')}
      `;
    }

    if (targetUserId) {
      guardNotifyTargetSelect.value = String(targetUserId);
      updateSelectedNeighborDetails(targetUserId);
    } else {
      if (guardNotifySelectedNeighborInfo) guardNotifySelectedNeighborInfo.style.display = 'none';
    }
  }

  if (guardNotifyTitleInput) {
    guardNotifyTitleInput.value = defaultTitle || 'Aviso de Guardia';
  }

  if (guardNotifyMessageInput) {
    guardNotifyMessageInput.value = defaultMessage || '';
  }

  if (guardNotifyPresetSelect) {
    guardNotifyPresetSelect.value = 'custom';
  }

  if (guardNotifyResidentModal) {
    guardNotifyResidentModal.style.display = 'flex';
  }

  setTimeout(() => {
    if (targetUserId && guardNotifyMessageInput) {
      guardNotifyMessageInput.focus();
    } else if (guardNotifyTargetSelect) {
      guardNotifyTargetSelect.focus();
    }
  }, 100);
}

function closeGuardNotifyResidentModalFn() {
  if (guardNotifyResidentModal) {
    guardNotifyResidentModal.style.display = 'none';
  }
}

function updateSelectedNeighborDetails(userId) {
  if (!guardNotifySelectedNeighborInfo) return;
  const numId = Number(userId);
  const resident = (state.guardResidentsList || []).find((r) => r.id === numId);

  if (!resident) {
    guardNotifySelectedNeighborInfo.style.display = 'none';
    return;
  }

  guardNotifySelectedNeighborInfo.style.display = 'block';
  if (guardNotifyNeighborName) {
    guardNotifyNeighborName.textContent = `${resident.nombre} ${resident.apellido}`;
  }
  if (guardNotifyNeighborLocation) {
    const loc = resident.lote || resident.manzana ? `Lote ${resident.lote || '-'} · Manzana ${resident.manzana || '-'}` : 'Sin lote asignado';
    guardNotifyNeighborLocation.textContent = `(${loc})`;
  }
  if (guardNotifyNeighborPhone) {
    guardNotifyNeighborPhone.textContent = resident.telefono || 'Sin teléfono';
  }
}

async function loadAdminAuditLogs() {
  if (state.authenticatedUser?.role !== 'admin') return;
  try {
    const params = { limit: 300 };
    if (state.adminAuditRoleFilter && state.adminAuditRoleFilter !== 'all') {
      params.role = state.adminAuditRoleFilter;
    }
    if (state.adminAuditSearchQuery && state.adminAuditSearchQuery.trim()) {
      params.search = state.adminAuditSearchQuery.trim();
    }
    const logs = await API.activityLogs.get(params);
    state.adminAuditLogs = logs || [];
    renderAdminAuditLogs();
  } catch (err) {
    console.error('Error cargando registros de auditoría general:', err);
  }
}

// Backward compatibility alias
async function loadAdminGuardLogs() {
  return loadAdminAuditLogs();
}

function renderAdminAuditLogs() {
  const targetContainer = adminGlobalAuditLogsList || adminGuardLogsList;
  if (!targetContainer) return;

  const logs = state.adminAuditLogs || [];
  if (adminAuditLogsCountBadge) {
    adminAuditLogsCountBadge.textContent = `${logs.length} acci${logs.length === 1 ? 'ón' : 'ones'}`;
  }

  if (logs.length === 0) {
    targetContainer.innerHTML = `
      <div style="padding: 1.6rem; text-align: center; color: var(--muted); background: rgba(255,255,255,0.02); border-radius: var(--radius-sm); border: 1px dashed rgba(255,255,255,0.08);">
        No se encontraron registros de auditoría para los filtros seleccionados.
      </div>
    `;
    return;
  }

  targetContainer.innerHTML = logs
    .map((log) => {
      const date = new Date(log.createdAt);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });

      let badgeColor = 'rgba(212, 163, 89, 0.2)';
      let badgeTextColor = 'var(--gold)';
      const act = String(log.action || '').toUpperCase();

      if (act.includes('INGRESO') || act.includes('APROBAR') || act.includes('ACREDITAR')) {
        badgeColor = 'rgba(105, 210, 166, 0.2)';
        badgeTextColor = 'var(--primary)';
      } else if (act.includes('EGRESO') || act.includes('RECHAZAR') || act.includes('CAMBIO') || act.includes('ELIMINAR') || act.includes('BAJA')) {
        badgeColor = 'rgba(255, 122, 122, 0.2)';
        badgeTextColor = 'var(--danger)';
      } else if (act.includes('LOGIN') || act.includes('TURNO')) {
        badgeColor = 'rgba(138, 206, 255, 0.2)';
        badgeTextColor = 'var(--secondary)';
      } else if (act.includes('NOTIFICACION')) {
        badgeColor = 'rgba(192, 132, 252, 0.2)';
        badgeTextColor = '#c084fc';
      } else if (act.includes('AVISO')) {
        badgeColor = 'rgba(245, 158, 11, 0.2)';
        badgeTextColor = '#f59e0b';
      } else if (act.includes('EMISION') || act.includes('EXPENSA')) {
        badgeColor = 'rgba(56, 189, 248, 0.2)';
        badgeTextColor = '#38bdf8';
      }

      let roleBadge = '';
      const r = String(log.userRole || '').toLowerCase();
      if (r === 'admin') {
        roleBadge = '<span class="badge soft" style="background: rgba(247, 199, 109, 0.2); color: var(--gold); font-size: 0.7rem;">👑 Admin</span>';
      } else if (r === 'guardia') {
        roleBadge = '<span class="badge soft" style="background: rgba(105, 210, 166, 0.2); color: var(--primary); font-size: 0.7rem;">🛡️ Guardia</span>';
      } else {
        roleBadge = '<span class="badge soft" style="background: rgba(138, 206, 255, 0.2); color: var(--secondary); font-size: 0.7rem;">👤 Vecino</span>';
      }

      return `
        <div class="guard-log-item">
          <div class="guard-log-info">
            <div class="guard-log-badge-row">
              <span class="badge soft guard-log-badge" style="background: ${badgeColor}; color: ${badgeTextColor};">${escapeHTML(log.action)}</span>
              ${roleBadge}
              <strong class="guard-log-detail">${escapeHTML(log.details || '')}</strong>
            </div>
            <small class="guard-log-operator">
              Operador: <strong>${escapeHTML(log.userName || 'Usuario')}</strong>
              ${log.ip ? ` · <span style="opacity: 0.6;">IP: ${escapeHTML(log.ip)}</span>` : ''}
            </small>
          </div>
          <span class="guard-log-time" style="font-size: 0.78rem; opacity: 0.8; white-space: nowrap;">${dateStr} ${timeStr}</span>
        </div>
      `;
    })
    .join('');
}

// ----------------- AUTHENTICATION FLOWS ----------------- //

async function handleLogin(event) {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '').trim();

  if (!email || !password) {
    showToast('Por favor completá usuario y contraseña.');
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
    'apellido', 'nombre', 'tipoDocumento', 'numeroDocumento', 'lote', 'manzana', 'telefono', 'email', 'password', 'confirmPassword'
  ];

  const missing = requiredFields.find((f) => !String(values[f] || '').trim());
  if (missing) {
    if (registerStatus) registerStatus.textContent = 'Completá todos los campos obligatorios, incluyendo lote y manzana.';
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
    if (registerUsernamePreview) registerUsernamePreview.style.display = 'none';

    // Regresar al inicio de sesión y precargar el usuario generado (ej: L2M9)
    setAuthView('login');
    const loginEmailInput = document.getElementById('loginEmail');
    if (loginEmailInput && res.username) {
      loginEmailInput.value = res.username;
    }

    const message = 'Registro exitoso. La administración acreditará tu cuenta en breve.';
    showToast(message, 6000);
    if (registerStatus) registerStatus.textContent = '';
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
  if (state.authenticatedUser?.role === 'guardia') {
    initialView = 'guard';
  } else if (['qr-modal', 'notificaciones', 'nueva-publicacion', 'emitir-expensas', 'escanear-qr'].includes(initialView)) {
    initialView = 'home';
  }
  setDashboardView(initialView, false);
  window.history.replaceState({ view: state.activeDashboardView }, '', window.location.hash || window.location.pathname);

  loadNotifications();

  if (state.authenticatedUser?.role === 'admin') {
    loadAdminData();
  } else if (state.authenticatedUser?.role === 'guardia') {
    loadGuardData();
  }
}

// ----------------- INITIALIZATION & LISTENERS ----------------- //

function attachEventListeners() {
  authTabs.forEach((tab) => {
    tab.addEventListener('click', () => setAuthView(tab.dataset.authView));
  });

  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
  if (registerLote) registerLote.addEventListener('input', updateRegisterUsernamePreview);
  if (registerManzana) registerManzana.addEventListener('input', updateRegisterUsernamePreview);
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (state.authenticatedUser?.role === 'guardia') {
        handleGuardShiftChange();
      } else {
        handleLogout();
      }
    });
  }
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

  // Notification role filters (Admin only)
  document.querySelectorAll('.notif-role-filter').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.notificationRoleFilter = btn.dataset.roleFilter;
      document.querySelectorAll('.notif-role-filter').forEach((b) => {
        b.classList.toggle('active', b.dataset.roleFilter === state.notificationRoleFilter);
      });
      renderNotifications();
    });
  });

  // Admin news creation modal
  function openCreateNews() {
    if (!createNewsModal) return;
    createNewsModal.style.display = 'grid';
    window.history.pushState({ modal: 'createNews', view: state.activeDashboardView }, '', '#nueva-publicacion');
  }

  function closeCreateNews(fromPopState = false) {
    if (!createNewsModal) return;
    createNewsModal.style.display = 'none';
    resetCreateNewsModal();
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

  if (newsImageFileInput) {
    newsImageFileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        showToast('Procesando imagen...');
        const dataUrl = await compressImageFile(file, 1200, 900, 0.8);
        state.newsUploadedImageBase64 = dataUrl;
        if (newsImagePreview) newsImagePreview.src = dataUrl;
        if (newsImagePreviewContainer) newsImagePreviewContainer.style.display = 'block';
        showToast('Foto cargada correctamente.');
      } catch (err) {
        showToast(err.message || 'Error al procesar la foto.');
        if (newsImageFileInput) newsImageFileInput.value = '';
      }
    });
  }

  if (removeNewsImageBtn) {
    removeNewsImageBtn.addEventListener('click', () => {
      state.newsUploadedImageBase64 = null;
      if (newsImageFileInput) newsImageFileInput.value = '';
      if (newsImagePreview) newsImagePreview.src = '';
      if (newsImagePreviewContainer) newsImagePreviewContainer.style.display = 'none';
    });
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

  // Pay Expense Modal (Resident)
  setupReceiptDropzone();
  if (closePayExpenseModal) {
    closePayExpenseModal.addEventListener('click', () => closePayExpenseModalFn(false));
  }
  if (cancelPayExpenseBtn) {
    cancelPayExpenseBtn.addEventListener('click', () => closePayExpenseModalFn(false));
  }
  if (payExpenseModal) {
    payExpenseModal.addEventListener('click', (e) => {
      if (e.target === payExpenseModal) closePayExpenseModalFn(false);
    });
  }
  if (payExpenseForm) {
    payExpenseForm.addEventListener('submit', handlePayExpenseSubmit);
  }

  // View Receipt Modal (Admin & Resident)
  if (closeViewReceiptModal) {
    closeViewReceiptModal.addEventListener('click', () => closeViewReceiptModalFn(false));
  }
  if (closeViewReceiptBtn) {
    closeViewReceiptBtn.addEventListener('click', () => closeViewReceiptModalFn(false));
  }
  if (viewReceiptModal) {
    viewReceiptModal.addEventListener('click', (e) => {
      if (e.target === viewReceiptModal) closeViewReceiptModalFn(false);
    });
  }
  if (receiptAdminApproveBtn) {
    receiptAdminApproveBtn.addEventListener('click', async () => {
      if (!state.activeViewingExpense) return;
      if (!confirm(`¿Confirmar y acreditar el pago de expensas de ${state.activeViewingExpense.nombre || 'este vecino'}?`)) return;
      try {
        await API.expenses.updateStatus(state.activeViewingExpense.id, 'Pagado');
        showToast('Pago acreditado con éxito. Propietario notificado.');
        closeViewReceiptModalFn(false);
        loadAdminData();
      } catch (err) {
        showToast(err.message);
      }
    });
  }
  if (receiptAdminRejectBtn) {
    receiptAdminRejectBtn.addEventListener('click', async () => {
      if (!state.activeViewingExpense) return;
      if (!confirm('¿Desestimar este aviso de pago y devolverlo a estado Pendiente?')) return;
      try {
        await API.expenses.updateStatus(state.activeViewingExpense.id, 'Pendiente');
        showToast('Aviso de pago desestimado. Vuelto a Pendiente.');
        closeViewReceiptModalFn(false);
        loadAdminData();
      } catch (err) {
        showToast(err.message);
      }
    });
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

  // Guard Dedicated Actions (@guardia)
  if (guardScanQrBtn) {
    guardScanQrBtn.addEventListener('click', async () => {
      await startQrScanner();
      await API.activityLogs.log('LECTOR_QR', 'Apertura del lector de pase QR desde panel de guardia');
    });
  }

  if (guardSearchPlateBtn) {
    guardSearchPlateBtn.addEventListener('click', () => {
      const plateBlock = document.getElementById('guardPlateSearchBlock');
      if (plateBlock) plateBlock.scrollIntoView({ behavior: 'smooth' });
      if (guardPlateSearchInput) {
        guardPlateSearchInput.focus();
        guardPlateSearchInput.select();
      }
    });
  }

  if (guardNotificationsBtn) {
    guardNotificationsBtn.addEventListener('click', async () => {
      toggleNotificationsPanel(true);
      await API.activityLogs.log('CONSULTA_NOTIFICACIONES', 'Apertura del panel de avisos masivos');
    });
  }

  if (guardShiftChangeBtn) {
    guardShiftChangeBtn.addEventListener('click', handleGuardShiftChange);
  }

  if (guardTopbarLogoutBtn) {
    guardTopbarLogoutBtn.addEventListener('click', handleGuardShiftChange);
  }

  if (guardPlateSearchInput) {
    let debounceTimer = null;
    guardPlateSearchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        state.guardPlateQuery = e.target.value.trim();
        renderGuardVisits();
        if (state.guardPlateQuery.length >= 3) {
          await API.activityLogs.log('BUSQUEDA_PATENTE', `Búsqueda en padrón de visitantes: "${state.guardPlateQuery}"`);
        }
      }, 300);
    });
  }

  document.querySelectorAll('.guard-subfilter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.guardVisitsFilter = btn.dataset.guardFilter;
      document.querySelectorAll('.guard-subfilter-btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.guardFilter === state.guardVisitsFilter);
      });
      renderGuardVisits();
    });
  });

  if (refreshGuardVisitsBtn) {
    refreshGuardVisitsBtn.addEventListener('click', async () => {
      await loadGuardVisits();
      showToast('Lista de visitantes actualizada.');
    });
  }

  if (refreshAdminAuditLogsBtn) {
    refreshAdminAuditLogsBtn.addEventListener('click', async () => {
      await loadAdminAuditLogs();
      showToast('Auditoría general actualizada.');
    });
  }

  if (refreshAdminGuardLogsBtn) {
    refreshAdminGuardLogsBtn.addEventListener('click', async () => {
      await loadAdminAuditLogs();
      showToast('Auditoría general actualizada.');
    });
  }

  if (adminGoToAuditFromGuardBtn) {
    adminGoToAuditFromGuardBtn.addEventListener('click', () => {
      setAdminTab('auditoria');
    });
  }

  document.querySelectorAll('.audit-role-filter-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      state.adminAuditRoleFilter = btn.dataset.roleFilter;
      document.querySelectorAll('.audit-role-filter-btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.roleFilter === state.adminAuditRoleFilter);
      });
      await loadAdminAuditLogs();
    });
  });

  if (adminAuditSearchInput) {
    let auditDebounce = null;
    adminAuditSearchInput.addEventListener('input', (e) => {
      clearTimeout(auditDebounce);
      auditDebounce = setTimeout(async () => {
        state.adminAuditSearchQuery = e.target.value.trim();
        await loadAdminAuditLogs();
      }, 300);
    });
  }

  // Guard Resident Notices Actions
  if (guardResidentNoticesBtn) {
    guardResidentNoticesBtn.addEventListener('click', async () => {
      const block = document.getElementById('guardResidentNoticesBlock');
      if (block) block.scrollIntoView({ behavior: 'smooth' });
      await loadGuardResidentNotices();
    });
  }

  if (guardNotifyResidentBtn) {
    guardNotifyResidentBtn.addEventListener('click', () => {
      openGuardNotifyResidentModal();
    });
  }

  if (guardOpenNotifyResidentTopBtn) {
    guardOpenNotifyResidentTopBtn.addEventListener('click', () => {
      openGuardNotifyResidentModal();
    });
  }

  if (refreshGuardResidentNoticesBtn) {
    refreshGuardResidentNoticesBtn.addEventListener('click', async () => {
      await loadGuardResidentNotices();
      showToast('Avisos de vecinos actualizados.');
    });
  }

  document.querySelectorAll('.guard-notice-filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.guardNoticeFilter = btn.dataset.noticeFilter;
      document.querySelectorAll('.guard-notice-filter-btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.noticeFilter === state.guardNoticeFilter);
      });
      renderGuardResidentNotices();
    });
  });

  if (guardResidentNoticesList) {
    guardResidentNoticesList.addEventListener('click', async (e) => {
      const attendBtn = e.target.closest('.btn-attend-notice');
      if (attendBtn) {
        const id = attendBtn.dataset.noticeId;
        if (id) await handleAttendNotice(id);
        return;
      }

      const notifyBtn = e.target.closest('.btn-notify-resident-from-notice');
      if (notifyBtn) {
        const userId = notifyBtn.dataset.userId;
        const category = notifyBtn.dataset.cat || '';
        const name = notifyBtn.dataset.name || '';
        openGuardNotifyResidentModal(
          userId,
          `Aviso de Guardia: ${category}`,
          `Estimado/a ${name}, respecto a tu aviso de ${category} te informamos que: `
        );
      }
    });
  }

  // Guard to Resident Notification Modal
  if (closeGuardNotifyResidentModal) {
    closeGuardNotifyResidentModal.addEventListener('click', closeGuardNotifyResidentModalFn);
  }
  if (cancelGuardNotifyBtn) {
    cancelGuardNotifyBtn.addEventListener('click', closeGuardNotifyResidentModalFn);
  }

  if (guardNotifyTargetSelect) {
    guardNotifyTargetSelect.addEventListener('change', (e) => {
      updateSelectedNeighborDetails(e.target.value);
    });
  }

  if (guardNotifyPresetSelect) {
    guardNotifyPresetSelect.addEventListener('change', (e) => {
      const preset = e.target.value;
      const targetOption = guardNotifyTargetSelect?.selectedOptions?.[0];
      const targetText = targetOption && targetOption.value ? targetOption.textContent : 'Estimado vecino';
      const nameMatch = targetText.split('(')[0].trim();

      if (preset === 'paquete') {
        if (guardNotifyTitleInput) guardNotifyTitleInput.value = '📦 Paquete / Encomienda en Garita';
        if (guardNotifyMessageInput) guardNotifyMessageInput.value = `Hola ${nameMatch}, le informamos que ha llegado un paquete/encomienda a su nombre a la garita de guardia. Puede pasar a retirarlo cuando lo desee.`;
      } else if (preset === 'delivery') {
        if (guardNotifyTitleInput) guardNotifyTitleInput.value = '🛵 Delivery en Acceso Principal';
        if (guardNotifyMessageInput) guardNotifyMessageInput.value = `Hola ${nameMatch}, se encuentra en la guardia un repartidor de delivery solicitando ingresar o entregar un pedido a su nombre.`;
      } else if (preset === 'proveedor') {
        if (guardNotifyTitleInput) guardNotifyTitleInput.value = '🔧 Proveedor de Servicios en Garita';
        if (guardNotifyMessageInput) guardNotifyMessageInput.value = `Hola ${nameMatch}, se encuentra en garita un proveedor de servicios solicitando autorización para ingresar a realizar trabajos a su lote.`;
      } else if (preset === 'vehiculo') {
        if (guardNotifyTitleInput) guardNotifyTitleInput.value = '🚗 Aviso de Vehículo';
        if (guardNotifyMessageInput) guardNotifyMessageInput.value = `Hola ${nameMatch}, le informamos desde guardia que un vehículo asociado a su lote se encuentra mal estacionado / con las luces encendidas en la vía pública.`;
      } else if (preset === 'mascota') {
        if (guardNotifyTitleInput) guardNotifyTitleInput.value = '🐕 Aviso de Mascota Suelta';
        if (guardNotifyMessageInput) guardNotifyMessageInput.value = `Hola ${nameMatch}, le informamos desde la guardia que se ha observado un animal/mascota suelto en las inmediaciones de su sector.`;
      } else if (preset === 'general') {
        if (guardNotifyTitleInput) guardNotifyTitleInput.value = '📢 Comunicado de Guardia';
        if (guardNotifyMessageInput) guardNotifyMessageInput.value = `Hola ${nameMatch}, le informamos desde la guardia: `;
      } else {
        if (guardNotifyTitleInput) guardNotifyTitleInput.value = 'Aviso de Guardia';
      }
    });
  }

  if (guardNotifyResidentForm) {
    guardNotifyResidentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const residentId = guardNotifyTargetSelect ? guardNotifyTargetSelect.value : null;
      const title = guardNotifyTitleInput ? guardNotifyTitleInput.value.trim() : 'Aviso de Guardia';
      const message = guardNotifyMessageInput ? guardNotifyMessageInput.value.trim() : '';

      if (!residentId) {
        showToast('Por favor, seleccioná el vecino destinatario.');
        if (guardNotifyTargetSelect) guardNotifyTargetSelect.focus();
        return;
      }

      if (!message) {
        showToast('Por favor, escribí el comentario o mensaje para el vecino.');
        if (guardNotifyMessageInput) guardNotifyMessageInput.focus();
        return;
      }

      try {
        if (submitGuardNotifyBtn) {
          submitGuardNotifyBtn.disabled = true;
          submitGuardNotifyBtn.textContent = 'Enviando...';
        }

        const res = await API.guardNotices.notifyResident({ residentId, title, message });
        showToast(res.message || 'Notificación enviada al vecino y registrada en auditoría.');

        closeGuardNotifyResidentModalFn();
        if (guardNotifyMessageInput) guardNotifyMessageInput.value = '';
      } catch (err) {
        showToast(err.message || 'Error al enviar notificación.');
      } finally {
        if (submitGuardNotifyBtn) {
          submitGuardNotifyBtn.disabled = false;
          submitGuardNotifyBtn.textContent = '📨 Enviar Notificación Auditada';
        }
      }
    });
  }

  // Resident Avisos a Guardia Actions
  document.querySelectorAll('.notice-option-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      setNoticeCategory(btn.dataset.noticeCat);
    });
  });

  if (guardNoticeForm) {
    guardNoticeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const category = guardNoticeCategoryInput ? guardNoticeCategoryInput.value : 'Delivery';
      const details = guardNoticeDetailsInput ? guardNoticeDetailsInput.value.trim() : '';
      const company = guardNoticeCompanyInput ? guardNoticeCompanyInput.value.trim() : '';
      const timeEstimated = guardNoticeTimeInput ? guardNoticeTimeInput.value.trim() : '';

      if (!details) {
        showToast('Por favor, escribí el detalle o comentario del aviso.');
        if (guardNoticeDetailsInput) guardNoticeDetailsInput.focus();
        return;
      }

      try {
        if (submitGuardNoticeBtn) {
          submitGuardNoticeBtn.disabled = true;
          submitGuardNoticeBtn.textContent = 'Enviando aviso...';
        }

        const res = await API.guardNotices.create({
          category,
          details,
          company: company || undefined,
          timeEstimated: timeEstimated || undefined
        });

        showToast(res.message || 'Aviso enviado a la guardia con éxito.');

        if (guardNoticeDetailsInput) guardNoticeDetailsInput.value = '';
        if (guardNoticeCompanyInput) guardNoticeCompanyInput.value = '';
        if (guardNoticeTimeInput) guardNoticeTimeInput.value = '';

        await loadResidentGuardNotices();
      } catch (err) {
        showToast(err.message || 'Error al enviar aviso a guardia.');
      } finally {
        if (submitGuardNoticeBtn) {
          submitGuardNoticeBtn.disabled = false;
          submitGuardNoticeBtn.textContent = '🛎️ Enviar Aviso a la Guardia';
        }
      }
    });
  }

  if (refreshResidentNoticesBtn) {
    refreshResidentNoticesBtn.addEventListener('click', async () => {
      await loadResidentGuardNotices();
      showToast('Avisos enviados actualizados.');
    });
  }

  // Admin Guard Subtabs (Accesos vs Auditoría de Actividad)
  document.querySelectorAll('[data-guard-admin-subtab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const subtab = btn.dataset.guardAdminSubtab;
      state.activeGuardAdminSubtab = subtab;
      document.querySelectorAll('[data-guard-admin-subtab]').forEach((b) => {
        b.classList.toggle('active', b.dataset.guardAdminSubtab === subtab);
      });
      if (adminGuardAccesosSubpanel) {
        adminGuardAccesosSubpanel.style.display = subtab === 'accesos' ? 'block' : 'none';
      }
      if (adminGuardAuditoriaSubpanel) {
        adminGuardAuditoriaSubpanel.style.display = subtab === 'auditoria' ? 'block' : 'none';
      }
      if (subtab === 'auditoria') {
        loadAdminGuardLogs();
      }
    });
  });

  // Invitations (Gmail & WhatsApp) & Manual form toggle
  if (openGmailInviteBtn) openGmailInviteBtn.addEventListener('click', openGmailInvite);
  if (copyInviteLinkEmailBtn) copyInviteLinkEmailBtn.addEventListener('click', () => copyInviteLink(copyInviteLinkEmailBtn));
  if (openWhatsAppInviteBtn) openWhatsAppInviteBtn.addEventListener('click', openWhatsAppInvite);
  if (copyInviteLinkWhatsappBtn) copyInviteLinkWhatsappBtn.addEventListener('click', () => copyInviteLink(copyInviteLinkWhatsappBtn));
  if (toggleManualVisitFormBtn) toggleManualVisitFormBtn.addEventListener('click', toggleManualVisitForm);

  // Admin module buttons navigation (no-scroll modular architecture)
  document.querySelectorAll('.admin-nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      setAdminTab(btn.dataset.adminTab);
    });
  });

  // Vecinos subtabs (Activos vs Solicitudes de Registro)
  document.querySelectorAll('.vecinos-subnav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      setVecinosSubtab(btn.dataset.vecinosSubtab);
    });
  });

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
  if (newUserRole) {
    newUserRole.addEventListener('change', updateCreateUserRoleUI);
  }
  if (createUserForm) {
    createUserForm.addEventListener('submit', handleCreateUser);
  }

  // Edit User Modal Listeners (Admin)
  if (closeEditUserModal) {
    closeEditUserModal.addEventListener('click', () => closeEditUserModalFn(false));
  }
  if (cancelEditUserBtn) {
    cancelEditUserBtn.addEventListener('click', () => closeEditUserModalFn(false));
  }
  if (editUserModal) {
    editUserModal.addEventListener('click', (e) => {
      if (e.target === editUserModal) closeEditUserModalFn(false);
    });
  }
  if (editUserLote) {
    editUserLote.addEventListener('input', updateEditUserUsernamePreview);
  }
  if (editUserManzana) {
    editUserManzana.addEventListener('input', updateEditUserUsernamePreview);
  }
  if (editUserForm) {
    editUserForm.addEventListener('submit', handleEditUserSubmit);
  }
  if (editUserGenerateResetLinkBtn) {
    editUserGenerateResetLinkBtn.addEventListener('click', () => {
      const userId = editUserId?.value;
      if (userId) {
        openAdminResetModalForUser(userId);
      }
    });
  }

  // Password Recovery Event Listeners (Self-service)
  if (openForgotPasswordBtn) {
    openForgotPasswordBtn.addEventListener('click', openForgotPasswordModal);
  }
  if (closeForgotPasswordModal) {
    closeForgotPasswordModal.addEventListener('click', () => closeForgotPasswordModalFn(false));
  }
  if (cancelForgotPasswordBtn) {
    cancelForgotPasswordBtn.addEventListener('click', () => closeForgotPasswordModalFn(false));
  }
  if (forgotPasswordModal) {
    forgotPasswordModal.addEventListener('click', (e) => {
      if (e.target === forgotPasswordModal) closeForgotPasswordModalFn(false);
    });
  }
  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', handleForgotPasswordSubmit);
  }

  // Reset Password (Token) Event Listeners
  if (closeResetPasswordModal) {
    closeResetPasswordModal.addEventListener('click', () => closeResetPasswordModalFn(false));
  }
  if (cancelResetPasswordBtn) {
    cancelResetPasswordBtn.addEventListener('click', () => closeResetPasswordModalFn(false));
  }
  if (resetPasswordModal) {
    resetPasswordModal.addEventListener('click', (e) => {
      if (e.target === resetPasswordModal) closeResetPasswordModalFn(false);
    });
  }
  if (resetPasswordForm) {
    resetPasswordForm.addEventListener('submit', handleResetPasswordSubmit);
  }

  // Admin Reset Link Event Listeners
  if (closeAdminResetLinkModal) {
    closeAdminResetLinkModal.addEventListener('click', () => closeAdminResetLinkModalFn(false));
  }
  if (dismissAdminResetLinkBtn) {
    dismissAdminResetLinkBtn.addEventListener('click', () => closeAdminResetLinkModalFn(false));
  }
  if (adminResetLinkModal) {
    adminResetLinkModal.addEventListener('click', (e) => {
      if (e.target === adminResetLinkModal) closeAdminResetLinkModalFn(false);
    });
  }
  if (copyAdminResetLinkBtn) {
    copyAdminResetLinkBtn.addEventListener('click', async () => {
      const link = adminResetLinkInput?.value;
      if (!link) return;
      try {
        await navigator.clipboard.writeText(link);
        const originalText = copyAdminResetLinkBtn.textContent;
        copyAdminResetLinkBtn.textContent = '✅ ¡Copiado!';
        setTimeout(() => {
          copyAdminResetLinkBtn.textContent = originalText;
        }, 2200);
        showToast('Enlace copiado al portapapeles.');
      } catch (e) {
        if (adminResetLinkInput) {
          adminResetLinkInput.select();
          document.execCommand('copy');
          showToast('Enlace copiado al portapapeles.');
        }
      }
    });
  }
  if (shareAdminResetWhatsAppBtn) {
    shareAdminResetWhatsAppBtn.addEventListener('click', () => {
      if (!state.adminResetContext) return;
      const { name, resetLink } = state.adminResetContext;
      const text = `Hola ${name},\nTe comparto tu enlace seguro y oficial para restablecer tu contraseña en el portal de Rancho Doble S:\n\n${resetLink}\n\n(Este enlace es de uso único y tiene validez de 60 minutos).`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    });
  }
  if (sendAdminResetEmailBtn) {
    sendAdminResetEmailBtn.addEventListener('click', async () => {
      if (!state.adminResetContext?.userId) return;
      try {
        sendAdminResetEmailBtn.disabled = true;
        sendAdminResetEmailBtn.textContent = 'Enviando...';
        const res = await API.admin.generateResetToken(state.adminResetContext.userId, true);
        if (res.emailSent) {
          showToast(`✅ ${res.message || 'Correo de restablecimiento enviado con éxito.'}`, 5000);
        } else {
          showToast(`⚠️ ${res.message || 'No se pudo entregar por correo. Podés compartir el enlace por WhatsApp o copiarlo.'}`, 7000);
        }
      } catch (err) {
        showToast('Error al enviar correo: ' + err.message, 6000);
      } finally {
        sendAdminResetEmailBtn.disabled = false;
        sendAdminResetEmailBtn.textContent = '📧 Reenviar por Correo';
      }
    });
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

  // Admin Expenses Search Listener
  if (adminExpensesSearchInput) {
    adminExpensesSearchInput.addEventListener('input', (e) => {
      state.adminExpensesSearchQuery = e.target.value;
      renderAdminExpensesList();
    });
  }

  // Admin Notify Specific Residents Listeners
  if (openNotifySpecificResidentsModalBtn) {
    openNotifySpecificResidentsModalBtn.addEventListener('click', openAdminNotifySpecificResidentsModal);
  }
  if (closeAdminNotifySpecificResidentsModal) {
    closeAdminNotifySpecificResidentsModal.addEventListener('click', () => closeAdminNotifySpecificResidentsModalFn(false));
  }
  if (cancelAdminNotifySpecificBtn) {
    cancelAdminNotifySpecificBtn.addEventListener('click', () => closeAdminNotifySpecificResidentsModalFn(false));
  }
  if (adminNotifySpecificResidentsModal) {
    adminNotifySpecificResidentsModal.addEventListener('click', (e) => {
      if (e.target === adminNotifySpecificResidentsModal) closeAdminNotifySpecificResidentsModalFn(false);
    });
  }
  if (adminNotifyResidentsSearchInput) {
    adminNotifyResidentsSearchInput.addEventListener('input', (e) => {
      state.adminNotifyResidentsSearchQuery = e.target.value;
      renderAdminNotifyResidentsCheckboxes();
    });
  }
  if (adminNotifySelectAllBtn) {
    adminNotifySelectAllBtn.addEventListener('click', () => {
      let residents = (state.approvedUsers || []).filter((u) => u.role === 'user' || (u.lote && u.role !== 'guardia'));
      if (state.adminNotifyResidentsSearchQuery && state.adminNotifyResidentsSearchQuery.trim()) {
        const q = state.adminNotifyResidentsSearchQuery.trim().toLowerCase();
        residents = residents.filter((r) => {
          const lote = String(r.lote || '').toLowerCase();
          const manzana = String(r.manzana || '').toLowerCase();
          const dni = String(r.numeroDocumento || '').toLowerCase();
          const nombre = String(r.nombre || '').toLowerCase();
          const apellido = String(r.apellido || '').toLowerCase();
          const user = String(r.username || '').toLowerCase();
          const email = String(r.email || '').toLowerCase();
          return (
            lote.includes(q) ||
            `l${lote}`.includes(q) ||
            `l${lote}m${manzana}`.includes(q) ||
            dni.includes(q) ||
            nombre.includes(q) ||
            apellido.includes(q) ||
            `${nombre} ${apellido}`.includes(q) ||
            user.includes(q) ||
            email.includes(q)
          );
        });
      }
      residents.forEach((r) => state.adminNotifySelectedResidents.add(Number(r.id)));
      renderAdminNotifyResidentsCheckboxes();
    });
  }
  if (adminNotifyDeselectAllBtn) {
    adminNotifyDeselectAllBtn.addEventListener('click', () => {
      state.adminNotifySelectedResidents.clear();
      renderAdminNotifyResidentsCheckboxes();
    });
  }
  if (adminNotifySpecificResidentsForm) {
    adminNotifySpecificResidentsForm.addEventListener('submit', handleAdminNotifySpecificSubmit);
  }

  // Guard to Admin Notification Listeners
  if (guardNotifyAdminBtn) {
    guardNotifyAdminBtn.addEventListener('click', openGuardNotifyAdminModal);
  }
  if (closeGuardNotifyAdminModal) {
    closeGuardNotifyAdminModal.addEventListener('click', () => closeGuardNotifyAdminModalFn(false));
  }
  if (cancelGuardNotifyAdminBtn) {
    cancelGuardNotifyAdminBtn.addEventListener('click', () => closeGuardNotifyAdminModalFn(false));
  }
  if (guardNotifyAdminModal) {
    guardNotifyAdminModal.addEventListener('click', (e) => {
      if (e.target === guardNotifyAdminModal) closeGuardNotifyAdminModalFn(false);
    });
  }
  if (guardNotifyAdminPresetSelect) {
    guardNotifyAdminPresetSelect.addEventListener('change', (e) => {
      const presetKey = e.target.value;
      const preset = GUARD_TO_ADMIN_PRESETS[presetKey];
      if (preset && presetKey !== 'custom') {
        if (guardNotifyAdminTitleInput) guardNotifyAdminTitleInput.value = preset.title;
        if (guardNotifyAdminMessageInput) guardNotifyAdminMessageInput.value = preset.text;
      }
    });
  }
  if (guardNotifyAdminForm) {
    guardNotifyAdminForm.addEventListener('submit', handleGuardNotifyAdminSubmit);
  }

  // Admin to Guard Notification Listeners
  if (openNotifyGuardModalBtn) {
    openNotifyGuardModalBtn.addEventListener('click', openAdminNotifyGuardModal);
  }
  if (adminNotifyGuardFromGuardBtn) {
    adminNotifyGuardFromGuardBtn.addEventListener('click', openAdminNotifyGuardModal);
  }
  if (closeAdminNotifyGuardModal) {
    closeAdminNotifyGuardModal.addEventListener('click', () => closeAdminNotifyGuardModalFn(false));
  }
  if (cancelAdminNotifyGuardBtn) {
    cancelAdminNotifyGuardBtn.addEventListener('click', () => closeAdminNotifyGuardModalFn(false));
  }
  if (adminNotifyGuardModal) {
    adminNotifyGuardModal.addEventListener('click', (e) => {
      if (e.target === adminNotifyGuardModal) closeAdminNotifyGuardModalFn(false);
    });
  }
  if (adminNotifyGuardPresetSelect) {
    adminNotifyGuardPresetSelect.addEventListener('change', (e) => {
      const presetKey = e.target.value;
      const preset = ADMIN_TO_GUARD_PRESETS[presetKey];
      if (preset && presetKey !== 'custom') {
        if (adminNotifyGuardTitleInput) adminNotifyGuardTitleInput.value = preset.title;
        if (adminNotifyGuardMessageInput) adminNotifyGuardMessageInput.value = preset.text;
      }
    });
  }
  if (adminNotifyGuardForm) {
    adminNotifyGuardForm.addEventListener('submit', handleAdminNotifyGuardSubmit);
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
      if (state.authenticatedUser?.role === 'guardia') return;
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
      if (payExpenseModal && payExpenseModal.style.display !== 'none') {
        closePayExpenseModalFn(false);
      } else if (viewReceiptModal && viewReceiptModal.style.display !== 'none') {
        closeViewReceiptModalFn(false);
      } else if (viewQrModal && viewQrModal.style.display !== 'none') {
        hideQrPassModal(false);
      } else if (createNewsModal && createNewsModal.style.display !== 'none') {
        closeCreateNews(false);
      } else if (emitExpenseModal && emitExpenseModal.style.display !== 'none') {
        closeEmitExpense(false);
      } else if (createUserModal && createUserModal.style.display !== 'none') {
        closeCreateUserModalFn(false);
      } else if (editUserModal && editUserModal.style.display !== 'none') {
        closeEditUserModalFn(false);
      } else if (forgotPasswordModal && forgotPasswordModal.style.display !== 'none') {
        closeForgotPasswordModalFn(false);
      } else if (resetPasswordModal && resetPasswordModal.style.display !== 'none') {
        closeResetPasswordModalFn(false);
      } else if (adminResetLinkModal && adminResetLinkModal.style.display !== 'none') {
        closeAdminResetLinkModalFn(false);
      } else if (blockCourtModal && blockCourtModal.style.display !== 'none') {
        closeBlockCourtModalFn(false);
      } else if (broadcastAlertModal && broadcastAlertModal.style.display !== 'none') {
        closeBroadcastAlertModalFn(false);
      } else if (adminNotifySpecificResidentsModal && adminNotifySpecificResidentsModal.style.display !== 'none') {
        closeAdminNotifySpecificResidentsModalFn(false);
      } else if (guardNotifyAdminModal && guardNotifyAdminModal.style.display !== 'none') {
        closeGuardNotifyAdminModalFn(false);
      } else if (adminNotifyGuardModal && adminNotifyGuardModal.style.display !== 'none') {
        closeAdminNotifyGuardModalFn(false);
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
    if (payExpenseModal && payExpenseModal.style.display !== 'none') {
      closePayExpenseModalFn(true);
      return;
    }
    if (viewReceiptModal && viewReceiptModal.style.display !== 'none') {
      closeViewReceiptModalFn(true);
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
    if (editUserModal && editUserModal.style.display !== 'none') {
      closeEditUserModalFn(true);
      return;
    }
    if (forgotPasswordModal && forgotPasswordModal.style.display !== 'none') {
      closeForgotPasswordModalFn(true);
      return;
    }
    if (resetPasswordModal && resetPasswordModal.style.display !== 'none') {
      closeResetPasswordModalFn(true);
      return;
    }
    if (adminResetLinkModal && adminResetLinkModal.style.display !== 'none') {
      closeAdminResetLinkModalFn(true);
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
    if (adminNotifySpecificResidentsModal && adminNotifySpecificResidentsModal.style.display !== 'none') {
      closeAdminNotifySpecificResidentsModalFn(true);
      return;
    }
    if (guardNotifyAdminModal && guardNotifyAdminModal.style.display !== 'none') {
      closeGuardNotifyAdminModalFn(true);
      return;
    }
    if (adminNotifyGuardModal && adminNotifyGuardModal.style.display !== 'none') {
      closeAdminNotifyGuardModalFn(true);
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
      if (['qr-modal', 'notificaciones', 'nueva-publicacion', 'emitir-expensas', 'escanear-qr', 'nuevo-vecino', 'editar-vecino', 'recuperar-clave', 'restablecer-clave', 'bloquear-cancha', 'alerta-comunitaria', 'mi-perfil', 'informar-pago', 'ver-comprobante', 'notificar-vecinos', 'guardia-a-admin', 'admin-a-guardia'].includes(targetView)) {
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

  // Check if opened via password reset link token in URL
  await checkUrlForResetToken();
  window.addEventListener('hashchange', checkUrlForResetToken);

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
