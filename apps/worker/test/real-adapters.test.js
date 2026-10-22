import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MetaAdapter } from '../src/adapters/meta.adapter.js';
import { LinkedInAdapter } from '../src/adapters/linkedin.adapter.js';
import { TwitterAdapter } from '../src/adapters/twitter.adapter.js';
import { YouTubeAdapter } from '../src/adapters/youtube.adapter.js';
import { TikTokAdapter } from '../src/adapters/tiktok.adapter.js';
import { PinterestAdapter } from '../src/adapters/pinterest.adapter.js';
import { GoogleBusinessAdapter } from '../src/adapters/google-business.adapter.js';
import { tokenService } from '../src/services/token.service.js';
import { encryptAesGcm } from '@postpilot/shared';
import { env } from '../src/config/env.js';

describe('Phase 6: Real Platform Adapters Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('TokenService (AES-256-GCM Decryption & Expiry Detection)', () => {
    it('decrypts encrypted access tokens correctly using master encryption key', () => {
      const plaintextToken = 'EAABwzLixnj...meta_live_access_token_12345';
      const encrypted = encryptAesGcm(plaintextToken, env.ENCRYPTION_KEY);

      const mockAccount = {
        id: 'acc-1',
        accessTokenEncrypted: encrypted.ciphertext,
        tokenIv: encrypted.iv,
        tokenTag: encrypted.tag,
      };

      const decrypted = tokenService.getDecryptedAccessToken(mockAccount);
      expect(decrypted).toBe(plaintextToken);
    });

    it('detects when an OAuth token is expiring soon (within 24 hours)', () => {
      const expiringSoon = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
      const healthyToken = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      expect(tokenService.isExpiringSoon({ expiresAt: expiringSoon })).toBe(true);
      expect(tokenService.isExpiringSoon({ expiresAt: healthyToken })).toBe(false);
    });
  });

  describe('MetaAdapter (Facebook Pages & Instagram Business)', () => {
    it('publishes photo post to Facebook Page /photos endpoint', async () => {
      const adapter = new MetaAdapter('FACEBOOK');

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'fb_post_999888' }),
      });

      const post = {
        caption: 'Celebrate festive discounts!',
        hashtags: '#festive',
        mediaUrls: ['https://cdn.example.com/banner.jpg'],
        postType: 'IMAGE',
      };

      const result = await adapter.publish(post);

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/photos'),
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(result.success).toBe(true);
      expect(result.platformPostId).toBe('fb_post_999888');
      expect(result.platformPostUrl).toBe('https://www.facebook.com/fb_post_999888');
    });

    it('executes 3-step Instagram workflow: container creation, status polling, and publish', async () => {
      const adapter = new MetaAdapter('INSTAGRAM');

      const fetchSpy = vi.spyOn(globalThis, 'fetch')
        // 1. Container creation
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'ig_container_111' }),
        })
        // 2. Container status poll (FINISHED)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status_code: 'FINISHED' }),
        })
        // 3. Media publish
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'ig_media_222' }),
        })
        // 4. First comment
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'ig_comment_333' }),
        })
        // 5. Fetch permalink
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ permalink: 'https://www.instagram.com/p/Cxyz123/' }),
        });

      const post = {
        caption: 'New collection drop!',
        firstComment: 'Shop the link in bio!',
        mediaUrls: ['https://cdn.example.com/collection.jpg'],
        postType: 'IMAGE',
      };

      const result = await adapter.publish(post);

      expect(fetchSpy).toHaveBeenCalledTimes(5);
      expect(result.success).toBe(true);
      expect(result.platformPostId).toBe('ig_media_222');
      expect(result.platformPostUrl).toBe('https://www.instagram.com/p/Cxyz123/');
    });
  });

  describe('LinkedInAdapter (REST v202401)', () => {
    it('creates organization post with commentary and extracts URN from x-restli-id header', async () => {
      const adapter = new LinkedInAdapter();

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'x-restli-id': 'urn:li:share:7198273645',
        }),
        text: async () => '{}',
      });

      const post = {
        caption: 'Excited to announce our Q4 roadmap!',
        topic: 'Q4 Roadmap',
        linkUrl: 'https://postpilot.app/roadmap',
      };

      const result = await adapter.publish(post);

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.linkedin.com/rest/posts',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'LinkedIn-Version': '202401',
          }),
        })
      );
      expect(result.success).toBe(true);
      expect(result.platformPostId).toBe('urn:li:share:7198273645');
      expect(result.platformPostUrl).toBe('https://www.linkedin.com/feed/update/urn:li:share:7198273645');
    });
  });

  describe('TwitterAdapter (X API v2)', () => {
    it('publishes tweet via /2/tweets endpoint', async () => {
      const adapter = new TwitterAdapter();

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { id: '1792470123456789012', text: 'Hello world from PostPilot!' },
        }),
      });

      const post = {
        caption: 'Hello world from PostPilot!',
      };

      const result = await adapter.publish(post);

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.twitter.com/2/tweets',
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(result.success).toBe(true);
      expect(result.platformPostId).toBe('1792470123456789012');
      expect(result.platformPostUrl).toBe('https://x.com/i/status/1792470123456789012');
    });
  });

  describe('YouTubeAdapter (Data API v3)', () => {
    it('validates video requirement and uploads video metadata', async () => {
      const adapter = new YouTubeAdapter();

      // Fails if no video URL
      expect(adapter.validate({ mediaUrls: [] }).valid).toBe(false);

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'dQw4w9WgXcQ' }),
      });

      const post = {
        topic: 'PostPilot Full Demo 2026',
        caption: 'Walkthrough of our enterprise multi-brand social posting engine.',
        mediaUrls: ['https://cdn.example.com/video.mp4'],
        postType: 'VIDEO',
      };

      const result = await adapter.publish(post);

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/videos?part=snippet,status'),
        expect.objectContaining({ method: 'POST' })
      );
      expect(result.success).toBe(true);
      expect(result.platformPostId).toBe('dQw4w9WgXcQ');
      expect(result.platformPostUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });
  });

  describe('TikTok, Pinterest, and Google Business Adapters', () => {
    it('publishes to TikTok via /post/publish/video/init/', async () => {
      const adapter = new TikTokAdapter();
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: { code: 'ok' }, data: { publish_id: 'tt_12345' } }),
      });

      const res = await adapter.publish({
        caption: 'TikTok trending audio demo',
        mediaUrls: ['https://cdn.example.com/short.mp4'],
      });
      expect(res.success).toBe(true);
      expect(res.platformPostId).toBe('tt_12345');
    });

    it('publishes to Pinterest Pins API v5', async () => {
      const adapter = new PinterestAdapter();
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'pin_98765' }),
      });

      const res = await adapter.publish({
        caption: 'Modern workspace aesthetics',
        mediaUrls: ['https://cdn.example.com/desk.jpg'],
      });
      expect(res.success).toBe(true);
      expect(res.platformPostId).toBe('pin_98765');
    });

    it('publishes to Google Business Profile Local Posts API', async () => {
      const adapter = new GoogleBusinessAdapter();
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: 'accounts/123/locations/456/localPosts/789' }),
      });

      const res = await adapter.publish({
        caption: 'We are open this weekend with special holiday offers!',
        linkUrl: 'https://acme.com',
      });
      expect(res.success).toBe(true);
      expect(res.platformPostId).toBe('accounts/123/locations/456/localPosts/789');
    });
  });
});
