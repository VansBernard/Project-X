import express from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';
import pool from './db.js';
import { formatPaystackAmount, generateReleaseToken, generateTimeToken } from './timeToken.js';
import logger from './logger.js';
import { sendReleaseTokenEmail, sendUnlockTokenEmail } from './notifications.js';
import { normalizeString, validateDeviceRegistration, isValidPaystackSignature } from './validation.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname);

const app = express();
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf } }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// Helper to wrap async route handlers and forward errors to centralized handler
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

const serverConfig = {
  paystackSecret: normalizeString(process.env.PAYSTACK_SECRET),
  paystackPublicKey: normalizeString(process.env.PAYSTACK_PUBLIC_KEY),
  tokenSecret: normalizeString(process.env.TOKEN_SECRET),
  emailEnabled: normalizeString(process.env.EMAIL_ENABLED).toLowerCase() === 'true'
};

function isWeakSecret(value) {
  return !value || value.length < 32 || /(replace_with|change_me|example|test_secret)/i.test(value);
}

function assertRequiredConfig() {
  if (isWeakSecret(serverConfig.tokenSecret)) {
    logger.error('TOKEN_SECRET is required and must be a strong secret in the environment');
    process.exit(1);
  }

  if (!serverConfig.paystackSecret) {
    logger.warn('PAYSTACK_SECRET is not configured; Paystack webhooks will fail until it is set');
  }

  if (!serverConfig.paystackPublicKey) {
    logger.warn('PAYSTACK_PUBLIC_KEY is not configured; the web payment page cannot initialize Paystack until it is set');
  }

  if (serverConfig.emailEnabled) {
    verifyEmailConfig();
  }
}

