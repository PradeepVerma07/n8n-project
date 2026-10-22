import { PlatformAdapter } from './base.adapter.js';
import { ERROR_CODES, PLATFORM_SPECS } from '@postpilot/shared';
import { tokenService } from '../services/token.service.js';

const TWITTER_API_BASE = 'https://api.twitter.com/2';

/**
 * Twitter / X API v2 Adapter.
 */
export class TwitterAdapter extends PlatformAdapter {
  constructor() {
    super('TWITTER');
  }

  validate(post, socialAccount) {
    const errors = [];
    const spec = PLATFORM_SPECS.TWITTER;
    const caption = this.formatCaption(post);

    if (spec && caption.length > spec.maxCaptionLength) {
      errors.push(`Post text exceeds X character limit of ${spec.maxCaptionLength} characters (current: ${caption.length})`);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async publish(post, socialAccount) {
    const validation = this.validate(post, socialAccount);
    if (!validation.valid) {
      const err = new Error(validation.errors.join('; '));
      err.code = ERROR_CODES.MEDIA_INVALID;
      throw err;
    }

    const accessToken = socialAccount
      ? await tokenService.ensureActiveToken(socialAccount)
      : process.env.TWITTER_ACCESS_TOKEN || 'mock_twitter_token';

    const text = this.formatCaption(post);
    const body = { text };

    const res = await fetch(`${TWITTER_API_BASE}/tweets`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      const err = new Error(data.detail || data.title || `Twitter API failed with status ${res.status}`);
      err.code = res.status === 401 ? ERROR_CODES.AUTH_EXPIRED : res.status === 429 ? ERROR_CODES.RATE_LIMITED : ERROR_CODES.PLATFORM_ERROR;
      throw err;
    }

    const platformPostId = data.data.id;
    const platformPostUrl = `https://x.com/i/status/${platformPostId}`;

    return {
      success: true,
      platformPostId,
      platformPostUrl,
      metadata: data.data,
    };
  }

  async checkHealth(socialAccount) {
    try {
      const token = await tokenService.ensureActiveToken(socialAccount);
      const res = await fetch(`${TWITTER_API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return { healthy: true, status: 'CONNECTED', message: 'X token valid' };
      }
      return { healthy: false, status: 'EXPIRED', message: 'X token expired' };
    } catch (err) {
      return { healthy: false, status: 'ERROR', message: err.message };
    }
  }
}
