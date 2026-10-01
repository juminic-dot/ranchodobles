/**
 * WhatsApp Baileys Service for Rancho Doble S
 * Native, self-hosted WhatsApp connection via WebSocket protocol.
 * Generates QR codes directly for admin panel pairing.
 * Zero external dependencies (no Docker/Meta Cloud API fees required).
 */

const path = require('path');
const fs = require('fs');
const pino = require('pino');
const qrcode = require('qrcode');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers
} = require('@whiskeysockets/baileys');

const dataDir = path.join(__dirname, '..', 'data');
const authDir = path.join(dataDir, 'baileys_auth');

// Filter out benign libsignal decryption noise from incoming history sync/status broadcasts
const originalConsoleError = console.error;
const originalConsoleInfo = console.info;
const originalConsoleLog = console.log;

console.error = function (...args) {
  const msg = args.map(a => (typeof a === 'string' ? a : (a?.message || ''))).join(' ');
  if (
    msg.includes('Failed to decrypt message') ||
    msg.includes('Bad MAC') ||
    msg.includes('Session error')
  ) {
    return; // Benign background sync decryption warning
  }
  return originalConsoleError.apply(console, args);
};

console.info = function (...args) {
  const msg = args.map(a => (typeof a === 'string' ? a : (a?.message || (a?.constructor?.name || '')))).join(' ');
  if (msg.includes('Closing session') || msg.includes('SessionEntry')) {
    return; // Benign libsignal session rotation
  }
  return originalConsoleInfo.apply(console, args);
};

console.log = function (...args) {
  const msg = args.map(a => (typeof a === 'string' ? a : (a?.message || (a?.constructor?.name || '')))).join(' ');
  if (msg.includes('Closing session') || msg.includes('SessionEntry') || msg.includes('Bad MAC')) {
    return; // Benign libsignal internal trace
  }
  return originalConsoleLog.apply(console, args);
};


// State variables
let sock = null;
let connectionState = 'disconnected'; // 'disconnected' | 'connecting' | 'qr_ready' | 'connected'
let currentQR = null;
let connectedPhone = null;
let reconnectTimeout = null;
let isManualDisconnect = false;

// Ensure auth directory exists
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

/**
 * Normalizes phone numbers to standard WhatsApp format (E.164 without leading plus).
 * For Argentine numbers: 549 + area code + local number.
 */
function normalizePhone(phone) {
  if (!phone) return '';
  let clean = String(phone).replace(/\D/g, '');

  if (clean.startsWith('0')) {
    clean = clean.substring(1);
  }

  // Handle local mobile with 15 after area code 11 (e.g. 011 15 2345 6789 -> 11 2345 6789)
  if (clean.length === 12 && clean.startsWith('1115')) {
    clean = '11' + clean.substring(4);
  }

  // Handle mobile starting with 15 without area code (e.g. 15 2345 6789 -> 11 2345 6789)
  if (clean.length === 10 && clean.startsWith('15')) {
    clean = '11' + clean.substring(2);
  }

  // Handle 5491115... (14 digits)
  if (clean.length === 14 && clean.startsWith('5491115')) {
    clean = '54911' + clean.substring(7);
  }

  // Argentina standard 10 digits (e.g., 1123456789) -> 5491123456789
  if (clean.length === 10) {
    clean = '549' + clean;
  } else if (clean.startsWith('54') && !clean.startsWith('549') && clean.length === 12) {
    clean = '549' + clean.substring(2);
  }

  return clean;
}

/**
 * Helper to wipe auth directory when logging out or resetting session
 */
function clearAuthFiles() {
  try {
    if (fs.existsSync(authDir)) {
      const files = fs.readdirSync(authDir);
      for (const file of files) {
        try {
          fs.rmSync(path.join(authDir, file), { recursive: true, force: true });
        } catch (e) {}
      }
    }
  } catch (err) {
    console.warn('[Baileys] Error limpiando archivos de sesión:', err.message);
  }
}

/**
 * Checks if saved session credentials exist
 */
function hasSavedSession() {
  try {
    const credsPath = path.join(authDir, 'creds.json');
    return fs.existsSync(credsPath);
  } catch (e) {
    return false;
  }
}

/**
 * Connects to WhatsApp using Baileys socket.
 */
async function connectBaileys() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (connectionState === 'connected' && sock) {
    return { status: 'connected', phone: connectedPhone };
  }

  isManualDisconnect = false;
  connectionState = 'connecting';
  currentQR = null;

  try {
    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      browser: Browsers.ubuntu('Chrome'),
      syncFullHistory: false,
      markOnlineOnConnect: false,
      shouldIgnoreJid: (jid) => {
        return (
          jid.includes('@broadcast') ||
          jid.includes('@newsletter') ||
          jid.includes('@g.us')
        );
      },
      getMessage: async () => undefined,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
      generateHighQualityLinkPreview: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          currentQR = await qrcode.toDataURL(qr, { margin: 2, scale: 6 });
          connectionState = 'qr_ready';
          console.log('[Baileys] 📲 Código QR generado. Listo para escanear desde WhatsApp.');
        } catch (qrErr) {
          console.error('[Baileys] Error convirtiendo QR a imagen:', qrErr);
        }
      }

      if (connection === 'open') {
        connectionState = 'connected';
        currentQR = null;

        // Extract connected phone
        const rawId = sock.user?.id || '';
        connectedPhone = rawId.split(':')[0].split('@')[0] || rawId;

        console.log(`[Baileys] ========================================`);
        console.log(`[Baileys] 🟢 WhatsApp CONECTADO exitosamente!`);
        console.log(`[Baileys] Número de garita/predio: +${connectedPhone}`);
        console.log(`[Baileys] ========================================`);

        try {
          const { setSetting, getSetting } = require('./db');
          setSetting('whatsapp_provider', 'baileys');
          if (!getSetting('whatsapp_phone')) {
            setSetting('whatsapp_phone', connectedPhone);
          }
        } catch (e) {}
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;

        console.log(`[Baileys] ⚠️ Conexión cerrada. Código de estado: ${statusCode || 'desconocido'}`);

        if (isLoggedOut || isManualDisconnect) {
          console.log('[Baileys] 🔴 Sesión cerrada o desvinculada.');
          clearAuthFiles();
          connectionState = 'disconnected';
          currentQR = null;
          connectedPhone = null;
          sock = null;
        } else {
          // Automatic reconnection
          connectionState = 'connecting';
          console.log('[Baileys] 🔄 Reintentando reconexión en 5 segundos...');
          reconnectTimeout = setTimeout(() => {
            connectBaileys();
          }, 5000);
        }
      }
    });

    return { status: connectionState, qr: currentQR };
  } catch (err) {
    console.error('[Baileys] Error inicializando socket:', err);
    connectionState = 'disconnected';
    currentQR = null;
    return { status: 'error', error: err.message };
  }
}

