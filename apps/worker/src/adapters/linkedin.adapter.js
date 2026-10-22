import { PlatformAdapter } from './base.adapter.js';
import { ERROR_CODES, PLATFORM_SPECS } from '@postpilot/shared';
import { tokenService } from '../services/token.service.js';

const LINKEDIN_API_BASE = 'https://api.linkedin.com/rest';

/**
 * LinkedIn Posts API Adapter (REST v202401).
 */
export class LinkedInAdapter extends PlatformAdapter {
  constructor() {
    super('LINKEDIN');
  }

  validate(post, socialAccount) {
    const errors = [];
    const spec = PLATFORM_SPECS.LINKEDIN;
    const caption = this.formatCaption(post);

    if (spec && caption.length > spec.maxCaptionLength) {
      errors.push(`Caption exceeds LinkedIn maximum length of ${spec.maxCaptionLength} characters`);
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
      : process.env.LINKEDIN_ACCESS_TOKEN || 'mock_linkedin_token';

    const rawAccountId = socialAccount?.platformAccountId || process.env.LINKEDIN_ORG_ID || '123456';
    const authorUrn = rawAccountId.startsWith('urn:li:')
      ? rawAccountId
      : `urn:li:organization:${rawAccountId}`;

    const caption = this.formatCaption(post);

    const postPayload = {
      author: authorUrn,
      commentary: caption,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    };

    // If link URL is present
    if (post.linkUrl) {
      postPayload.content = {
        article: {
          source: post.linkUrl,
          title: post.topic || 'Article',
          description: caption.slice(0, 200),
        },
      };
    }

    const res = await fetch(`${LINKEDIN_API_BASE}/posts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202401',
      },
      body: JSON.stringify(postPayload),
    });

    if (!res.ok) {
      const text = await res.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (_) {}

      const err = new Error(parsed?.message || `LinkedIn publish failed with status ${res.status}: ${text}`);
      err.code = res.status === 401 ? ERROR_CODES.AUTH_EXPIRED : ERROR_CODES.PLATFORM_ERROR;
      throw err;
    }

    // LinkedIn returns URN in x-restli-id header
    const postUrn = res.headers.get('x-restli-id') || `urn:li:share:${Date.now()}`;
    const platformPostUrl = `https://www.linkedin.com/feed/update/${postUrn}`;

    return {
      success: true,
      platformPostId: postUrn,
      platformPostUrl,
      metadata: { postUrn },
    };
  }

  async checkHealth(socialAccount) {
    try {
      const token = await tokenService.ensureActiveToken(socialAccount);
      const res = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return { healthy: true, status: 'CONNECTED', message: 'LinkedIn token valid' };
      }
      return { healthy: false, status: 'EXPIRED', message: 'LinkedIn token expired' };
    } catch (err) {
      return { healthy: false, status: 'ERROR', message: err.message };
    }
  }
}
