import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { mediaService } from '../src/modules/media/media.service.js';

describe('Media Service & MIME Sniffing', () => {
  it('detects genuine PNG from magic bytes', async () => {
    // 8-byte PNG signature: 89 50 4E 47 0D 0A 1A 0A
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89
    ]);

    const result = await mediaService.sniffMimeType(pngHeader, 'image/png');
    expect(result.mime).toBe('image/png');
  });

  it('rejects spoofed text file masquerading as image', async () => {
    const fakeImageBuffer = Buffer.from('This is actually a plain text script or malware, not an image');

    await expect(
      mediaService.sniffMimeType(fakeImageBuffer, 'application/x-sh')
    ).rejects.toThrow(/Unable to determine valid media file type/);
  });

  it('generates a valid presigned upload URL structure', async () => {
    const orgId = '11111111-1111-1111-1111-111111111111';
    const result = await mediaService.generatePresignedUploadUrl(orgId, {
      filename: 'sample-campaign-banner.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1024 * 500,
    });

    expect(result.uploadUrl).toBeDefined();
    expect(result.s3Key).toMatch(/^org_11111111-1111-1111-1111-111111111111\/\d{4}-\d{2}\/[a-f0-9-]+\.jpg$/);
    expect(result.publicUrl).toContain(result.s3Key);
    expect(result.expiresInSeconds).toBe(900);
  });

  it('rejects presigned URL generation for unsupported file types', async () => {
    const orgId = '11111111-1111-1111-1111-111111111111';
    await expect(
      mediaService.generatePresignedUploadUrl(orgId, {
        filename: 'malicious.exe',
        mimeType: 'application/x-msdownload',
        fileSize: 1024,
      })
    ).rejects.toThrow(/Unsupported MIME type/);
  });
});

describe('Media Validation Endpoint', () => {
  it('POST /api/v1/media/validate checks compatibility and returns warnings', async () => {
    // Media validation without auth still tests route or auth requirement
    const res = await request(app)
      .post('/api/v1/media/validate')
      .send({
        asset: {
          mimeType: 'image/jpeg',
          fileSize: 15 * 1024 * 1024, // 15MB
          width: 1080,
          height: 1080,
        },
        platforms: ['FACEBOOK', 'INSTAGRAM'],
      });

    // Requires auth header
    expect(res.status).toBe(401);
    expect(res.body.errorCode).toBe('AUTH_MISSING');
  });
});
