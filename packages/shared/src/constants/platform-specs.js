import { PLATFORMS } from './platforms.js';

/**
 * Specifications, limits, and restrictions per platform.
 */
export const PLATFORM_SPECS = Object.freeze({
  [PLATFORMS.FACEBOOK]: {
    name: 'Facebook Pages',
    maxCaptionLength: 63206,
    maxHashtags: 30,
    supportedMedia: ['image', 'video'],
    maxImageBytes: 10 * 1024 * 1024, // 10MB
    maxVideoBytes: 1024 * 1024 * 1024, // 1GB
    maxVideoDurationSeconds: 14400, // 240 mins
  },
  [PLATFORMS.INSTAGRAM]: {
    name: 'Instagram Business',
    maxCaptionLength: 2200,
    maxHashtags: 30,
    supportedMedia: ['image', 'video'],
    maxImageBytes: 8 * 1024 * 1024, // 8MB
    maxVideoBytes: 100 * 1024 * 1024, // 100MB for Reels
    maxVideoDurationSeconds: 900, // 15 mins for Reels
    aspectRatios: {
      feed: ['1:1', '4:5', '1.91:1'],
      reels: ['9:16'],
      stories: ['9:16'],
    },
  },
  [PLATFORMS.LINKEDIN]: {
    name: 'LinkedIn Company Pages',
    maxCaptionLength: 3000,
    maxHashtags: 30,
    supportedMedia: ['image', 'video', 'document'],
    maxImageBytes: 10 * 1024 * 1024,
    maxVideoBytes: 200 * 1024 * 1024,
    maxVideoDurationSeconds: 600, // 10 mins
  },
  [PLATFORMS.TWITTER]: {
    name: 'X (Twitter)',
    maxCaptionLength: 280,
    maxHashtags: 10,
    supportedMedia: ['image', 'video', 'gif'],
    maxImageBytes: 5 * 1024 * 1024,
    maxVideoBytes: 512 * 1024 * 1024,
    maxVideoDurationSeconds: 140, // 2 mins 20s
  },
  [PLATFORMS.YOUTUBE]: {
    name: 'YouTube',
    maxCaptionLength: 5000, // Description
    maxTitleLength: 100,
    supportedMedia: ['video'],
    maxVideoBytes: 128 * 1024 * 1024 * 1024, // 128GB
    maxShortDurationSeconds: 60,
  },
  [PLATFORMS.TIKTOK]: {
    name: 'TikTok',
    maxCaptionLength: 2200,
    supportedMedia: ['video'],
    maxVideoBytes: 287 * 1024 * 1024,
    maxVideoDurationSeconds: 600, // 10 mins
    aspectRatios: ['9:16'],
  },
  [PLATFORMS.PINTEREST]: {
    name: 'Pinterest',
    maxTitleLength: 100,
    maxCaptionLength: 500,
    supportedMedia: ['image', 'video'],
    maxImageBytes: 20 * 1024 * 1024,
    maxVideoBytes: 2048 * 1024 * 1024,
    aspectRatios: ['2:3'],
  },
  [PLATFORMS.GOOGLE_BUSINESS]: {
    name: 'Google Business Profile',
    maxCaptionLength: 1500,
    supportedMedia: ['image'],
    maxImageBytes: 10 * 1024 * 1024,
  },
});
