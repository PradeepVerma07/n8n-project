import { describe, it, expect } from 'vitest';
import { validateMediaForPlatforms, calculateAspectRatio } from '../src/utils/media-validator.js';

describe('Media Platform Validator (@postpilot/shared)', () => {
  it('calculates aspect ratios correctly', () => {
    expect(calculateAspectRatio(1080, 1080).label).toBe('1:1');
    expect(calculateAspectRatio(1080, 1920).label).toBe('9:16');
    expect(calculateAspectRatio(1920, 1080).label).toBe('16:9');
    expect(calculateAspectRatio(1080, 1350).label).toBe('4:5');
  });

  it('validates compatible image within limits', () => {
    const asset = {
      mimeType: 'image/jpeg',
      fileSize: 2 * 1024 * 1024, // 2MB
      width: 1080,
      height: 1080,
    };

    const result = validateMediaForPlatforms(asset, ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN']);
    expect(result.isCompatible).toBe(true);
    expect(result.warnings.length).toBe(0);
  });

  it('rejects image exceeding Twitter 5MB limit', () => {
    const oversizedImage = {
      mimeType: 'image/jpeg',
      fileSize: 6 * 1024 * 1024, // 6MB
      width: 2000,
      height: 2000,
    };

    const result = validateMediaForPlatforms(oversizedImage, ['TWITTER']);
    expect(result.isCompatible).toBe(false);
    expect(result.warnings[0].type).toBe('ERROR');
    expect(result.warnings[0].message).toMatch(/exceeds X \(Twitter\) limit of 5MB/);
  });

  it('warns on horizontal video uploaded for Instagram Reels', () => {
    const horizontalVideo = {
      mimeType: 'video/mp4',
      fileSize: 15 * 1024 * 1024,
      width: 1920,
      height: 1080,
      durationSeconds: 30,
    };

    const result = validateMediaForPlatforms(horizontalVideo, ['INSTAGRAM']);
    const aspectWarning = result.warnings.find((w) => w.type === 'WARNING');
    expect(aspectWarning).toBeDefined();
    expect(aspectWarning.message).toMatch(/Instagram Reels perform best with 9:16 vertical video/);
  });

  it('rejects video exceeding duration limit', () => {
    const longVideo = {
      mimeType: 'video/mp4',
      fileSize: 50 * 1024 * 1024,
      width: 1080,
      height: 1920,
      durationSeconds: 200, // Twitter max is 140s
    };

    const result = validateMediaForPlatforms(longVideo, ['TWITTER']);
    expect(result.isCompatible).toBe(false);
    expect(result.warnings.some((w) => w.message.includes('maximum of 140s'))).toBe(true);
  });
});
