/**
 * WhatsApp Dispatcher Service for Rancho Doble S
 * Handles automated dispatch of visitor QR passes directly to visitor WhatsApp numbers.
 * Supports:
 *  - Meta WhatsApp Cloud API (Graph API)
 *  - Evolution API / Baileys Gateway (Self-hosted or cloud)
 *  - Twilio WhatsApp API
 *  - Generic Webhook / Gateway
 *  - Development simulated mode (with clean console logging when unconfigured)
 */

const DEFAULT_CAPTION = process.env.WHATSAPP_QR_CAPTION || 'Te enviamos el código QR para el ingreso al predio, presentalo en la guardia de ingreso.';

/**
 * Normalizes phone numbers to standard WhatsApp format (E.164 without leading plus).
 * For Argentine numbers: 549 + area code + local number.
 */
function normalizeWhatsAppNumber(phone) {
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
 * Returns configuration status of WhatsApp provider.
 */
function getWhatsAppStatus() {
  const metaToken = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WA_TOKEN;
  const metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID;
  if (metaToken && metaPhoneId) {
    return { configured: true, provider: 'meta_cloud', phoneId: metaPhoneId };
  }

  const evoUrl = process.env.WHATSAPP_API_URL || process.env.EVOLUTION_API_URL;
  if (evoUrl) {
    return { configured: true, provider: 'evolution_gateway', url: evoUrl };
  }

  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_WHATSAPP_NUMBER;
  if (twilioSid && twilioToken && twilioPhone) {
    return { configured: true, provider: 'twilio', from: twilioPhone };
  }

  const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL;
  if (webhookUrl) {
    return { configured: true, provider: 'webhook', url: webhookUrl };
  }

  return { configured: false, provider: 'simulated' };
}

/**
 * Sends visitor QR pass image directly to visitor WhatsApp number.
 * Message contains ONLY the QR image and caption text:
 * "Te enviamos el código QR para el ingreso al predio, presentalo en la guardia de ingreso."
 */
async function sendWhatsAppQrPass({ phone, qrCode, visitId, visitorName, caption = DEFAULT_CAPTION, protocol, reqHost }) {
  const normalizedPhone = normalizeWhatsAppNumber(phone);
  if (!normalizedPhone) {
    console.warn('[WhatsApp Dispatcher] Número de teléfono inválido o vacío.');
    return { success: false, error: 'Número de WhatsApp inválido' };
  }

  // Extract binary buffer from base64 data URI
  let imageBuffer = null;
  let mimeType = 'image/png';
  if (qrCode && typeof qrCode === 'string' && qrCode.includes(';base64,')) {
    const parts = qrCode.split(';base64,');
    mimeType = parts[0].replace('data:', '') || 'image/png';
    imageBuffer = Buffer.from(parts[1], 'base64');
  }

  // Construct public QR image URL if visitId and host are available
  let publicQrUrl = null;
  if (visitId && reqHost) {
    const proto = protocol || 'https';
    publicQrUrl = `${proto}://${reqHost}/api/visits/${visitId}/qr.png`;
  } else if (process.env.APP_URL && visitId) {
    const base = process.env.APP_URL.replace(/\/+$/, '');
    publicQrUrl = `${base}/api/visits/${visitId}/qr.png`;
  }

  const status = getWhatsAppStatus();

  // 1. Meta WhatsApp Cloud API (Graph API)
  if (status.provider === 'meta_cloud') {
    try {
      const metaToken = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WA_TOKEN;
      const metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID;

      let mediaId = null;

      // Upload image buffer directly if available to Meta Cloud API
      if (imageBuffer) {
        try {
          const form = new FormData();
          const blob = new Blob([imageBuffer], { type: mimeType });
          form.append('file', blob, 'codigo-qr-ingreso.png');
          form.append('type', mimeType);
          form.append('messaging_product', 'whatsapp');

          const uploadRes = await fetch(`https://graph.facebook.com/v21.0/${metaPhoneId}/media`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${metaToken}`
            },
            body: form
          });

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            mediaId = uploadData.id;
          } else {
            const errData = await uploadRes.text();
            console.warn('[WhatsApp Meta Media Upload Warning]', errData);
          }
        } catch (mediaErr) {
          console.warn('[WhatsApp Meta Media Upload Error]', mediaErr.message);
        }
      }

      // Prepare message payload: ONLY QR Image + Caption
      const imagePayload = mediaId
        ? { id: mediaId, caption }
        : publicQrUrl
          ? { link: publicQrUrl, caption }
          : null;

      if (!imagePayload) {
        throw new Error('No se pudo generar la imagen para el envío por Meta Cloud API.');
      }

      const msgRes = await fetch(`https://graph.facebook.com/v21.0/${metaPhoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${metaToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedPhone,
          type: 'image',
          image: imagePayload
        })
      });

      const msgData = await msgRes.json();
      if (!msgRes.ok) {
        console.error('[WhatsApp Meta Send Error]', msgData);
        return { success: false, error: msgData.error?.message || 'Error en WhatsApp Cloud API' };
      }

      console.log(`[WhatsApp Service] ✅ Imagen QR enviada vía Meta Cloud API a +${normalizedPhone} (ID: ${msgData.messages?.[0]?.id})`);
      return { success: true, provider: 'meta_cloud', messageId: msgData.messages?.[0]?.id };
    } catch (err) {
      console.error('[WhatsApp Meta Exception]', err);
      return { success: false, error: err.message };
    }
  }

  // 2. Evolution API / Baileys Gateway
  if (status.provider === 'evolution_gateway') {
    try {
      const evoUrl = (process.env.WHATSAPP_API_URL || process.env.EVOLUTION_API_URL).replace(/\/+$/, '');
      const evoKey = process.env.WHATSAPP_API_KEY || process.env.EVOLUTION_API_KEY || '';
      const evoInstance = process.env.WHATSAPP_INSTANCE || process.env.EVOLUTION_INSTANCE || 'ranchodobles';

      const mediaBase64 = imageBuffer ? imageBuffer.toString('base64') : (qrCode && qrCode.includes('base64,') ? qrCode.split('base64,')[1] : null);

      const payload = {
        number: normalizedPhone,
        media: mediaBase64 || publicQrUrl,
        mediatype: 'image',
        mimetype: 'image/png',
        caption,
        fileName: 'codigo-qr-ingreso.png'
      };

      // Try Evolution API endpoint formats
      const endpoint = `${evoUrl}/message/sendMedia/${evoInstance}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(evoKey ? { apikey: evoKey, Authorization: `Bearer ${evoKey}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('[WhatsApp Evolution Gateway Error]', data);
        return { success: false, error: 'Error enviando imagen QR por Evolution Gateway' };
      }

      console.log(`[WhatsApp Service] ✅ Imagen QR enviada vía Evolution Gateway a +${normalizedPhone}`);
      return { success: true, provider: 'evolution_gateway' };
    } catch (err) {
      console.error('[WhatsApp Evolution Exception]', err);
      return { success: false, error: err.message };
    }
  }

  // 3. Twilio WhatsApp API
  if (status.provider === 'twilio') {
    try {
      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhone = process.env.TWILIO_WHATSAPP_NUMBER;
      const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');

      const params = new URLSearchParams();
      params.append('From', twilioPhone.startsWith('whatsapp:') ? twilioPhone : `whatsapp:${twilioPhone}`);
      params.append('To', `whatsapp:+${normalizedPhone}`);
      params.append('Body', caption);
      if (publicQrUrl) {
        params.append('MediaUrl', publicQrUrl);
      }

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('[WhatsApp Twilio Error]', data);
        return { success: false, error: data.message || 'Error Twilio' };
      }

      console.log(`[WhatsApp Service] ✅ Imagen QR enviada vía Twilio a +${normalizedPhone}`);
      return { success: true, provider: 'twilio', sid: data.sid };
    } catch (err) {
      console.error('[WhatsApp Twilio Exception]', err);
      return { success: false, error: err.message };
    }
  }

  // 4. Custom Webhook
  if (status.provider === 'webhook') {
    try {
      const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL;
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: normalizedPhone,
          caption,
          qrImageUrl: publicQrUrl,
          qrImageBase64: qrCode,
          visitorName
        })
      });
      console.log(`[WhatsApp Service] ✅ Notificación enviada vía Webhook a +${normalizedPhone}`);
      return { success: res.ok, provider: 'webhook' };
    } catch (err) {
      console.error('[WhatsApp Webhook Exception]', err);
      return { success: false, error: err.message };
    }
  }

  // 5. Simulated Mode (Default when credentials are not yet configured)
  console.log(`----------------------------------------------------------------`);
  console.log(`[WhatsApp Service] 📲 Envío de QR a WhatsApp: +${normalizedPhone}`);
  console.log(`[WhatsApp Service] Destinatario: ${visitorName || 'Visita'}`);
  console.log(`[WhatsApp Service] Texto: "${caption}"`);
  console.log(`[WhatsApp Service] Imagen adjunta: Código QR PNG (${imageBuffer ? imageBuffer.length : (qrCode ? qrCode.length : 0)} bytes)`);
  if (publicQrUrl) {
    console.log(`[WhatsApp Service] Enlace directo de imagen: ${publicQrUrl}`);
  }
  console.log(`[WhatsApp Service] (Para envío real automático en WhatsApp, configure WHATSAPP_TOKEN o WHATSAPP_API_URL en el archivo .env)`);
  console.log(`----------------------------------------------------------------`);

  return {
    success: true,
    simulated: true,
    phone: normalizedPhone,
    caption,
    publicQrUrl
  };
}

