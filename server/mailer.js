const nodemailer = require('nodemailer');
const { getSetting } = require('./db');

function getTransporter() {
  const provider = getSetting('email_provider');

  // If explicitly disabled
  if (provider === 'none') {
    return null;
  }

  // 1. Gmail credentials (direct GMAIL_USER, DB gmail_user, or SMTP_USER ending in @gmail.com)
  const dbGmailUser = getSetting('gmail_user');
  const dbGmailPass = getSetting('gmail_app_pass');
  const gmailUser = dbGmailUser || process.env.GMAIL_USER || (process.env.SMTP_USER && process.env.SMTP_USER.includes('@gmail.com') ? process.env.SMTP_USER : null);
  const gmailPass = dbGmailPass || process.env.GMAIL_APP_PASS || (gmailUser ? (getSetting('smtp_pass') || process.env.SMTP_PASS) : null);

  if ((provider === 'gmail' || (!provider && (dbGmailUser || process.env.GMAIL_USER))) && gmailUser && gmailPass) {
    const cleanPass = String(gmailPass).replace(/\s+/g, '');
    return {
      transporter: nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser.trim(),
          pass: cleanPass
        }
      }),
      type: 'gmail',
      defaultFrom: gmailUser.trim()
    };
  }

  // 2. Custom remote SMTP credentials
  const dbHost = getSetting('smtp_host');
  const dbPort = getSetting('smtp_port');
  const dbUser = getSetting('smtp_user');
  const dbPass = getSetting('smtp_pass');
  const dbSecure = getSetting('smtp_secure');

  const host = dbHost || process.env.SMTP_HOST;
  const port = Number(dbPort || process.env.SMTP_PORT) || 587;
  const user = dbUser || process.env.SMTP_USER;
  const pass = dbPass || process.env.SMTP_PASS;
  const secure = dbSecure !== null && dbSecure !== undefined
    ? (dbSecure === 'true' || dbSecure === true || port === 465)
    : (process.env.SMTP_SECURE === 'true' || port === 465);

  if ((provider === 'smtp' || (!provider && (dbHost || process.env.SMTP_HOST))) && host && user && pass) {
    return {
      transporter: nodemailer.createTransport({
        host: host.trim(),
        port,
        secure,
        auth: {
          user: user.trim(),
          pass: String(pass)
        },
        tls: {
          rejectUnauthorized: false
        }
      }),
      type: 'smtp',
      defaultFrom: user.trim()
    };
  }

  // Fallback to gmail if available even without provider explicitly specified
  if (gmailUser && gmailPass) {
    const cleanPass = String(gmailPass).replace(/\s+/g, '');
    return {
      transporter: nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser.trim(),
          pass: cleanPass
        }
      }),
      type: 'gmail',
      defaultFrom: gmailUser.trim()
    };
  }

  // 3. Local MTA only if explicitly allowed via env
  if (process.env.ALLOW_LOCAL_MTA === 'true') {
    return {
      transporter: nodemailer.createTransport({
        host: '127.0.0.1',
        port: 25,
        secure: false,
        ignoreTLS: true
      }),
      type: 'local_mta',
      defaultFrom: 'notificaciones@gestechnoclient.com'
    };
  }

  return null;
}

function getMailerStatus() {
  const tInfo = getTransporter();
  const dbProvider = getSetting('email_provider');
  if (dbProvider === 'none') {
    return { configured: false, type: 'disabled', from: null };
  }
  if (!tInfo) return { configured: false, type: 'none', from: null };
  return { configured: true, type: tInfo.type, from: tInfo.defaultFrom };
}

