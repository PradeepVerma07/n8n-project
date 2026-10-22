const META_GRAPH_VERSION = 'v21.0';
const BASE_GRAPH_URL = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

export const metaPublisherService = {
  /**
   * Publishes to Facebook Page or Instagram Business Account.
   */
  async publish(brand, post, platform) {
    const pageId = brand?.metaConfig?.metaPageId || process.env.META_PAGE_ID || '1454740611044963';
    const igAccountId = brand?.metaConfig?.metaIgAccountId || process.env.META_IG_ACCOUNT_ID || '17841439037630316';
    const accessToken = brand?.metaConfig?.metaAccessToken || process.env.META_ACCESS_TOKEN;

    const mediaUrls = post.mediaUrls || [];
    const mediaUrl = mediaUrls[0] || 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80';
    const caption = [post.caption, post.hashtags].filter(Boolean).join('\n\n');

    if (platform === 'FACEBOOK') {
      return this.publishToFacebook(pageId, accessToken, caption, mediaUrl);
    } else if (platform === 'INSTAGRAM') {
      return this.publishToInstagram(igAccountId, accessToken, caption, mediaUrl, post.firstComment);
    }
    return { success: true, platform, simulated: true };
  },

  async getPageAccessToken(pageId, token) {
    try {
      const res = await fetch(`${BASE_GRAPH_URL}/${pageId}?fields=access_token&access_token=${token}`);
      const data = await res.json();
      return data.access_token || token;
    } catch {
      return token;
    }
  },

  async publishToFacebook(pageId, accessToken, caption, mediaUrl) {
    const pageToken = await this.getPageAccessToken(pageId, accessToken);
    const endpoint = `${BASE_GRAPH_URL}/${pageId}/photos`;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: mediaUrl,
          caption,
          access_token: pageToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          platform: 'FACEBOOK',
          error: data.error?.message || 'Facebook publish failed',
          errorCode: data.error?.code,
          errorSubcode: data.error?.error_subcode,
        };
      }
      return {
        success: true,
        platform: 'FACEBOOK',
        postId: data.id || data.post_id,
        permalink: `https://www.facebook.com/${pageId}/posts/${data.id || data.post_id}`,
      };
    } catch (err) {
      return { success: false, platform: 'FACEBOOK', error: err.message };
    }
  },

  async publishToInstagram(igAccountId, accessToken, caption, mediaUrl, firstComment) {
    try {
      // Step 1: Create media container
      const containerUrl = `${BASE_GRAPH_URL}/${igAccountId}/media`;
      const containerRes = await fetch(containerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: mediaUrl,
          caption,
          access_token: accessToken,
        }),
      });
      const containerData = await containerRes.json();
      if (!containerRes.ok) {
        return {
          success: false,
          platform: 'INSTAGRAM',
          error: containerData.error?.message || 'Instagram container creation failed',
          errorCode: containerData.error?.code,
          errorSubcode: containerData.error?.error_subcode,
        };
      }

      const creationId = containerData.id;

      // Small delay for Meta processing container
      await new Promise((r) => setTimeout(r, 2000));

      // Step 2: Publish media container
      const publishUrl = `${BASE_GRAPH_URL}/${igAccountId}/media_publish`;
      const publishRes = await fetch(publishUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: accessToken,
        }),
      });
      const publishData = await publishRes.json();
      if (!publishRes.ok) {
        return {
          success: false,
          platform: 'INSTAGRAM',
          error: publishData.error?.message || 'Instagram media publish failed',
          errorCode: publishData.error?.code,
        };
      }

      // Step 3: First Comment
      if (firstComment && publishData.id) {
        try {
          await fetch(`${BASE_GRAPH_URL}/${publishData.id}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: firstComment,
              access_token: accessToken,
            }),
          });
        } catch (_) {}
      }

      return {
        success: true,
        platform: 'INSTAGRAM',
        postId: publishData.id,
        permalink: `https://www.instagram.com/p/${publishData.id}/`,
      };
    } catch (err) {
      return { success: false, platform: 'INSTAGRAM', error: err.message };
    }
  },
};
