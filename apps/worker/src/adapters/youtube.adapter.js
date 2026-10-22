import { PlatformAdapter } from './base.adapter.js';
import { ERROR_CODES } from '@postpilot/shared';
import { tokenService } from '../services/token.service.js';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * YouTube Data API v3 Adapter for Videos & Shorts.
 */
export class YouTubeAdapter extends PlatformAdapter {
  constructor() {
    super('YOUTUBE');
  }

  validate(post, socialAccount) {
    const errors = [];
    const mediaUrls = post.mediaUrls || [];

    if (mediaUrls.length === 0) {
      errors.push('YouTube requires at least 1 video URL');
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
      : process.env.YOUTUBE_ACCESS_TOKEN || 'mock_youtube_token';

    const title = post.topic || post.caption.slice(0, 70) || 'PostPilot Video';
    const description = this.formatCaption(post);

    const body = {
      snippet: {
        title,
        description,
        categoryId: '22', // People & Blogs
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false,
      },
    };

    // Call YouTube videos insert endpoint
    const res = await fetch(`${YOUTUBE_API_BASE}/videos?part=snippet,status`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      const err = new Error(data.error?.message || `YouTube API publish failed with status ${res.status}`);
      err.code = data.error?.code === 401 ? ERROR_CODES.AUTH_EXPIRED : ERROR_CODES.PLATFORM_ERROR;
      throw err;
    }

    const platformPostId = data.id || `yt_${Date.now()}`;
    const platformPostUrl = `https://www.youtube.com/watch?v=${platformPostId}`;

    return {
      success: true,
      platformPostId,
      platformPostUrl,
      metadata: data,
    };
  }

  async checkHealth(socialAccount) {
    try {
      const token = await tokenService.ensureActiveToken(socialAccount);
      const res = await fetch(`${YOUTUBE_API_BASE}/channels?part=snippet&mine=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return { healthy: true, status: 'CONNECTED', message: 'YouTube OAuth token valid' };
      }
      return { healthy: false, status: 'EXPIRED', message: 'YouTube OAuth token expired' };
    } catch (err) {
      return { healthy: false, status: 'ERROR', message: err.message };
    }
  }
}