async function sendPasswordResetEmail({ to, name, resetLink, expiresMinutes = 60 }) {
  const tInfo = getTransporter();
  const rawFrom = getSetting('smtp_from') || process.env.SMTP_FROM || (tInfo ? tInfo.defaultFrom : null) || 'notificaciones@gestechnoclient.com';

  // If using Gmail, From address must match authenticated Gmail account to prevent rejection/spam marking
  let fromAddress = rawFrom;
  let replyToAddress = rawFrom;
  if (tInfo && tInfo.type === 'gmail') {
    fromAddress = tInfo.defaultFrom;
    replyToAddress = rawFrom;
  }

  const fromHeader = fromAddress.includes('<') ? fromAddress : `"Rancho Doble S" <${fromAddress}>`;

  const subject = 'Rancho Doble S — Restablecimiento de contraseña';
  const textContent = `Hola ${name || 'Vecino'},\n\nRecibimos una solicitud para restablecer la contraseña de tu cuenta en el Portal Rancho Doble S.\n\nHacé clic en el siguiente enlace seguro para definir tu nueva contraseña (válido por ${expiresMinutes} minutos):\n${resetLink}\n\nSi no realizaste esta solicitud, podés desestimar este mensaje de forma segura. Tu contraseña actual no ha sido modificada.\n\nAdministración Rancho Doble S`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Restablecimiento de Contraseña - Rancho Doble S</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1512; color: #e2e8f0; margin: 0; padding: 20px; }
        .card { max-width: 540px; margin: 0 auto; background: #13221c; border: 1px solid rgba(247, 199, 109, 0.3); border-radius: 16px; padding: 32px; box-sizing: border-box; }
        .header { text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 20px; margin-bottom: 24px; }
        .brand { font-size: 22px; font-weight: 700; color: #f7c76d; letter-spacing: 0.5px; }
        .subtitle { font-size: 13px; color: #94a3b8; margin-top: 4px; }
        .content { font-size: 15px; line-height: 1.6; color: #cbd5e1; }
        .btn-container { text-align: center; margin: 28px 0; }
        .btn { display: inline-block; background: #2f6f57; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 15px; border: 1px solid #69d2a6; }
        .link-alt { word-break: break-all; font-size: 12px; color: #94a3b8; background: rgba(0, 0, 0, 0.25); padding: 12px; border-radius: 8px; border: 1px dashed rgba(255, 255, 255, 0.15); margin-top: 16px; }
        .footer { font-size: 12px; color: #64748b; margin-top: 28px; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 16px; text-align: center; }
        .notice { font-size: 13px; color: #f7c76d; background: rgba(247, 199, 109, 0.1); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(247, 199, 109, 0.25); margin: 18px 0; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="brand">🏡 Rancho Doble S</div>
          <div class="subtitle">Portal Oficial de Propietarios y Residentes</div>
        </div>
        <div class="content">
          <p>Hola <strong>${escapeHtml(name || 'Vecino')}</strong>,</p>
          <p>Recibimos una solicitud para restablecer la contraseña de acceso a tu cuenta.</p>
          <div class="btn-container">
            <a href="${resetLink}" class="btn" target="_blank">Restablecer mi Contraseña</a>
          </div>
          <div class="notice">
            ⏱️ Este enlace es de uso único y tiene una validez de <strong>${expiresMinutes} minutos</strong>.
          </div>
          <p style="font-size: 13px; color: #94a3b8;">
            Si el botón no funciona, copiá y pegá el siguiente enlace seguro en tu navegador:
          </p>
          <div class="link-alt">${resetLink}</div>
        </div>
        <div class="footer">
          <p>Si no solicitaste este cambio, podés ignorar este correo de forma segura. La administración nunca te solicitará tu contraseña.</p>
          <p>© ${new Date().getFullYear()} Rancho Doble S. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (tInfo) {
    try {
      const info = await tInfo.transporter.sendMail({
        from: fromHeader,
        to,
        replyTo: replyToAddress,
        subject,
        text: textContent,
        html: htmlContent,
        headers: {
          'X-Priority': '1',
          'Importance': 'high'
        }
      });
      console.log(`[MAILER] Correo de recuperación enviado con éxito a ${to} (MessageId: ${info.messageId}) vía ${tInfo.type}`);
      return { sent: true, mode: tInfo.type, messageId: info.messageId };
    } catch (err) {
      console.error(`[MAILER] Error al enviar email vía ${tInfo.type}:`, err.message);
      return { sent: false, error: err.message, mode: tInfo.type };
    }
  } else {
    console.log('========================================================================');
    console.log('[MAILER] ⚠️ ATENCIÓN: SERVICIO DE CORREO NO CONFIGURADO EN .env');
    console.log(`Destinatario: ${to}`);
    console.log(`Asunto: ${subject}`);
    console.log(`Enlace de restablecimiento generado: ${resetLink}`);
    console.log('Para enviar correos reales (a Gmail y otros), configurá en el archivo .env:');
    console.log('  GMAIL_USER=tucorreo@gmail.com');
    console.log('  GMAIL_APP_PASS=xxxx xxxx xxxx xxxx');
    console.log('  o el servidor SMTP de tu proveedor.');
    console.log('========================================================================');
    return {
      sent: false,
      mode: 'unconfigured',
      resetLink,
      error: 'Servicio de correo no configurado. Configurá GMAIL_USER y GMAIL_APP_PASS (o SMTP) en el archivo .env del servidor.'
    };
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sendGenericEmail({ to, subject, html, text, fromName = 'Administración Rancho Doble S' }) {
  const tInfo = getTransporter();
  const rawFrom = getSetting('smtp_from') || process.env.SMTP_FROM || (tInfo ? tInfo.defaultFrom : null) || 'notificaciones@gestechnoclient.com';

  let fromAddress = rawFrom;
  if (tInfo && tInfo.type === 'gmail') {
    fromAddress = tInfo.defaultFrom;
  }
  const fromHeader = fromAddress.includes('<') ? fromAddress : `"${fromName}" <${fromAddress}>`;

  if (tInfo) {
    try {
      const info = await tInfo.transporter.sendMail({
        from: fromHeader,
        to,
        replyTo: fromAddress,
        subject,
        text: text || '',
        html: html || (text ? `<p style="font-family:sans-serif;line-height:1.5;">${escapeHtml(text).replace(/\n/g, '<br>')}</p>` : ''),
        headers: {
          'X-Priority': '1',
          'Importance': 'high'
        }
      });
      console.log(`[MAILER] Correo enviado con éxito a ${to} (MessageId: ${info.messageId}) vía ${tInfo.type}`);
      return { sent: true, mode: tInfo.type, messageId: info.messageId };
    } catch (err) {
      console.error(`[MAILER] Error al enviar email a ${to}:`, err.message);
      return { sent: false, error: err.message, mode: tInfo.type };
    }
  } else {
    console.log(`[MAILER] ⚠️ Correo no configurado. Intento de envío a: ${to} - Asunto: ${subject}`);
    return {
      sent: false,
      mode: 'unconfigured',
      error: 'Servicio de correo no configurado. Configurá una cuenta de Gmail o SMTP en Configuración Avanzada.'
    };
  }
}

async function sendTestEmail({ to }) {
  const tInfo = getTransporter();
  if (!tInfo) {
    return {
      sent: false,
      error: 'No hay ninguna cuenta de correo configurada. Ingresá los datos de Gmail o servidor SMTP en Configuración Avanzada y guardá los cambios.'
    };
  }

  const subject = 'Rancho Doble S — Prueba de Envío de Correo Electrónico';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1512; color: #e2e8f0; margin: 0; padding: 24px; border-radius: 12px; max-width: 520px; border: 1px solid #2f6f57;">
      <div style="text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 16px; margin-bottom: 20px;">
        <h2 style="color: #f7c76d; margin: 0; font-size: 22px;">🏡 Rancho Doble S</h2>
        <div style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Portal de Propietarios y Administración</div>
      </div>
      <div style="background: rgba(105, 210, 166, 0.1); border: 1px solid rgba(105, 210, 166, 0.3); border-radius: 8px; padding: 14px 18px; margin-bottom: 20px;">
        <h3 style="color: #69d2a6; margin: 0 0 6px 0; font-size: 16px;">✅ ¡Configuración de Correo Exitosa!</h3>
        <p style="margin: 0; font-size: 14px; color: #cbd5e1; line-height: 1.5;">
          Este correo confirma que la cuenta de correo asignada desde <strong>Configuración Avanzada</strong> funciona correctamente para el envío de notificaciones y comunicados a propietarios.
        </p>
      </div>
      <table style="width: 100%; font-size: 13px; color: #cbd5e1; margin-bottom: 20px;">
        <tr>
          <td style="color: #94a3b8; padding: 4px 0;">Servicio:</td>
          <td style="font-weight: 600; text-transform: uppercase;">${tInfo.type}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; padding: 4px 0;">Remitente configurado:</td>
          <td style="font-weight: 600;">${tInfo.defaultFrom}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; padding: 4px 0;">Fecha y hora de prueba:</td>
          <td>${new Date().toLocaleString('es-AR')}</td>
        </tr>
      </table>
      <div style="text-align: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; font-size: 12px; color: #64748b;">
        © ${new Date().getFullYear()} Consorcio Rancho Doble S — Sistema de Gestión Inteligente
      </div>
    </div>
  `;
  const text = `Rancho Doble S — Prueba de Envío de Correo Electrónico\n\n¡Configuración exitosa!\nEste correo confirma que la cuenta configurada en la Administración funciona correctamente para enviar comunicados a propietarios.\n\nServicio: ${tInfo.type.toUpperCase()}\nRemitente: ${tInfo.defaultFrom}\nFecha: ${new Date().toLocaleString('es-AR')}`;

  return sendGenericEmail({ to, subject, html, text, fromName: 'Rancho Doble S' });
}

module.exports = {
  sendPasswordResetEmail,
  sendGenericEmail,
  sendTestEmail,
  getTransporter,
  getMailerStatus
};

