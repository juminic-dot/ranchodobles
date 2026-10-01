/**
 * Unified Notification & WhatsApp Dispatcher for Rancho Doble S
 *
 * Rules:
 *  1. Any notification directed to owners/residents (targetRole === 'user' or targetRole === 'all')
 *     is automatically delivered to their registered WhatsApp phone number.
 *  2. If targetRole === 'all', the notification is broadcast to ALL approved active community members.
 *  3. If userId is provided, the notification is delivered PRIVATELY and EXCLUSIVELY to that owner.
 *  4. Internal operational notifications (targetRole === 'admin' or targetRole === 'guardia')
 *     are never broadcast to residents.
 */

const { db } = require('./db');
const { sendWhatsAppTextMessage, getWhatsAppCredentials, normalizeWhatsAppNumber } = require('./whatsapp');
const { sendGenericEmail, getMailerStatus } = require('./mailer');

/**
 * Creates an in-app notification in SQLite and dispatches WhatsApp and Email messages accordingly.
 *
 * @param {Object} options
 * @param {number|null} [options.userId] - Specific recipient user ID (for individual private notices)
 * @param {string} [options.targetRole='user'] - 'user' | 'all' | 'admin' | 'guardia'
 * @param {string} options.title - Notification title
 * @param {string} options.text - Notification body message
 * @param {number|null} [options.senderId] - User ID of who generated this notification
 * @param {string|null} [options.senderName] - Human name / role of sender
 * @param {boolean} [options.sendWhatsApp=true] - Whether to send WhatsApp message
 * @param {boolean} [options.sendEmail=true] - Whether to send email if configured
 * @returns {Promise<Object>} Created notification object
 */
