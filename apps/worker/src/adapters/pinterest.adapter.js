import { PlatformAdapter } from './base.adapter.js';
import { ERROR_CODES, PLATFORM_SPECS } from '@postpilot/shared';
import { tokenService } from '../services/token.service.js';

const PINTEREST_API_BASE = 'https://api.pinterest.com/v5';

/**
 * Pinterest API v5 Pins Adapter.
 */
export class PinterestAdapter extends PlatformAdapter {
  constructor() {
    super('PINTEREST');
  }

  validate(post, socialAccount) {
    const errors = [];
    const mediaUrls = post.mediaUrls || [];

    if (mediaUrls.length === 0) {
      errors.push('Pinterest requires at least 1 image or video URL for Pin creation');
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
      : process.env.PINTEREST_ACCESS_TOKEN || 'mock_pinterest_token';

    const boardId = socialAccount?.metadata?.boardId || process.env.PINTEREST_BOARD_ID || '1234567890';
    const mediaUrl = post.mediaUrls[0];
    const description = this.formatCaption(post);

    const body = {
      board_id: boardId,
      title: post.topic || description.slice(0, 90),
      description,
      media_source: {
        source_type: 'image_url',
        url: mediaUrl,
      },
    };

    if (post.linkUrl) {
      body.link = post.linkUrl;
    }

    const res = await fetch(`${PINTEREST_API_BASE}/pins`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      const err = new Error(data.message || `Pinterest publish failed with status ${res.status}`);
      err.code = res.status === 401 ? ERROR_CODES.AUTH_EXPIRED : ERROR_CODES.PLATFORM_ERROR;
      throw err;
    }

    const pinId = data.id || `pin_${Date.now()}`;
    const platformPostUrl = `https://www.pinterest.com/pin/${pinId}/`;

    return {
      success: true,
      platformPostId: pinId,
      platformPostUrl,
      metadata: data,
    };
  }

  async checkHealth(socialAccount) {
    try {
      const token = await tokenService.ensureActiveToken(socialAccount);
      const res = await fetch(`${PINTEREST_API_BASE}/user_account`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return { healthy: true, status: 'CONNECTED', message: 'Pinterest token valid' };
      }
      return { healthy: false, status: 'EXPIRED', message: 'Pinterest token expired' };
    } catch (err) {
      return { healthy: false, status: 'ERROR', message: err.message };
    }
  }
}
