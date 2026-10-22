import { PlatformAdapter } from './base.adapter.js';
import { ERROR_CODES } from '@postpilot/shared';
import { tokenService } from '../services/token.service.js';

const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';

/**
 * TikTok Content Posting API Adapter.
 */
export class TikTokAdapter extends PlatformAdapter {
  constructor() {
    super('TIKTOK');
  }

  validate(post, socialAccount) {
    const errors = [];
    const mediaUrls = post.mediaUrls || [];

    if (mediaUrls.length === 0) {
      errors.push('TikTok requires a valid video media URL');
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
      : process.env.TIKTOK_ACCESS_TOKEN || 'mock_tiktok_token';

    const mediaUrl = post.mediaUrls[0];
    const caption = this.formatCaption(post);

    const res = await fetch(`${TIKTOK_API_BASE}/post/publish/video/init/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        post_info: {
          title: caption.slice(0, 150),
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_duet: false,
          disable_comment: false,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: mediaUrl,
        },
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error?.code !== 'ok') {
      const err = new Error(data.error?.message || `TikTok publish failed with status ${res.status}`);
      err.code = res.status === 401 ? ERROR_CODES.AUTH_EXPIRED : ERROR_CODES.PLATFORM_ERROR;
      throw err;
    }

    const publishId = data.data?.publish_id || `tt_${Date.now()}`;
    const platformPostUrl = `https://www.tiktok.com/@postpilot/video/${publishId}`;

    return {
      success: true,
      platformPostId: publishId,
      platformPostUrl,
      metadata: data.data,
    };
  }

  async checkHealth(socialAccount) {
    try {
      const token = await tokenService.ensureActiveToken(socialAccount);
      const res = await fetch(`${TIKTOK_API_BASE}/user/info/?fields=avatar_url,display_name`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return { healthy: true, status: 'CONNECTED', message: 'TikTok token valid' };
      }
      return { healthy: false, status: 'EXPIRED', message: 'TikTok token expired' };
    } catch (err) {
      return { healthy: false, status: 'ERROR', message: err.message };
    }
  }
}