async function notify({
  userId = null,
  targetRole = 'user',
  title,
  text,
  senderId = null,
  senderName = null,
  sendWhatsApp = true,
  sendEmail = true
}) {
  if (!title || !text) return null;

  const now = new Date().toISOString();
  const cleanTitle = String(title).trim();
  const cleanText = String(text).trim();
  const cleanSenderName = senderName ? String(senderName).trim() : 'Rancho Doble S';

  // 1. Insert into database (Always unread = 0 so every recipient sees it)
  let notifId = null;
  try {
    const result = db.prepare(`
      INSERT INTO notifications (userId, targetRole, title, text, read, senderId, senderName, createdAt)
      VALUES (?, ?, ?, ?, 0, ?, ?, ?)
    `).run(
      userId ? Number(userId) : null,
      targetRole || 'user',
      cleanTitle,
      cleanText,
      senderId ? Number(senderId) : null,
      cleanSenderName,
      now
    );
    notifId = Number(result.lastInsertRowid);
  } catch (dbErr) {
    console.error('[Notifier DB Error]', dbErr);
  }

  // 2. WhatsApp & Email Dispatch
  // CASE A: Community Mass Broadcast to ALL approved users
  if (targetRole === 'all') {
    try {
      const allApprovedUsers = db.prepare(`
        SELECT id, nombre, apellido, telefono, email, role
        FROM users
        WHERE approved = 1
      `).all();

      const mailerStatus = getMailerStatus();
      const waCreds = getWhatsAppCredentials();
      const botPhone = waCreds.officialPhone ? normalizeWhatsAppNumber(waCreds.officialPhone) : '';

      // Deliver Email if configured
      if (sendEmail && mailerStatus.configured) {
        const validEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        for (const user of allApprovedUsers) {
          if (user.email && validEmailRegex.test(user.email.trim())) {
            if (user.email.toLowerCase().endsWith('@guardia')) continue;
            sendGenericEmail({
              to: user.email.trim(),
              subject: `Alerta Comunitaria — ${cleanTitle}`,
              text: `Hola ${user.nombre} ${user.apellido},\n\nAlerta Comunitaria Rancho Doble S:\n\n${cleanTitle}\n\n${cleanText}\n\n${cleanSenderName}`,
              fromName: cleanSenderName
            }).catch(e => console.error(`[Notifier Email Error] ${user.email}:`, e.message));
          }
        }
      }

      // Deliver WhatsApp
      if (sendWhatsApp) {
        const seenPhones = new Set();
        const targets = [];

        for (const u of allApprovedUsers) {
          if (!u.telefono) continue;
          const raw = String(u.telefono).trim();
          if (['1100000000', '0000000000', '123456789'].includes(raw)) continue;

          const norm = normalizeWhatsAppNumber(raw);
          if (!norm || norm.length < 8) continue;
          if (botPhone && norm === botPhone) continue; // Do not send message to sender's own number
          if (seenPhones.has(norm)) continue;

          seenPhones.add(norm);
          targets.push({
            id: u.id,
            nombre: u.nombre,
            apellido: u.apellido,
            telefono: raw,
            normalizedPhone: norm
          });
        }

        console.log(`[Notifier] 📢 Enviando alerta masiva por WhatsApp a ${targets.length} destinatarios: "${cleanTitle}"`);

        // Send sequentially in background with 350ms pause to ensure delivery
        (async () => {
          for (const target of targets) {
            try {
              const res = await sendWhatsAppTextMessage({
                phone: target.telefono,
                title: cleanTitle,
                message: cleanText,
                senderName: cleanSenderName,
                recipientName: `${target.nombre} ${target.apellido}`
              });

              if (res.success) {
                console.log(`[Notifier Broadcast WA] ✅ Enviado a ${target.nombre} ${target.apellido} (+${target.normalizedPhone})`);
              } else {
                console.warn(`[Notifier Broadcast WA] ⚠️ Falló envío a ${target.nombre} ${target.apellido} (+${target.normalizedPhone}):`, res.error);
              }
            } catch (err) {
              console.error(`[Notifier Broadcast WA Exception] ${target.nombre} ${target.apellido}:`, err.message);
            }
            await new Promise(r => setTimeout(r, 350));
          }
        })().catch(e => console.error('[Notifier Mass Loop Exception]', e));
      }
    } catch (err) {
      console.error('[Notifier Mass Dispatch Error]', err);
    }
  }

  // CASE B: Private notification strictly for a specific individual owner
  else if (userId && (sendWhatsApp || sendEmail)) {
    try {
      const targetUser = db.prepare(`
        SELECT id, nombre, apellido, telefono, email, role, approved
        FROM users
        WHERE id = ?
      `).get(Number(userId));

      if (targetUser) {
        // WhatsApp dispatch
        if (sendWhatsApp && targetUser.telefono && String(targetUser.telefono).trim() !== '') {
          const raw = String(targetUser.telefono).trim();
          if (!['1100000000', '0000000000', '123456789'].includes(raw)) {
            console.log(`[Notifier] 👤 Enviando aviso individual por WhatsApp a ${targetUser.nombre} ${targetUser.apellido} (+${raw}): "${cleanTitle}"`);

            sendWhatsAppTextMessage({
              phone: targetUser.telefono,
              title: cleanTitle,
              message: cleanText,
              senderName: cleanSenderName,
              recipientName: `${targetUser.nombre} ${targetUser.apellido}`
            }).then(res => {
              if (res.success) {
                console.log(`[Notifier Individual WA] ✅ Enviado a ${targetUser.nombre} ${targetUser.apellido} (+${raw})`);
              } else {
                console.warn(`[Notifier Individual WA] ⚠️ Error en envío a ${targetUser.nombre}:`, res.error);
              }
            }).catch(err => {
              console.error(`[Notifier Individual WA Error] Usuario ID ${targetUser.id} (${raw}):`, err.message);
            });
          }
        }

        // Email dispatch
        if (sendEmail) {
          const mailerStatus = getMailerStatus();
          const validEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (mailerStatus.configured && targetUser.email && validEmailRegex.test(targetUser.email.trim())) {
            if (!targetUser.email.toLowerCase().endsWith('@guardia')) {
              console.log(`[Notifier] 👤 Enviando aviso individual por Email a ${targetUser.nombre} ${targetUser.apellido} (${targetUser.email}): "${cleanTitle}"`);
              sendGenericEmail({
                to: targetUser.email.trim(),
                subject: `Rancho Doble S — ${cleanTitle}`,
                text: `Hola ${targetUser.nombre} ${targetUser.apellido},\n\n${cleanTitle}\n\n${cleanText}\n\n${cleanSenderName}`,
                fromName: cleanSenderName
              }).catch(err => {
                console.error(`[Notifier Individual Email Error] Usuario ID ${targetUser.id} (${targetUser.email}):`, err.message);
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('[Notifier Individual Query Error]', err);
    }
  }

  return {
    id: notifId,
    userId,
    targetRole,
    title: cleanTitle,
    text: cleanText,
    senderName: cleanSenderName,
    createdAt: now
  };
}

module.exports = {
  notify
};
