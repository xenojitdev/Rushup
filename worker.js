/* ==========================================================================
   RUSHUP ESPORTS - CLOUDFLARE WORKER
   Worker Name: rushup-contact-api
   Endpoint: POST /api/contact
   Features: Support Request Validation, Telegram Text & Photo Delivery, CORS
   ========================================================================== */

export default {
  async fetch(request, env) {
    // 1. Handle CORS Preflight OPTIONS Request
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(),
      });
    }

    const url = new URL(request.url);

    // 2. Route Check: POST /api/contact
    if (request.method !== 'POST' || url.pathname !== '/api/contact') {
      return new Response(
        JSON.stringify({ success: false, error: 'Endpoint or method not allowed.' }),
        {
          status: 405,
          headers: getCorsHeaders({ 'Content-Type': 'application/json' }),
        }
      );
    }

    try {
      // 3. Parse & Log JSON Body
      const body = await request.json();
      console.log('Received request body:', JSON.stringify(body, null, 2));

      const { name, mobile, contactPreference, telegramUsername, subject, message, screenshotBase64 } = body || {};

      // 4. Input Validation
      const validationError = validateInput({ name, mobile, contactPreference, telegramUsername, subject, message });
      if (validationError) {
        console.error('Validation failure:', validationError);
        return new Response(
          JSON.stringify({ success: false, error: validationError }),
          {
            status: 400,
            headers: getCorsHeaders({ 'Content-Type': 'application/json' }),
          }
        );
      }

      // 5. Check Environment Secrets
      if (!env.BOT_TOKEN || !env.CHAT_ID) {
        console.error('Missing Telegram BOT_TOKEN or CHAT_ID secrets.');
        return new Response(
          JSON.stringify({ success: false, error: 'Server configuration error.' }),
          {
            status: 500,
            headers: getCorsHeaders({ 'Content-Type': 'application/json' }),
          }
        );
      }

      // 6. Construct Formatted Telegram Message
      const trimmedName = name.trim();
      const trimmedMobile = mobile.trim();
      const trimmedPref = contactPreference.trim();
      const trimmedSubject = subject.trim();
      const trimmedMessage = message.trim();
      const trimmedTgUser = telegramUsername ? telegramUsername.trim() : '';

      let messageParts = [
        '📩 New Support Request',
        '',
        '👤 Name:',
        trimmedName,
        '',
        '📞 Mobile:',
        trimmedMobile,
        '',
        '📲 Contact Preference:',
        trimmedPref
      ];

      if (trimmedPref === 'Telegram') {
        messageParts.push('');
        messageParts.push('💬 Telegram Username:');
        messageParts.push(trimmedTgUser);
      }

      messageParts.push('');
      messageParts.push('📌 Subject:');
      messageParts.push(trimmedSubject);
      messageParts.push('');
      messageParts.push('💬 Message:');
      messageParts.push('');
      messageParts.push(trimmedMessage);

      if (screenshotBase64 && typeof screenshotBase64 === 'string' && screenshotBase64.startsWith('data:image/')) {
        messageParts.push('');
        messageParts.push('📎 Screenshot:');
        messageParts.push('Attached');
      }

      const telegramMessage = messageParts.join('\n');

      let telegramResponse;

      // 8. Handle Photo Upload vs Text-only Message
      if (screenshotBase64 && typeof screenshotBase64 === 'string' && screenshotBase64.startsWith('data:image/')) {
        // Convert Base64 Data URL to Blob
        const parts = screenshotBase64.split(';base64,');
        const mimeType = parts[0].replace('data:', '');
        const base64Data = parts[1];
        const binaryData = atob(base64Data);
        const arrayBuffer = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
          arrayBuffer[i] = binaryData.charCodeAt(i);
        }
        const imageBlob = new Blob([arrayBuffer], { type: mimeType });

        // Build FormData for Telegram sendPhoto API
        const formData = new FormData();
        formData.append('chat_id', env.CHAT_ID);
        formData.append('caption', telegramMessage);
        formData.append('photo', imageBlob, `screenshot.${mimeType.split('/')[1] || 'png'}`);

        const telegramPhotoUrl = `https://api.telegram.org/bot${env.BOT_TOKEN}/sendPhoto`;
        telegramResponse = await fetch(telegramPhotoUrl, {
          method: 'POST',
          body: formData,
        });
      } else {
        // Send Text-only message via sendMessage API
        const telegramTextUrl = `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`;
        telegramResponse = await fetch(telegramTextUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: env.CHAT_ID,
            text: telegramMessage,
          }),
        });
      }

      const telegramResult = await telegramResponse.json();

      if (!telegramResponse.ok || !telegramResult.ok) {
        console.error('Telegram API error:', telegramResult);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to deliver message to Telegram support desk.' }),
          {
            status: 502,
            headers: getCorsHeaders({ 'Content-Type': 'application/json' }),
          }
        );
      }

      // 9. Success Response
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Your support request has been submitted successfully. Our support team will contact you through your selected contact method.',
        }),
        {
          status: 200,
          headers: getCorsHeaders({ 'Content-Type': 'application/json' }),
        }
      );

    } catch (err) {
      console.error('Worker exception:', err);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request body or internal error.' }),
        {
          status: 500,
          headers: getCorsHeaders({ 'Content-Type': 'application/json' }),
        }
      );
    }
  },
};

/* --- Input Validation Utility --- */
function validateInput({ name, mobile, contactPreference, telegramUsername, subject, message }) {
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return 'Missing or invalid name field (must be at least 2 characters)';
  }

  if (!mobile || typeof mobile !== 'string' || mobile.trim().length === 0) {
    return 'Missing mobile field';
  }

  const mobileRegex = /^\d{10}$/;
  if (!mobileRegex.test(mobile.trim())) {
    return 'Invalid mobile field (must be exactly 10 digits)';
  }

  if (!contactPreference || typeof contactPreference !== 'string' || !['Telegram', 'WhatsApp'].includes(contactPreference.trim())) {
    return 'Missing or invalid contactPreference field (must be Telegram or WhatsApp)';
  }

  if (contactPreference.trim() === 'Telegram') {
    if (!telegramUsername || typeof telegramUsername !== 'string' || !telegramUsername.trim().startsWith('@') || telegramUsername.trim().length < 2) {
      return 'Missing or invalid telegramUsername field (required for Telegram preference, must start with @)';
    }
  }

  if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
    return 'Missing subject field';
  }

  if (!message || typeof message !== 'string' || message.trim().length < 5) {
    return 'Missing or invalid message field (must be at least 5 characters)';
  }

  return null;
}

/* --- CORS Headers Utility --- */
function getCorsHeaders(additionalHeaders = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...additionalHeaders,
  };
}
