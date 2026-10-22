import { createWebhookSignature } from '@postpilot/shared';
import { env } from '../config/env.js';

export const webhookDispatcher = {
  /**
   * Dispatches an HMAC-signed webhook to n8n WF-02 and the PostPilot Node API callback endpoint.
   *
   * @param {object} payload - Publish result payload
   * @returns {Promise<{ n8nDispatched: boolean, apiDispatched: boolean }>}
   */
  async dispatchPublishResult(payload) {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createWebhookSignature(payload, env.N8N_HMAC_SECRET, timestamp);

    const headers = {
      'Content-Type': 'application/json',
      'x-postpilot-signature': signature,
      'x-postpilot-timestamp': String(timestamp),
      'x-api-key': env.POSTPILOT_API_KEY,
    };

    const results = {
      n8nDispatched: false,
      apiDispatched: false,
    };

    // 1. Dispatch to PostPilot Node API callback
    try {
      const apiCallbackUrl = `${env.API_URL}/api/v1/publish/callback`;
      const res = await fetch(apiCallbackUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        results.apiDispatched = true;
      }
    } catch (err) {
      // Gracefully catch network hiccups or offline dev servers
      if (env.NODE_ENV !== 'test') {
        console.warn(`[WebhookDispatcher] Node API callback skipped: ${err.message}`);
      }
    }

    // 2. Dispatch to n8n WF-02 Webhook
    if (env.N8N_PUBLISH_RESULT_WEBHOOK_URL) {
      try {
        const res = await fetch(env.N8N_PUBLISH_RESULT_WEBHOOK_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(5000),
        });

        if (res.ok) {
          results.n8nDispatched = true;
        }
      } catch (err) {
        if (env.NODE_ENV !== 'test') {
          console.warn(`[WebhookDispatcher] n8n webhook skipped (${env.N8N_PUBLISH_RESULT_WEBHOOK_URL}): ${err.message}`);
        }
      }
    }

    return results;
  },
};
