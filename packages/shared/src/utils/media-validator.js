import { PLATFORMS } from '../constants/platforms.js';
import { PLATFORM_SPECS } from '../constants/platform-specs.js';

/**
 * Computes simplified aspect ratio representation and decimal ratio.
 * @param {number} width
 * @param {number} height
 * @returns {{ ratioDecimal: number, label: string }}
 */
export function calculateAspectRatio(width, height) {
  if (!width || !height) return { ratioDecimal: 1, label: 'unknown' };

  const decimal = width / height;

  // Common aspect ratio tolerances (~5%)
  if (Math.abs(decimal - 1.0) < 0.05) return { ratioDecimal: decimal, label: '1:1' };
  if (Math.abs(decimal - 0.5625) < 0.05) return { ratioDecimal: decimal, label: '9:16' };
  if (Math.abs(decimal - 1.777) < 0.05) return { ratioDecimal: decimal, label: '16:9' };
  if (Math.abs(decimal - 0.8) < 0.05) return { ratioDecimal: decimal, label: '4:5' };
  if (Math.abs(decimal - 1.91) < 0.05) return { ratioDecimal: decimal, label: '1.91:1' };
  if (Math.abs(decimal - 0.666) < 0.05) return { ratioDecimal: decimal, label: '2:3' };

  return { ratioDecimal: decimal, label: `${width}:${height}` };
}

/**
 * Validates a media asset against technical platform specifications.
 * Returns actionable warnings and compatibility flags.
 *
 * @param {object} asset
 * @param {string} asset.mimeType - e.g. "image/jpeg", "video/mp4"
 * @param {number} asset.fileSize - Size in bytes
 * @param {number} [asset.width] - Width in px
 * @param {number} [asset.height] - Height in px
 * @param {number} [asset.durationSeconds] - Duration for videos in seconds
 * @param {string[]} targetPlatforms - Array of platforms to validate against
 * @returns {{ isCompatible: boolean, warnings: Array<{ platform: string, type: 'ERROR'|'WARNING', message: string }> }}
 */
export function validateMediaForPlatforms(asset, targetPlatforms = []) {
  const warnings = [];
  const isVideo = asset.mimeType?.startsWith('video/');
  const isImage = asset.mimeType?.startsWith('image/');
  const mediaType = isVideo ? 'video' : isImage ? 'image' : 'unknown';

  const { label: aspectLabel, ratioDecimal } = calculateAspectRatio(asset.width, asset.height);

  for (const rawPlatform of targetPlatforms) {
    const platform = rawPlatform.toUpperCase();
    const specs = PLATFORM_SPECS[platform];
    if (!specs) continue;

    // 1. Media Type Support
    if (specs.supportedMedia && !specs.supportedMedia.includes(mediaType)) {
      warnings.push({
        platform,
        type: 'ERROR',
        message: `${specs.name} does not support ${mediaType} files`,
      });
      continue;
    }

    // 2. File Size Limits
    if (isImage && specs.maxImageBytes && asset.fileSize > specs.maxImageBytes) {
      const maxMb = Math.round(specs.maxImageBytes / (1024 * 1024));
      const actualMb = (asset.fileSize / (1024 * 1024)).toFixed(1);
      warnings.push({
        platform,
        type: 'ERROR',
        message: `Image size (${actualMb}MB) exceeds ${specs.name} limit of ${maxMb}MB`,
      });
    }

    if (isVideo && specs.maxVideoBytes && asset.fileSize > specs.maxVideoBytes) {
      const maxMb = Math.round(specs.maxVideoBytes / (1024 * 1024));
      const actualMb = (asset.fileSize / (1024 * 1024)).toFixed(1);
      warnings.push({
        platform,
        type: 'ERROR',
        message: `Video size (${actualMb}MB) exceeds ${specs.name} limit of ${maxMb}MB`,
      });
    }

    // 3. Duration Limits for Videos
    if (isVideo && asset.durationSeconds) {
      if (specs.maxVideoDurationSeconds && asset.durationSeconds > specs.maxVideoDurationSeconds) {
        warnings.push({
          platform,
          type: 'ERROR',
          message: `Video duration (${Math.round(asset.durationSeconds)}s) exceeds ${specs.name} maximum of ${specs.maxVideoDurationSeconds}s`,
        });
      }
    }

    // 4. Aspect Ratio Recommendations / Requirements
    if (platform === PLATFORMS.INSTAGRAM && isVideo) {
      // Reels requirement
      if (aspectLabel !== '9:16' && (ratioDecimal < 0.5 || ratioDecimal > 0.6)) {
        warnings.push({
          platform,
          type: 'WARNING',
          message: `Instagram Reels perform best with 9:16 vertical video. Current ratio is ${aspectLabel}.`,
        });
      }
    }

    if (platform === PLATFORMS.TIKTOK && isVideo) {
      if (aspectLabel !== '9:16') {
        warnings.push({
          platform,
          type: 'WARNING',
          message: `TikTok requires 9:16 vertical video for optimal display. Current ratio is ${aspectLabel}.`,
        });
      }
    }
  }

  const hasBlockingErrors = warnings.some((w) => w.type === 'ERROR');

  return {
    isCompatible: !hasBlockingErrors,
    warnings,
  };
}