function verifyEmailConfig() {
  const missing = [];

  if (!normalizeString(process.env.EMAIL_FROM)) missing.push('EMAIL_FROM');
  if (!normalizeString(process.env.SMTP_HOST)) missing.push('SMTP_HOST');
  if (!normalizeString(process.env.SMTP_USER)) missing.push('SMTP_USER');
  if (!normalizeString(process.env.SMTP_PASS)) missing.push('SMTP_PASS');

  if (missing.length > 0) {
    logger.error(`EMAIL_ENABLED=true requires the following environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

function addOneMonth(dateValue = new Date()) {
  const date = dateValue ? new Date(dateValue) : new Date();
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  const nextMonthFirstDay = new Date(Date.UTC(year, month + 1, 1));
  const nextMonthLastDay = new Date(Date.UTC(year, month + 2, 0)).getUTCDate();
  const normalizedDay = Math.min(day, nextMonthLastDay);
  return new Date(Date.UTC(year, month + 1, normalizedDay));
}

function tokenPeriodFromDate(date) {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1
  };
}

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function generateDeviceAddress(hardwareUUID) {
  if (!hardwareUUID) {
    throw new Error('hardwareUUID is required to generate the device address');
  }

  const normalized = hardwareUUID.trim().toUpperCase();
  const hash = crypto.createHash('sha256').update(normalized, 'utf8').digest('hex').substring(0, 12);
  return `${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}`;
}

function buildPaymentUrl(deviceAddress, customerEmail, contractId, paymentHost) {
  const resolvedPaymentHost = paymentHost.replace(/\/$/, '');
  const params = new URLSearchParams({ device: deviceAddress, email: customerEmail });
  if (contractId) {
    params.set('contractId', contractId);
  }
  return `${resolvedPaymentHost}/pay?${params.toString()}`;
}

app.post('/api/v1/devices/register', asyncHandler(async (req, res) => {
  const {
    hardwareUuid,
    deviceName,
    customerName,
    customerEmail,
    phoneNumber,
    totalContractAmount,
    paymentFrequency,
    paymentAmount,
    deviceAddress: providedDeviceAddress
  } = validateDeviceRegistration(req.body);

  const normalizedAddress = generateDeviceAddress(hardwareUuid);
  const deviceAddress = providedDeviceAddress || normalizedAddress;

  if (normalizedAddress !== deviceAddress) {
    const err = new Error('Device address does not match the hardware UUID');
    err.status = 400;
    throw err;
  }

  const totalAmount = totalContractAmount;
  const paymentAmountValue = paymentAmount;

  const result = await pool.query('SELECT 1 FROM laptops WHERE hardware_uuid = $1', [hardwareUuid]);
  if (result.rowCount > 0) {
    return res.status(409).json({ error: 'Device already registered' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const customerSelect = await client.query('SELECT id FROM customers WHERE email = $1', [customerEmail]);
    let customerId;

    if (customerSelect.rowCount > 0) {
      customerId = customerSelect.rows[0].id;
    } else {
      const customerInsert = await client.query(
        `INSERT INTO customers (full_name, email, phone_number, account_status, created_at, updated_at, created_by, updated_by)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $5, $5)
         RETURNING id`,
        [customerName, customerEmail, phoneNumber, 'Active', 'registration']
      );
      customerId = customerInsert.rows[0].id;
    }

    const laptopInsert = await client.query(
      `INSERT INTO laptops (customer_id, hardware_uuid, device_name, total_device_cost, device_status, created_at, updated_at, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $6, $6)
       RETURNING id`,
      [customerId, hardwareUuid, deviceName, totalAmount, 'Active', 'registration']
    );

    const laptopId = laptopInsert.rows[0].id;
    const today = new Date();
    let nextPaymentDueDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, today.getUTCDate()));
    if (paymentFrequency === 'Weekly') {
      nextPaymentDueDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 7));
    }
    if (paymentFrequency === 'Yearly') {
      nextPaymentDueDate = new Date(Date.UTC(today.getUTCFullYear() + 1, today.getUTCMonth(), today.getUTCDate()));
    }

    const nextPaymentDueDateString = nextPaymentDueDate.toISOString().slice(0, 10);
    const targetExpirationYear = nextPaymentDueDate.getUTCFullYear();
    const targetExpirationMonth = nextPaymentDueDate.getUTCMonth() + 1;

    const contractInsert = await client.query(
      `INSERT INTO financing_contracts (
         laptop_id,
         customer_id,
         total_contract_amount,
         amount_paid_to_date,
         monthly_payment_amount,
         payment_frequency,
         next_payment_due_date,
         current_time_token,
         time_token_issued_at,
         time_token_expires_at,
         release_token,
         release_token_issued_at,
         contract_start_date,
         target_expiration_year,
         target_expiration_month,
         contract_status,
         created_at,
         updated_at,
         created_by,
         updated_by
       ) VALUES (
         $1,$2,$3,0.00,$4,$5,$6,NULL,NULL,NULL,NULL,NULL,CURRENT_DATE,$7,$8,'Active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,$9,$9
       )
       RETURNING id`,
      [laptopId, customerId, totalAmount, paymentAmountValue, paymentFrequency, nextPaymentDueDateString, targetExpirationYear, targetExpirationMonth, 'registration']
    );

    const contractId = contractInsert.rows[0].id;

    await client.query('COMMIT');

    const paymentHost = process.env.PAYMENT_PAGE_URL || `${req.protocol}://${req.get('host')}`;
    const paymentUrl = buildPaymentUrl(deviceAddress, customerEmail, contractId, paymentHost);
    res.json({ status: 'ok', deviceAddress, contractId, paymentUrl });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

app.get('/api/v1/devices/register', (req, res) => {
  res.status(405).json({
    error: 'Use POST /api/v1/devices/register to register a device.',
    requiredFields: [
      'hardwareUuid',
      'deviceName',
      'customerName',
      'customerEmail',
      'phoneNumber',
      'totalContractAmount',
      'paymentFrequency',
      'paymentAmount'
    ],
    note: 'deviceAddress is generated automatically when omitted.'
  });
});

app.use('/pay/api', (req, res) => {
  const correctedPath = req.originalUrl.replace(/^\/pay\/api/, '/api');
  res.status(400).json({
    error: `Use ${correctedPath} instead. API routes start at /api, not /pay/api.`,
    correctedPath
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/v1/config', (req, res) => {
  res.json({
    paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
    paymentCurrency: process.env.PAYMENT_CURRENCY || 'GHS'
  });
});

app.get('/api/v1/devices/:hardwareUUID/status', asyncHandler(async (req, res) => {
  const { hardwareUUID } = req.params;

  const result = await pool.query(
    `SELECT
       l.id AS laptop_id,
       l.hardware_uuid,
       l.device_name,
       l.device_status,
       c.full_name AS owner_name,
       c.account_status,
       fc.id AS contract_id,
       fc.amount_paid_to_date,
       fc.total_contract_amount,
       fc.amount_remaining,
       fc.contract_status,
       fc.next_payment_due_date,
       fc.time_token_expires_at
     FROM laptops l
     LEFT JOIN financing_contracts fc ON l.id = fc.laptop_id
     LEFT JOIN customers c ON l.customer_id = c.id
     WHERE l.hardware_uuid = $1`,
    [hardwareUUID]
  );

  if (result.rowCount === 0) {
    logger.warn('Device not found', { hardwareUUID });
    return res.status(404).json({ error: 'Device not found' });
  }

  res.json(result.rows[0]);
}));

app.get('/api/v1/contracts/:contractId', asyncHandler(async (req, res) => {
  const { contractId } = req.params;

  const result = await pool.query(
    `SELECT
       fc.id,
       fc.monthly_payment_amount AS payment_amount,
       fc.total_contract_amount,
       fc.amount_paid_to_date,
       fc.payment_frequency,
       fc.next_payment_due_date,
       fc.contract_status,
       c.email,
       c.full_name,
       l.hardware_uuid
     FROM financing_contracts fc
     JOIN customers c ON fc.customer_id = c.id
     JOIN laptops l ON fc.laptop_id = l.id
     WHERE fc.id = $1`,
    [contractId]
  );

  if (result.rowCount === 0) {
    logger.warn('Contract not found', { contractId });
    return res.status(404).json({ error: 'Contract not found' });
  }

  res.json(result.rows[0]);
}));

app.post('/api/v1/paystack-webhook', asyncHandler(async (req, res) => {
  const signature = req.headers['x-paystack-signature'];

  if (!serverConfig.paystackSecret) {
    logger.warn('Paystack secret not configured');
    const err = new Error('Webhook not configured');
    err.status = 500;
    throw err;
  }

  if (!signature) {
    logger.warn('Missing Paystack signature header');
    const err = new Error('Missing signature');
    err.status = 400;
    throw err;
  }

  try {
    const expected = crypto.createHmac('sha512', serverConfig.paystackSecret).update(req.rawBody || '').digest('hex');
    if (!isValidPaystackSignature(signature, expected)) {
      logger.warn('Invalid Paystack signature');
      const err = new Error('Invalid signature');
      err.status = 400;
      throw err;
    }

    const payload = req.body;
    logger.info('Paystack webhook received', { event: payload?.event });

      switch (payload.event) {
        case 'charge.success': {
          const data = payload.data || {};
          const paystackRef = data.reference || data.id || null;
          const amountKobo = Number(data.amount);

          if (!Number.isFinite(amountKobo) || amountKobo <= 0) {
            logger.warn('Invalid amount in Paystack webhook', { amount: data.amount });
            const err = new Error('Invalid payment amount');
            err.status = 400;
            throw err;
          }

          const amount = formatPaystackAmount(amountKobo);
          const metadata = typeof data.metadata === 'object' && data.metadata !== null ? data.metadata : {};
          const contractId = metadata.contract_id;

          if (!contractId) {
            logger.warn('Missing contract_id in webhook metadata');
            const err = new Error('Missing contract_id in webhook metadata');
            err.status = 400;
            throw err;
          }

          const client = await pool.connect();
          try {
            await client.query('BEGIN');

            if (paystackRef) {
              const dup = await client.query('SELECT 1 FROM payment_history WHERE paystack_reference = $1', [paystackRef]);
              if (dup.rowCount > 0) {
                logger.info('Duplicate webhook received; payment already recorded', { paystackRef });
                await client.query('COMMIT');
                break;
              }
            }

            const contractRes = await client.query(
              `SELECT
                 fc.customer_id,
                 fc.total_contract_amount,
                 fc.amount_paid_to_date,
                 fc.next_payment_due_date,
                 l.hardware_uuid,
                 c.email,
                 c.full_name
               FROM financing_contracts fc
               JOIN laptops l ON l.id = fc.laptop_id
               JOIN customers c ON c.id = fc.customer_id
               WHERE fc.id = $1
               FOR UPDATE OF fc`,
              [contractId]
            );

            if (contractRes.rowCount === 0) {
              logger.warn('Contract not found for id', contractId);
              await client.query('ROLLBACK');
              break;
            }

            const customerId = contractRes.rows[0].customer_id;
            const prevPaid = Number(contractRes.rows[0].amount_paid_to_date || 0);
            const total = Number(contractRes.rows[0].total_contract_amount || 0);
            const hardwareUUID = contractRes.rows[0].hardware_uuid;
            const customerEmail = contractRes.rows[0].email;
            const customerName = contractRes.rows[0].full_name;

            await client.query(
              `INSERT INTO payment_history (contract_id, customer_id, payment_amount, payment_method, transaction_reference, paystack_reference, payment_status)
               VALUES ($1,$2,$3,$4,$5,$6,$7)`,
              [contractId, customerId, amount, 'paystack', paystackRef, paystackRef, 'Completed']
            );

            const newPaid = prevPaid + Number(amount || 0);
            await client.query('UPDATE financing_contracts SET amount_paid_to_date = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newPaid, contractId]);

            if (newPaid >= total) {
              const releaseToken = generateReleaseToken(hardwareUUID, serverConfig.tokenSecret);

              await client.query(
                `UPDATE financing_contracts
                 SET
                   contract_status = 'Fully_Paid',
                   current_time_token = NULL,
                   release_token = $1,
                   release_token_issued_at = CURRENT_TIMESTAMP,
                   time_token_expires_at = NULL,
                   updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2`,
                [releaseToken, contractId]
              );
              await client.query("UPDATE customers SET account_status = 'Fully_Paid', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [customerId]);
              await client.query("UPDATE laptops SET device_status = 'Released', updated_at = CURRENT_TIMESTAMP WHERE hardware_uuid = $1", [hardwareUUID]);

              await client.query(
                `INSERT INTO time_token_log (contract_id, customer_id, time_token, token_expires_at, issued_by)
                 VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '10 years', $4)
                 ON CONFLICT (time_token) DO NOTHING`,
                [contractId, customerId, releaseToken, 'paystack-webhook-release']
              );

              await sendReleaseTokenEmail({
                to: customerEmail,
                customerName,
                token: releaseToken
              });
            } else {
              const currentDueDate = contractRes.rows[0].next_payment_due_date || new Date();
              const nextDueDate = addOneMonth(currentDueDate);
              const tokenPeriod = tokenPeriodFromDate(nextDueDate);
              const unlockToken = generateTimeToken(hardwareUUID, tokenPeriod.year, tokenPeriod.month, serverConfig.tokenSecret);

              await client.query(
                `UPDATE financing_contracts
                 SET
                   next_payment_due_date = $1,
                   target_expiration_year = $2,
                   target_expiration_month = $3,
                   current_time_token = $4,
                   time_token_issued_at = CURRENT_TIMESTAMP,
                   time_token_expires_at = $1::date + INTERVAL '1 day',
                   updated_at = CURRENT_TIMESTAMP
                 WHERE id = $5`,
                [toDateOnly(nextDueDate), tokenPeriod.year, tokenPeriod.month, unlockToken, contractId]
              );

              await client.query(
                `INSERT INTO time_token_log (contract_id, customer_id, time_token, token_expires_at, issued_by)
                 VALUES ($1, $2, $3, $4::date + INTERVAL '1 day', $5)`,
                [contractId, customerId, unlockToken, toDateOnly(nextDueDate), 'paystack-webhook']
              );

              await sendUnlockTokenEmail({
                to: customerEmail,
                customerName,
                token: unlockToken,
                validUntil: toDateOnly(nextDueDate)
              });
            }

            await client.query('COMMIT');
            logger.info('Processed Paystack charge.success', { contractId, paystackRef, amount });
          } catch (err) {
            await client.query('ROLLBACK');
            throw err;
          } finally {
            client.release();
          }

          break;
        }
        case 'transfer.success':
          logger.info('Transfer success', { data: payload.data });
          break;
        default:
          logger.info('Unhandled Paystack event type', { event: payload.event });
      }

      res.status(200).json({ status: 'ok' });
    } catch (err) {
      logger.error('Error processing Paystack webhook', { message: err.message, stack: err.stack });
      throw err;
    }
}));

app.use(express.static(webDir));

app.get(['/', '/pay'], (req, res) => {
  res.sendFile(path.join(webDir, 'index.html'));
});

assertRequiredConfig();

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});

// Centralized error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  const status = err.status || 500;
  res.status(status).json({ error: status === 500 ? 'Internal server error' : err.message });
});
