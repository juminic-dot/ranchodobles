const nodemailer = require('nodemailer');

function getTransporter() {
  // 1. Gmail credentials (direct GMAIL_USER or SMTP_USER ending in @gmail.com)
  const gmailUser = process.env.GMAIL_USER || (process.env.SMTP_USER && process.env.SMTP_USER.includes('@gmail.com') ? process.env.SMTP_USER : null);
  const gmailPass = process.env.GMAIL_APP_PASS || (gmailUser ? process.env.SMTP_PASS : null);

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

  // 2. Custom remote SMTP credentials
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (host && user && pass) {
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
  if (!tInfo) return { configured: false, type: 'none' };
  return { configured: true, type: tInfo.type, from: tInfo.defaultFrom };
}

async function sendPasswordResetEmail({ to, name, resetLink, expiresMinutes = 60 }) {
  const tInfo = getTransporter();
  const rawFrom = process.env.SMTP_FROM || (tInfo ? tInfo.defaultFrom : null) || 'notificaciones@gestechnoclient.com';

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

module.exports = {
  sendPasswordResetEmail,
  getTransporter,
  getMailerStatus
};
