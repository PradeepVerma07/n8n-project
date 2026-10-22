import { PlatformAdapter } from './base.adapter.js';
import { ERROR_CODES } from '@postpilot/shared';
import { tokenService } from '../services/token.service.js';

const GBP_API_BASE = 'https://mybusiness.googleapis.com/v4';

/**
 * Google Business Profile (GBP) Local Posts Adapter.
 */
export class GoogleBusinessAdapter extends PlatformAdapter {
  constructor() {
    super('GOOGLE_BUSINESS');
  }

  validate(post, socialAccount) {
    const errors = [];
    const caption = this.formatCaption(post);

    if (caption.length > 1500) {
      errors.push('Google Business Profile posts must not exceed 1,500 characters');
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
      : process.env.GOOGLE_BUSINESS_ACCESS_TOKEN || 'mock_gbp_token';

    const accountLocationId =
      socialAccount?.platformAccountId || process.env.GOOGLE_BUSINESS_LOCATION_ID || 'accounts/123/locations/456';

    const summary = this.formatCaption(post);
    const body = {
      languageCode: 'en-US',
      summary,
      topicType: 'STANDARD',
    };

    if (post.mediaUrls && post.mediaUrls.length > 0) {
      body.media = [
        {
          mediaFormat: 'PHOTO',
          sourceUrl: post.mediaUrls[0],
        },
      ];
    }

    if (post.linkUrl) {
      body.callToAction = {
        actionType: 'LEARN_MORE',
        url: post.linkUrl,
      };
    }

    const res = await fetch(`${GBP_API_BASE}/${accountLocationId}/localPosts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      const err = new Error(data.error?.message || `Google Business Profile publish failed with status ${res.status}`);
      err.code = res.status === 401 ? ERROR_CODES.AUTH_EXPIRED : ERROR_CODES.PLATFORM_ERROR;
      throw err;
    }

    const platformPostId = data.name || `gbp_${Date.now()}`;
    const platformPostUrl = data.searchUrl || `https://maps.google.com/local/post/${platformPostId}`;

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
      const res = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return { healthy: true, status: 'CONNECTED', message: 'Google Business token valid' };
      }
      return { healthy: false, status: 'EXPIRED', message: 'Google Business token expired' };
    } catch (err) {
      return { healthy: false, status: 'ERROR', message: err.message };
    }
  }
}