/**
 * Sends a text notification directly to a resident's WhatsApp number.
 */
async function sendWhatsAppTextMessage({ phone, title, message, senderName, recipientName }) {
  const normalizedPhone = normalizeWhatsAppNumber(phone);
  if (!normalizedPhone) {
    console.warn('[WhatsApp Dispatcher] Número de teléfono de vecino inválido o vacío.');
    return { success: false, error: 'Número de WhatsApp inválido' };
  }

  const senderHeader = senderName ? `De: ${senderName}` : 'Administración / Guardia';
  const textContent = `*Rancho Doble S — Aviso Oficial*\n_${senderHeader}_\n\n*${title}*\n${message}`;

  const status = getWhatsAppStatus();

  // 1. Meta WhatsApp Cloud API
  if (status.provider === 'meta_cloud') {
    try {
      const metaToken = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WA_TOKEN;
      const metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID;

      const res = await fetch(`https://graph.facebook.com/v21.0/${metaPhoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${metaToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: textContent
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('[WhatsApp Meta Text Error]', data);
        return { success: false, error: data.error?.message || 'Error en WhatsApp Cloud API' };
      }

      console.log(`[WhatsApp Service] ✅ Notificación enviada vía Meta Cloud API a +${normalizedPhone}`);
      return { success: true, provider: 'meta_cloud', messageId: data.messages?.[0]?.id };
    } catch (err) {
      console.error('[WhatsApp Meta Text Exception]', err);
      return { success: false, error: err.message };
    }
  }

  // 2. Evolution API / Baileys Gateway
  if (status.provider === 'evolution_gateway') {
    try {
      const evoUrl = (process.env.WHATSAPP_API_URL || process.env.EVOLUTION_API_URL).replace(/\/+$/, '');
      const evoKey = process.env.WHATSAPP_API_KEY || process.env.EVOLUTION_API_KEY || '';
      const evoInstance = process.env.WHATSAPP_INSTANCE || process.env.EVOLUTION_INSTANCE || 'ranchodobles';

      const endpoint = `${evoUrl}/message/sendText/${evoInstance}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(evoKey ? { apikey: evoKey, Authorization: `Bearer ${evoKey}` } : {})
        },
        body: JSON.stringify({
          number: normalizedPhone,
          text: textContent
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('[WhatsApp Evolution Text Error]', data);
        return { success: false, error: 'Error enviando texto vía Evolution Gateway' };
      }

      console.log(`[WhatsApp Service] ✅ Notificación enviada vía Evolution Gateway a +${normalizedPhone}`);
      return { success: true, provider: 'evolution_gateway' };
    } catch (err) {
      console.error('[WhatsApp Evolution Text Exception]', err);
      return { success: false, error: err.message };
    }
  }

  // 3. Twilio WhatsApp API
  if (status.provider === 'twilio') {
    try {
      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhone = process.env.TWILIO_WHATSAPP_NUMBER;
      const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');

      const params = new URLSearchParams();
      params.append('From', twilioPhone.startsWith('whatsapp:') ? twilioPhone : `whatsapp:${twilioPhone}`);
      params.append('To', `whatsapp:+${normalizedPhone}`);
      params.append('Body', textContent);

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('[WhatsApp Twilio Text Error]', data);
        return { success: false, error: data.message || 'Error Twilio' };
      }

      console.log(`[WhatsApp Service] ✅ Notificación enviada vía Twilio a +${normalizedPhone}`);
      return { success: true, provider: 'twilio', sid: data.sid };
    } catch (err) {
      console.error('[WhatsApp Twilio Text Exception]', err);
      return { success: false, error: err.message };
    }
  }

  // 4. Custom Webhook
  if (status.provider === 'webhook') {
    try {
      const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL;
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'text',
          phone: normalizedPhone,
          title,
          message,
          senderName,
          recipientName,
          formattedText: textContent
        })
      });
      return { success: res.ok, provider: 'webhook' };
    } catch (err) {
      console.error('[WhatsApp Webhook Text Exception]', err);
      return { success: false, error: err.message };
    }
  }

  // 5. Simulated Mode (Default when credentials are not yet configured)
  console.log(`----------------------------------------------------------------`);
  console.log(`[WhatsApp Service] 💬 Envío de Notificación a WhatsApp: +${normalizedPhone}`);
  console.log(`[WhatsApp Service] Vecino destinatario: ${recipientName || 'Vecino'}`);
  console.log(`[WhatsApp Service] Remitente: ${senderName || 'Administración / Guardia'}`);
  console.log(`[WhatsApp Service] Título: "${title}"`);
  console.log(`[WhatsApp Service] Mensaje: "${message}"`);
  console.log(`[WhatsApp Service] (Para envío en vivo configure credenciales en .env)`);
  console.log(`----------------------------------------------------------------`);

  return {
    success: true,
    simulated: true,
    phone: normalizedPhone,
    text: textContent
  };
}

module.exports = {
  DEFAULT_CAPTION,
  normalizeWhatsAppNumber,
  getWhatsAppStatus,
  sendWhatsAppQrPass,
  sendWhatsAppTextMessage
};
