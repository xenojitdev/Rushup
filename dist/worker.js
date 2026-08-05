/* ==========================================================================
   RUSHUP ESPORTS - CLOUDFLARE WORKER
   Endpoints: 
     - POST /api/contact   (Support Request Form)
     - POST /api/register  (Tournament Registration Form)
   Features: Support & Registration Validation, Telegram Integration, CORS
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

    // 2. Route Check
    if (request.method !== 'POST' || !['/api/contact', '/api/register'].includes(url.pathname)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Endpoint or method not allowed.' }),
        {
          status: 405,
          headers: getCorsHeaders({ 'Content-Type': 'application/json' }),
        }
      );
    }

    // 3. Check Environment Secrets
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

    try {
      const body = await request.json();
      console.log(`Received request for ${url.pathname}:`, JSON.stringify(body, null, 2));

      // --- ROUTE A: Tournament Registration (/api/register) ---
      if (url.pathname === '/api/register') {
        const validationError = validateRegisterInput(body);
        if (validationError) {
          console.error('Registration validation failure:', validationError);
          return new Response(
            JSON.stringify({ success: false, error: validationError }),
            {
              status: 400,
              headers: getCorsHeaders({ 'Content-Type': 'application/json' }),
            }
          );
        }

        const {
          tournament = 'RushUp Battle Series (RBS) 2026',
          teamName,
          shortName,
          leaderName,
          leaderUID,
          player2Name,
          player2UID,
          player3Name,
          player3UID,
          player4Name,
          player4UID,
          mobile,
          whatsapp,
          telegramUsername,
        } = body;

        const submittedDate = new Date().toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          dateStyle: 'medium',
          timeStyle: 'medium',
        });

        const telegramMessage = [
          '🏆 New Tournament Registration',
          '',
          'Tournament:',
          tournament.trim(),
          '',
          '━━━━━━━━━━━━━━━━━━',
          '',
          'Team Name:',
          teamName.trim(),
          '',
          'Short Name:',
          shortName.trim(),
          '',
          '━━━━━━━━━━━━━━━━━━',
          '',
          'Leader:',
          leaderName.trim(),
          'UID:',
          leaderUID.trim(),
          '',
          '━━━━━━━━━━━━━━━━━━',
          '',
          'Player 2:',
          player2Name.trim(),
          'UID:',
          player2UID.trim(),
          '',
          'Player 3:',
          player3Name.trim(),
          'UID:',
          player3UID.trim(),
          '',
          'Player 4:',
          player4Name.trim(),
          'UID:',
          player4UID.trim(),
          '',
          '━━━━━━━━━━━━━━━━━━',
          '',
          'Mobile:',
          mobile.trim(),
          '',
          'WhatsApp:',
          whatsapp.trim(),
          '',
          'Telegram:',
          telegramUsername && telegramUsername.trim() ? telegramUsername.trim() : 'N/A',
          '',
          '━━━━━━━━━━━━━━━━━━',
          '',
          'Eligibility Confirmed:',
          'Yes',
          '',
          'Rules Accepted:',
          'Yes',
          '',
          '━━━━━━━━━━━━━━━━━━',
          '',
          'Submitted:',
          submittedDate,
        ].join('\n');

        const telegramTextUrl = `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`;
        const telegramResponse = await fetch(telegramTextUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: env.CHAT_ID,
            text: telegramMessage,
          }),
        });

        const telegramResult = await telegramResponse.json();

        if (!telegramResponse.ok || !telegramResult.ok) {
          console.error('Telegram API error for registration:', telegramResult);
          return new Response(
            JSON.stringify({
              success: false,
              error: telegramResult.description || 'Failed to deliver registration details to Telegram.',
            }),
            {
              status: 502,
              headers: getCorsHeaders({ 'Content-Type': 'application/json' }),
            }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Your tournament registration has been submitted successfully.',
          }),
          {
            status: 200,
            headers: getCorsHeaders({ 'Content-Type': 'application/json' }),
          }
        );
      }

      // --- ROUTE B: Support Request (/api/contact) ---
      const { name, mobile, contactPreference, telegramUsername, subject, message, screenshotBase64 } = body || {};

      const validationError = validateInput({ name, mobile, contactPreference, telegramUsername, subject, message });
      if (validationError) {
        console.error('Contact validation failure:', validationError);
        return new Response(
          JSON.stringify({ success: false, error: validationError }),
          {
            status: 400,
            headers: getCorsHeaders({ 'Content-Type': 'application/json' }),
          }
        );
      }

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

      if (screenshotBase64 && typeof screenshotBase64 === 'string' && screenshotBase64.startsWith('data:image/')) {
        const parts = screenshotBase64.split(';base64,');
        const mimeType = parts[0].replace('data:', '');
        const base64Data = parts[1];
        const binaryData = atob(base64Data);
        const arrayBuffer = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
          arrayBuffer[i] = binaryData.charCodeAt(i);
        }
        const imageBlob = new Blob([arrayBuffer], { type: mimeType });

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
          JSON.stringify({ success: false, error: telegramResult.description || 'Failed to deliver message to Telegram support desk.' }),
          {
            status: 502,
            headers: getCorsHeaders({ 'Content-Type': 'application/json' }),
          }
        );
      }

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

/* --- Input Validation Utilities --- */
function validateRegisterInput(body) {
  if (!body || typeof body !== 'object') return 'Invalid JSON payload';

  const {
    teamName,
    shortName,
    leaderName,
    leaderUID,
    player2Name,
    player2UID,
    player3Name,
    player3UID,
    player4Name,
    player4UID,
    mobile,
    whatsapp,
    level40Confirmed,
    rulesAccepted,
  } = body;

  if (!teamName || typeof teamName !== 'string' || teamName.trim().length < 2) {
    return 'Missing or invalid Team Name (must be at least 2 characters)';
  }
  if (!shortName || typeof shortName !== 'string' || shortName.trim().length < 1) {
    return 'Missing or invalid Short Team Name';
  }
  if (!leaderName || typeof leaderName !== 'string' || leaderName.trim().length < 2) {
    return 'Missing or invalid Leader Name';
  }
  if (!leaderUID || typeof leaderUID !== 'string' || leaderUID.trim().length < 3) {
    return 'Missing or invalid Leader UID';
  }
  if (!player2Name || typeof player2Name !== 'string' || player2Name.trim().length < 2) {
    return 'Missing or invalid Player 2 Name';
  }
  if (!player2UID || typeof player2UID !== 'string' || player2UID.trim().length < 3) {
    return 'Missing or invalid Player 2 UID';
  }
  if (!player3Name || typeof player3Name !== 'string' || player3Name.trim().length < 2) {
    return 'Missing or invalid Player 3 Name';
  }
  if (!player3UID || typeof player3UID !== 'string' || player3UID.trim().length < 3) {
    return 'Missing or invalid Player 3 UID';
  }
  if (!player4Name || typeof player4Name !== 'string' || player4Name.trim().length < 2) {
    return 'Missing or invalid Player 4 Name';
  }
  if (!player4UID || typeof player4UID !== 'string' || player4UID.trim().length < 3) {
    return 'Missing or invalid Player 4 UID';
  }

  const mobileRegex = /^\d{10}$/;
  if (!mobile || typeof mobile !== 'string' || !mobileRegex.test(mobile.trim())) {
    return 'Invalid Mobile Number (must be exactly 10 digits)';
  }
  if (!whatsapp || typeof whatsapp !== 'string' || !mobileRegex.test(whatsapp.trim())) {
    return 'Invalid WhatsApp Number (must be exactly 10 digits)';
  }

  if (level40Confirmed !== true) {
    return 'You must confirm that all players are at least Level 40';
  }
  if (rulesAccepted !== true) {
    return 'You must accept the tournament rules before submitting';
  }

  return null;
}

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

function getCorsHeaders(additionalHeaders = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...additionalHeaders,
  };
}