/**
 * Disconnects socket and clears stored credentials
 */
async function disconnectBaileys() {
  isManualDisconnect = true;
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (sock) {
    try {
      await sock.logout();
    } catch (e) {
      try {
        sock.end(new Error('Manual disconnect'));
      } catch (e2) {}
    }
    sock = null;
  }

  clearAuthFiles();
  connectionState = 'disconnected';
  currentQR = null;
  connectedPhone = null;
  console.log('[Baileys] 🔌 Desconectado manualmente y sesión limpiada.');
  return { success: true };
}

/**
 * Returns current status of Baileys integration
 */
function getBaileysStatus() {
  return {
    status: connectionState,
    isConnected: connectionState === 'connected',
    phone: connectedPhone,
    hasSession: hasSavedSession(),
    qr: currentQR
  };
}

/**
 * Resolves exact WhatsApp JID for recipient (using onWhatsApp check)
 */
async function resolveJid(phone) {
  const clean = normalizePhone(phone);
  if (!clean) return null;

  if (sock && connectionState === 'connected') {
    try {
      const checkPromise = (async () => {
        let results = await sock.onWhatsApp(clean);
        if (results && results.length > 0 && results[0].exists) {
          return results[0].jid;
        }
        // If Argentine number with 549, also check 54 (without 9)
        if (clean.startsWith('549') && clean.length >= 12) {
          const altClean = '54' + clean.substring(3);
          results = await sock.onWhatsApp(altClean);
          if (results && results.length > 0 && results[0].exists) {
            return results[0].jid;
          }
        }
        return null;
      })();

      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 2500));
      const jid = await Promise.race([checkPromise, timeoutPromise]);
      if (jid) return jid;
    } catch (e) {
      // Fallback to standard jid
    }
  }

  return `${clean}@s.whatsapp.net`;
}


/**
 * Sends a text message to a WhatsApp number via Baileys
 */
async function sendBaileysText(phone, text) {
  if (!sock || connectionState !== 'connected') {
    return {
      success: false,
      error: 'WhatsApp Baileys no está conectado. Escaneá el código QR en la configuración.'
    };
  }

  const jid = await resolveJid(phone);
  if (!jid) {
    return { success: false, error: 'Número de WhatsApp inválido.' };
  }

  try {
    const result = await sock.sendMessage(jid, { text: String(text) });
    console.log(`[Baileys] ✅ Mensaje de texto enviado a ${jid} (ID: ${result?.key?.id})`);
    return {
      success: true,
      provider: 'baileys',
      messageId: result?.key?.id,
      phone: normalizePhone(phone)
    };
  } catch (err) {
    console.error(`[Baileys] Error enviando mensaje de texto a ${jid}:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Sends an image message (with caption) to a WhatsApp number via Baileys
 */
async function sendBaileysImage(phone, imageBuffer, caption) {
  if (!sock || connectionState !== 'connected') {
    return {
      success: false,
      error: 'WhatsApp Baileys no está conectado. Escaneá el código QR en la configuración.'
    };
  }

  const jid = await resolveJid(phone);
  if (!jid) {
    return { success: false, error: 'Número de WhatsApp inválido.' };
  }

  if (!Buffer.isBuffer(imageBuffer)) {
    return { success: false, error: 'Buffer de imagen inválido para envío por WhatsApp.' };
  }

  try {
    const result = await sock.sendMessage(jid, {
      image: imageBuffer,
      caption: caption || '',
      mimetype: 'image/png'
    });
    console.log(`[Baileys] ✅ Pase QR con imagen enviado a ${jid} (ID: ${result?.key?.id})`);
    return {
      success: true,
      provider: 'baileys',
      messageId: result?.key?.id,
      phone: normalizePhone(phone)
    };
  } catch (err) {
    console.error(`[Baileys] Error enviando imagen a ${jid}:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Initializes Baileys on server startup if active or if previous session exists
 */
function initBaileys() {
  try {
    const { getSetting } = require('./db');
    const provider = getSetting('whatsapp_provider');
    const hasSession = hasSavedSession();

    if (provider === 'baileys' || hasSession) {
      console.log('[Baileys] 🔌 Sesión de WhatsApp detectada. Iniciando conexión automática...');
      connectBaileys().catch((err) => {
        console.warn('[Baileys] Error en auto-inicio:', err.message);
      });
    }
  } catch (e) {
    console.warn('[Baileys] Error verificando inicio automático:', e.message);
  }
}

module.exports = {
  connectBaileys,
  disconnectBaileys,
  getBaileysStatus,
  sendBaileysText,
  sendBaileysImage,
  initBaileys,
  normalizePhone
};
