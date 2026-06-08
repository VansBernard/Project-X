import dotenv from 'dotenv';
dotenv.config();

import { sendUnlockTokenEmail } from './utils/notifications.js';

(async function run() {
  try {
    const to = process.env.SMTP_USER;
    console.log('Sending test unlock email to', to);

    const result = await sendUnlockTokenEmail({
      to,
      customerName: 'Test User',
      token: 'TEST1234',
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0,10)
    });

    console.log('Email send result:', result);
  } catch (err) {
    console.error('Error sending test email:', err);
    process.exit(1);
  }
})();
