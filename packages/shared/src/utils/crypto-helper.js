import crypto from 'node:crypto';

/**
 * Encrypts plaintext string using AES-256-GCM.
 *
 * @param {string} plaintext - Plain text to encrypt
 * @param {string} hexKey - 32-byte master encryption key encoded in 64 hex characters
 * @returns {{ ciphertext: string, iv: string, tag: string }}
 */
export function encryptAesGcm(plaintext, hexKey) {
  if (!plaintext) {
    throw new Error('Plaintext is required for encryption');
  }
  const keyBuffer = Buffer.from(hexKey, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error('Master encryption key must be exactly 32 bytes (64 hex characters)');
  }

  const iv = crypto.randomBytes(12); // Standard 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return {
    ciphertext,
    iv: iv.toString('hex'),
    tag,
  };
}

/**
 * Decrypts AES-256-GCM ciphertext.
 *
 * @param {string} ciphertext - Hex encoded ciphertext
 * @param {string} hexKey - 32-byte key in hex
 * @param {string} ivHex - Hex encoded IV
 * @param {string} tagHex - Hex encoded authentication tag
 * @returns {string} Decrypted plaintext
 */
export function decryptAesGcm(ciphertext, hexKey, ivHex, tagHex) {
  const keyBuffer = Buffer.from(hexKey, 'hex');
  const ivBuffer = Buffer.from(ivHex, 'hex');
  const tagBuffer = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, ivBuffer);
  decipher.setAuthTag(tagBuffer);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Creates an HMAC-SHA256 signature for webhook payloads.
 * Includes timestamp to enable replay protection.
 *
 * @param {object|string} payload - Payload to sign
 * @param {string} secret - Secret key
 * @param {number} timestamp - Unix timestamp in seconds
 * @returns {string} Hex HMAC signature
 */
export function createWebhookSignature(payload, secret, timestamp) {
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const dataToSign = `${timestamp}.${payloadString}`;
  return crypto.createHmac('sha256', secret).update(dataToSign).digest('hex');
}

/**
 * Verifies an incoming webhook HMAC-SHA256 signature and checks replay window.
 *
 * @param {object|string} payload - Raw or parsed payload
 * @param {string} signatureHeader - Hex signature received from client/n8n
 * @param {number} timestamp - Timestamp received from header
 * @param {string} secret - Secret key
 * @param {number} [maxAgeSeconds=300] - Maximum allowable age (default 5 min)
 * @returns {{ valid: boolean, reason?: string }}
 */
export function verifyWebhookSignature(payload, signatureHeader, timestamp, secret, maxAgeSeconds = 300) {
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > maxAgeSeconds) {
    return { valid: false, reason: 'Webhook timestamp outside allowable window (replay attack prevention)' };
  }

  const expectedSignature = createWebhookSignature(payload, secret, timestamp);
  const isMatch = crypto.timingSafeEqual(
    Buffer.from(signatureHeader, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );

  if (!isMatch) {
    return { valid: false, reason: 'Invalid signature mismatch' };
  }

  return { valid: true };
}
