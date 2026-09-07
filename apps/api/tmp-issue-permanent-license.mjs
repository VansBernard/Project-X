import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const prisma = new PrismaClient();
const deviceId = 'eb4c3e55-5d0e-4276-8225-8ed7935d1286';

function canonicalJson(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }
  const record = value;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(',')}}`;
}

function privateKeyPem() {
  const raw = (process.env.LICENSE_PRIVATE_KEY_PEM_BASE64 || '').trim();
  if (raw.includes('-----BEGIN')) {
    return raw.replace(/\r/g, '');
  }
  const decoded = Buffer.from(raw, 'base64').toString('utf8');
  if (decoded.includes('-----BEGIN')) {
    return decoded.replace(/\r/g, '');
  }
  return raw;
}

function privateKey() {
  const key = crypto.createPrivateKey(privateKeyPem());
  const modulusLength = key.asymmetricKeyDetails?.modulusLength;
  if (modulusLength !== 4096) {
    throw new Error('INVALID_LICENSE_PRIVATE_KEY: must be RSA 4096');
  }
  return key;
}

function signPayload(payload) {
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(canonicalJson(payload));
  signer.end();
  return signer.sign(privateKey(), 'base64');
}

async function main() {
  await prisma.$connect();
  const device = await prisma.device.findFirst({ where: { id: deviceId, deletedAt: null } });
  if (!device) {
    console.error('Device not found:', deviceId);
    process.exit(1);
  }

  const contract = await prisma.contract.findFirst({ where: { deviceId: deviceId, deletedAt: null } });
  if (!contract) {
    console.error('Contract for device not found. Cannot issue license.');
    process.exit(1);
  }

  const dealerId = contract.dealerId;
  const customerId = contract.customerId;

  const issuedAt = new Date();
  const licenseKey = crypto.randomUUID();
  const licenseType = 'permanent';

  const license = await prisma.license.create({
    data: {
      dealerId,
      customerId,
      deviceId,
      contractId: contract.id,
      licenseKey,
      keyId: process.env.LICENSE_KEY_ID || 'default',
      signedPayload: {},
      signature: '',
      signatureAlgorithm: 'RSA-SHA256',
      status: 'active',
      issuedAt,
      expiresAt: null,
      licenseType,
      metadata: {}
    }
  });

  const payload = {
    licenseId: license.id,
    deviceId: deviceId,
    contractId: contract.id,
    issuedAt: issuedAt.toISOString(),
    expiresAt: null,
    licenseType,
    keyId: process.env.LICENSE_KEY_ID || 'default',
    algorithm: 'RSA-SHA256'
  };

  const signature = signPayload(payload);

  const updated = await prisma.license.update({ where: { id: license.id }, data: { signedPayload: payload, signature } });

  console.log('Issued license:', {
    id: updated.id,
    licenseKey: updated.licenseKey,
    licenseType: updated.licenseType,
    issuedAt: updated.issuedAt,
    expiresAt: updated.expiresAt
  });

  // Verify signature using public key
  const publicRaw = (process.env.LICENSE_PUBLIC_KEY_PEM_BASE64 || '').trim();
  let publicKey;
  if (process.env.LICENSE_PUBLIC_KEY_PEM && process.env.LICENSE_PUBLIC_KEY_PEM.includes('-----BEGIN')) {
    publicKey = crypto.createPublicKey(process.env.LICENSE_PUBLIC_KEY_PEM.replace(/\r/g, '\n'));
  } else if (publicRaw) {
    const decoded = Buffer.from(publicRaw, 'base64').toString('utf8');
    if (decoded.includes('-----BEGIN')) {
      publicKey = crypto.createPublicKey(decoded.replace(/\r/g, '\n'));
    } else {
      publicKey = crypto.createPublicKey({ key: Buffer.from(publicRaw, 'base64'), format: 'der', type: 'spki' });
    }
  } else {
    console.error('No public key available to verify signature');
    process.exit(1);
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(canonicalJson(payload));
  verifier.end();
  const signatureValid = verifier.verify(publicKey, signature, 'base64');

  console.log('signatureValid:', signatureValid);

  // Show active license lookup
  const active = await prisma.license.findMany({
    where: {
      dealerId,
      deviceId,
      status: 'active'
    },
    orderBy: { expiresAt: 'desc' }
  });

  console.log('active licenses for device:', active.map(a => ({ id: a.id, licenseKey: a.licenseKey, licenseType: a.licenseType })));

  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
