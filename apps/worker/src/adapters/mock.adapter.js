import { PlatformAdapter } from './base.adapter.js';
import { ERROR_CODES, PLATFORM_SPECS } from '@postpilot/shared';

/**
 * High-fidelity Mock Platform Adapter.
 * Simulates real platform publishing, API latency, permalink creation, and controlled error injection.
 */
export class MockAdapter extends PlatformAdapter {
  /**
   * @param {string} platform - Normalized Platform enum (e.g. FACEBOOK, INSTAGRAM)
   * @param {object} [options]
   * @param {number} [options.simulatedDelayMs=200] - Latency to simulate
   */
  constructor(platform, options = {}) {
    super(platform);
    this.simulatedDelayMs = options.simulatedDelayMs ?? 200;
  }

  /**
   * Pre-flight validation against platform constraints.
   */
  validate(post, socialAccount) {
    const errors = [];
    const spec = PLATFORM_SPECS[this.platform];

    if (spec) {
      const fullText = this.formatCaption(post);
      if (fullText.length > spec.maxCaptionLength) {
        errors.push(
          `Caption exceeds ${this.platform} maximum length of ${spec.maxCaptionLength} characters (current: ${fullText.length})`
        );
      }

      // Instagram media requirement
      if (this.platform === 'INSTAGRAM') {
        const media = post.mediaUrls || [];
        if (media.length === 0) {
          errors.push('Instagram Business requires at least 1 image or video asset');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Simulates publishing to platform with network latency and controlled failure injection.
   */
  async publish(post, socialAccount) {
    // 1. Pre-flight validate
    const validation = this.validate(post, socialAccount);
    if (!validation.valid) {
      const err = new Error(validation.errors.join('; '));
      err.code = ERROR_CODES.MEDIA_INVALID;
      throw err;
    }

    // 2. Simulate realistic network round-trip latency
    if (this.simulatedDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.simulatedDelayMs));
    }

    // 3. Check for deliberate error injection tags in post caption
    const caption = post.caption || '';
    if (caption.includes('[FAIL_AUTH]')) {
      const err = new Error(`Simulated OAuth authentication failure on ${this.platform}: token revoked`);
      err.code = ERROR_CODES.AUTH_EXPIRED;
      throw err;
    }

    if (caption.includes('[FAIL_RATE_LIMIT]')) {
      const err = new Error(`Simulated 429 Too Many Requests on ${this.platform} API: rate limit quota exhausted`);
      err.code = ERROR_CODES.RATE_LIMITED;
      throw err;
    }

    if (caption.includes('[FAIL_MEDIA]')) {
      const err = new Error(`Simulated media processing rejection on ${this.platform}: unsupported video codec or aspect ratio`);
      err.code = ERROR_CODES.MEDIA_INVALID;
      throw err;
    }

    if (caption.includes('[FAIL_TIMEOUT]')) {
      const err = new Error(`Simulated media container processing timeout on ${this.platform}`);
      err.code = ERROR_CODES.MEDIA_PROCESSING_TIMEOUT;
      throw err;
    }

    if (caption.includes('[FAIL_SERVER]')) {
      const err = new Error(`Simulated 500 internal server error from ${this.platform} upstream`);
      err.code = ERROR_CODES.PLATFORM_ERROR;
      throw err;
    }

    // 4. Generate realistic platform-specific post ID and permalink URL
    const timestamp = Date.now();
    const cleanPlatform = this.platform.toLowerCase();
    let platformPostId;
    let platformPostUrl;

    switch (this.platform) {
      case 'FACEBOOK':
        platformPostId = `fb_${timestamp}`;
        platformPostUrl = `https://www.facebook.com/posts/${timestamp}`;
        break;
      case 'INSTAGRAM':
        platformPostId = `ig_${timestamp}`;
        platformPostUrl = `https://www.instagram.com/p/${timestamp.toString(36)}/`;
        break;
      case 'LINKEDIN':
        platformPostId = `urn:li:share:${timestamp}`;
        platformPostUrl = `https://www.linkedin.com/feed/update/urn:li:share:${timestamp}`;
        break;
      case 'TWITTER':
        platformPostId = `tweet_${timestamp}`;
        platformPostUrl = `https://x.com/postpilot/status/${timestamp}`;
        break;
      case 'YOUTUBE':
        platformPostId = `yt_${timestamp.toString(36)}`;
        platformPostUrl = `https://www.youtube.com/watch?v=${timestamp.toString(36)}`;
        break;
      case 'TIKTOK':
        platformPostId = `tt_${timestamp}`;
        platformPostUrl = `https://www.tiktok.com/@postpilot/video/${timestamp}`;
        break;
      case 'PINTEREST':
        platformPostId = `pin_${timestamp}`;
        platformPostUrl = `https://www.pinterest.com/pin/${timestamp}/`;
        break;
      case 'GOOGLE_BUSINESS':
      default:
        platformPostId = `gbp_${cleanPlatform}_${timestamp}`;
        platformPostUrl = `https://maps.google.com/local/post/${timestamp}`;
        break;
    }

    return {
      success: true,
      platformPostId,
      platformPostUrl,
      metadata: {
        simulated: true,
        platform: this.platform,
        publishedAt: new Date().toISOString(),
        captionLength: caption.length,
      },
    };
  }

  /**
   * Simulates platform token health check.
   */
  async checkHealth(socialAccount) {
    if (this.simulatedDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(this.simulatedDelayMs, 100)));
    }

    if (socialAccount?.status === 'EXPIRED' || socialAccount?.status === 'REVOKED') {
      return {
        healthy: false,
        status: socialAccount.status,
        message: 'Account token is expired or revoked',
      };
    }

    return {
      healthy: true,
      status: 'CONNECTED',
      message: `${this.platform} API connection healthy (Mock Mode)`,
    };
  }
}
