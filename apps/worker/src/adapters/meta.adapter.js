import { PlatformAdapter } from './base.adapter.js';
import { ERROR_CODES, PLATFORM_SPECS } from '@postpilot/shared';
import { tokenService } from '../services/token.service.js';

const META_GRAPH_VERSION = 'v21.0';
const BASE_GRAPH_URL = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

/**
 * Meta Graph API Adapter for Facebook Pages & Instagram Business.
 */
export class MetaAdapter extends PlatformAdapter {
  /**
   * @param {'FACEBOOK' | 'INSTAGRAM'} platform
   */
  constructor(platform) {
    super(platform);
  }

  /**
   * Pre-flight validation against Meta API restrictions.
   */
  validate(post, socialAccount) {
    const errors = [];
    const spec = PLATFORM_SPECS[this.platform];
    const caption = this.formatCaption(post);

    if (spec && caption.length > spec.maxCaptionLength) {
      errors.push(`Caption exceeds ${this.platform} maximum length of ${spec.maxCaptionLength} characters`);
    }

    if (this.platform === 'INSTAGRAM') {
      const mediaUrls = post.mediaUrls || [];
      if (mediaUrls.length === 0) {
        errors.push('Instagram Business requires at least 1 image or video media URL');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Publishes post to Facebook Page or Instagram Business Account.
   */
  async publish(post, socialAccount) {
    const validation = this.validate(post, socialAccount);
    if (!validation.valid) {
      const err = new Error(validation.errors.join('; '));
      err.code = ERROR_CODES.MEDIA_INVALID;
      throw err;
    }

    const accessToken = socialAccount
      ? await tokenService.ensureActiveToken(socialAccount)
      : process.env.META_ACCESS_TOKEN || 'mock_meta_token';

    const accountId = socialAccount?.platformAccountId || process.env.META_PAGE_ID || 'me';

    if (this.platform === 'FACEBOOK') {
      return this.publishToFacebook(post, accountId, accessToken);
    } else {
      return this.publishToInstagram(post, accountId, accessToken);
    }
  }

  /**
   * Publishes to Facebook Page Feed, Photos, or Videos endpoint.
   */
  async publishToFacebook(post, pageId, accessToken) {
    const caption = this.formatCaption(post);
    const mediaUrls = post.mediaUrls || [];
    const hasMedia = mediaUrls.length > 0;
    const postType = (post.postType || 'TEXT').toUpperCase();

    let endpoint;
    let bodyPayload;

    if (postType === 'VIDEO' && hasMedia) {
      endpoint = `${BASE_GRAPH_URL}/${pageId}/videos`;
      bodyPayload = {
        file_url: mediaUrls[0],
        description: caption,
        access_token: accessToken,
      };
    } else if (hasMedia) {
      endpoint = `${BASE_GRAPH_URL}/${pageId}/photos`;
      bodyPayload = {
        url: mediaUrls[0],
        caption,
        access_token: accessToken,
      };
    } else {
      endpoint = `${BASE_GRAPH_URL}/${pageId}/feed`;
      bodyPayload = {
        message: caption,
        access_token: accessToken,
      };
      if (post.linkUrl) {
        bodyPayload.link = post.linkUrl;
      }
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
    });

    const data = await res.json();

    if (!res.ok) {
      const err = new Error(data.error?.message || `Facebook API publish failed with status ${res.status}`);
      err.code = data.error?.code === 190 ? ERROR_CODES.AUTH_EXPIRED : ERROR_CODES.PLATFORM_ERROR;
      err.details = data.error;
      throw err;
    }

    const platformPostId = data.id || data.post_id;
    const platformPostUrl = `https://www.facebook.com/${platformPostId}`;

    return {
      success: true,
      platformPostId,
      platformPostUrl,
      metadata: data,
    };
  }

  /**
   * Publishes to Instagram Business via 3-step Container Creation, Status Polling, and Publish.
   */
  async publishToInstagram(post, igUserId, accessToken) {
    const caption = this.formatCaption(post);
    const mediaUrls = post.mediaUrls || [];
    const mediaUrl = mediaUrls[0];
    const isVideo = ['VIDEO', 'REEL'].includes((post.postType || '').toUpperCase());

    // Step 1: Create Media Container
    const containerUrl = `${BASE_GRAPH_URL}/${igUserId}/media`;
    const containerPayload = {
      caption,
      access_token: accessToken,
    };

    if (isVideo) {
      containerPayload.media_type = 'REELS';
      containerPayload.video_url = mediaUrl;
    } else {
      containerPayload.image_url = mediaUrl;
    }

    const createRes = await fetch(containerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(containerPayload),
    });

    const createData = await createRes.json();
    if (!createRes.ok) {
      const err = new Error(createData.error?.message || 'Instagram Container creation failed');
      err.code = createData.error?.code === 190 ? ERROR_CODES.AUTH_EXPIRED : ERROR_CODES.MEDIA_INVALID;
      throw err;
    }

    const containerId = createData.id;

    // Step 2: Poll Container Status until FINISHED
    await this.pollContainerStatus(containerId, accessToken);

    // Step 3: Publish Container
    const publishUrl = `${BASE_GRAPH_URL}/${igUserId}/media_publish`;
    const publishRes = await fetch(publishUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: accessToken,
      }),
    });

    const publishData = await publishRes.json();
    if (!publishRes.ok) {
      const err = new Error(publishData.error?.message || 'Instagram Media Publish failed');
      err.code = ERROR_CODES.PLATFORM_ERROR;
      throw err;
    }

    const platformPostId = publishData.id;

    // Step 4: Publish First Comment if present
    if (post.firstComment) {
      try {
        const commentUrl = `${BASE_GRAPH_URL}/${platformPostId}/comments`;
        await fetch(commentUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: post.firstComment,
            access_token: accessToken,
          }),
        });
      } catch (commentErr) {
        console.warn(`[Instagram] Failed to append first comment: ${commentErr.message}`);
      }
    }

    // Step 5: Fetch Permalink
    let platformPostUrl = `https://www.instagram.com/p/${platformPostId}/`;
    try {
      const permalinkRes = await fetch(`${BASE_GRAPH_URL}/${platformPostId}?fields=permalink&access_token=${accessToken}`);
      if (permalinkRes.ok) {
        const permalinkData = await permalinkRes.json();
        if (permalinkData.permalink) {
          platformPostUrl = permalinkData.permalink;
        }
      }
    } catch (_) {}

    return {
      success: true,
      platformPostId,
      platformPostUrl,
      metadata: publishData,
    };
  }

  /**
   * Polls Instagram media container status with exponential delay.
   */
  async pollContainerStatus(containerId, accessToken, maxAttempts = 15) {
    let attempt = 0;
    while (attempt < maxAttempts) {
      attempt++;
      const res = await fetch(`${BASE_GRAPH_URL}/${containerId}?fields=status_code,status&access_token=${accessToken}`);
      if (res.ok) {
        const data = await res.json();
        const status = data.status_code;

        if (status === 'FINISHED') {
          return true;
        }

        if (status === 'ERROR' || status === 'EXPIRED') {
          const err = new Error(`Instagram container processing failed with status: ${status}`);
          err.code = ERROR_CODES.MEDIA_INVALID;
          throw err;
        }
      }

      // Wait 1.5 seconds between polling attempts
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    const err = new Error(`Instagram media processing timed out for container ${containerId}`);
    err.code = ERROR_CODES.MEDIA_PROCESSING_TIMEOUT;
    throw err;
  }

  /**
   * Health check for Meta account.
   */
  async checkHealth(socialAccount) {
    try {
      const token = await tokenService.ensureActiveToken(socialAccount);
      const res = await fetch(`${BASE_GRAPH_URL}/me?access_token=${token}`);
      if (res.ok) {
        return { healthy: true, status: 'CONNECTED', message: 'Meta token valid' };
      }
      return { healthy: false, status: 'EXPIRED', message: 'Meta token expired or invalid' };
    } catch (err) {
      return { healthy: false, status: 'ERROR', message: err.message };
    }
  }
}
