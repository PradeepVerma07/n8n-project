import { PLATFORMS } from '@postpilot/shared';
import { MockAdapter } from './mock.adapter.js';
import { MetaAdapter } from './meta.adapter.js';
import { LinkedInAdapter } from './linkedin.adapter.js';
import { TwitterAdapter } from './twitter.adapter.js';
import { YouTubeAdapter } from './youtube.adapter.js';
import { TikTokAdapter } from './tiktok.adapter.js';
import { PinterestAdapter } from './pinterest.adapter.js';
import { GoogleBusinessAdapter } from './google-business.adapter.js';
import { env } from '../config/env.js';

class AdapterRegistry {
  constructor() {
    /** @type {Map<string, import('./base.adapter.js').PlatformAdapter>} */
    this.adapters = new Map();
    this.initializeDefaultAdapters();
  }

  /**
   * Initializes platform adapters based on active PUBLISH_MODE (mock or live).
   */
  initializeDefaultAdapters() {
    const isMock = env.PUBLISH_MODE === 'mock';

    if (isMock) {
      for (const platform of Object.values(PLATFORMS)) {
        this.register(platform, new MockAdapter(platform));
      }
    } else {
      // Register Live Platform Adapters
      this.register(PLATFORMS.FACEBOOK, new MetaAdapter('FACEBOOK'));
      this.register(PLATFORMS.INSTAGRAM, new MetaAdapter('INSTAGRAM'));
      this.register(PLATFORMS.LINKEDIN, new LinkedInAdapter());
      this.register(PLATFORMS.TWITTER, new TwitterAdapter());
      this.register(PLATFORMS.YOUTUBE, new YouTubeAdapter());
      this.register(PLATFORMS.TIKTOK, new TikTokAdapter());
      this.register(PLATFORMS.PINTEREST, new PinterestAdapter());
      this.register(PLATFORMS.GOOGLE_BUSINESS, new GoogleBusinessAdapter());
    }
  }

  /**
   * Registers a platform adapter instance.
   *
   * @param {string} platform - Normalized Platform enum
   * @param {import('./base.adapter.js').PlatformAdapter} adapter - Adapter instance
   */
  register(platform, adapter) {
    const key = String(platform).toUpperCase();
    this.adapters.set(key, adapter);
  }

  /**
   * Retrieves the adapter instance for a given platform.
   * If not registered, falls back to a MockAdapter.
   *
   * @param {string} platform - Normalized Platform enum
   * @returns {import('./base.adapter.js').PlatformAdapter}
   */
  getAdapter(platform) {
    const key = String(platform).toUpperCase();
    let adapter = this.adapters.get(key);

    if (!adapter) {
      adapter = new MockAdapter(key);
      this.register(key, adapter);
    }

    return adapter;
  }
}

export const adapterRegistry = new AdapterRegistry();
