import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import {
  encryptAesGcm,
  decryptAesGcm,
  createWebhookSignature,
  verifyWebhookSignature,
} from '../src/utils/crypto-helper.js';

describe('Crypto Helper (@postpilot/shared)', () => {
  const testKey = crypto.randomBytes(32).toString('hex'); // 64 hex chars = 32 bytes

  it('correctly encrypts and decrypts OAuth tokens using AES-256-GCM', () => {
    const rawSecretToken = 'EAAGNO4...super_secret_meta_access_token_xyz123';
    const encrypted = encryptAesGcm(rawSecretToken, testKey);

    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.tag).toBeDefined();
    expect(encrypted.ciphertext).not.toBe(rawSecretToken);

    const decrypted = decryptAesGcm(
      encrypted.ciphertext,
      testKey,
      encrypted.iv,
      encrypted.tag
    );
    expect(decrypted).toBe(rawSecretToken);
  });

  it('fails decryption if authentication tag is tampered with', () => {
    const rawToken = 'secret-token';
    const encrypted = encryptAesGcm(rawToken, testKey);

    const tamperedTag = '0'.repeat(32);
    expect(() =>
      decryptAesGcm(encrypted.ciphertext, testKey, encrypted.iv, tamperedTag)
    ).toThrow();
  });

  it('generates and verifies HMAC signatures for n8n webhooks', () => {
    const secret = 'shared_n8n_hmac_secret_string';
    const payload = { postId: 'PP-123', status: 'Published' };
    const timestamp = Math.floor(Date.now() / 1000);

    const signature = createWebhookSignature(payload, secret, timestamp);
    const verification = verifyWebhookSignature(payload, signature, timestamp, secret, 300);

    expect(verification.valid).toBe(true);
  });

  it('rejects expired webhook signatures to prevent replay attacks', () => {
    const secret = 'shared_n8n_hmac_secret_string';
    const payload = { test: true };
    const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago (> 300s window)

    const signature = createWebhookSignature(payload, secret, oldTimestamp);
    const verification = verifyWebhookSignature(payload, signature, oldTimestamp, secret, 300);

    expect(verification.valid).toBe(false);
    expect(verification.reason).toMatch(/replay attack prevention/);
  });
});
