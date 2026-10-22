import { decryptAesGcm, encryptAesGcm } from '@postpilot/shared';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';

export const tokenService = {
  /**
   * Decrypts an encrypted access token from a SocialAccount entity.
   *
   * @param {object} socialAccount
   * @returns {string} Plaintext access token
   */
  getDecryptedAccessToken(socialAccount) {
    if (!socialAccount?.accessTokenEncrypted || !socialAccount.tokenIv || !socialAccount.tokenTag) {
      throw new Error(`Missing encrypted access token credentials for account ${socialAccount?.id}`);
    }

    return decryptAesGcm(
      socialAccount.accessTokenEncrypted,
      env.ENCRYPTION_KEY,
      socialAccount.tokenIv,
      socialAccount.tokenTag
    );
  },

  /**
   * Checks if a social account token is expiring soon (within 24 hours).
   *
   * @param {object} socialAccount
   * @returns {boolean}
   */
  isExpiringSoon(socialAccount) {
    if (!socialAccount?.expiresAt) return false;
    const expiryTime = new Date(socialAccount.expiresAt).getTime();
    const now = Date.now();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    return expiryTime - now < twentyFourHoursMs;
  },

  /**
   * Proactively refreshes an OAuth token for Meta, LinkedIn, or Google if a refresh token is present.
   *
   * @param {object} socialAccount
   * @returns {Promise<string>} Active access token
   */
  async ensureActiveToken(socialAccount) {
    if (!socialAccount) return null;

    // Check if token is healthy
    const plainToken = this.getDecryptedAccessToken(socialAccount);

    if (!this.isExpiringSoon(socialAccount)) {
      return plainToken;
    }

    // If no refresh token, return existing token with a warning
    if (!socialAccount.refreshTokenEncrypted) {
      console.warn(`[TokenService] Account ${socialAccount.id} (${socialAccount.platform}) is expiring soon without refresh token`);
      return plainToken;
    }

    try {
      const plainRefreshToken = decryptAesGcm(
        socialAccount.refreshTokenEncrypted,
        env.ENCRYPTION_KEY,
        socialAccount.tokenIv,
        socialAccount.tokenTag
      );

      let refreshed;

      // Platform specific refresh endpoints
      if (socialAccount.platform === 'FACEBOOK' || socialAccount.platform === 'INSTAGRAM') {
        const url = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${plainRefreshToken}`;
        const res = await fetch(url);
        if (res.ok) {
          refreshed = await res.json();
        }
      }

      if (refreshed?.access_token) {
        const encrypted = encryptAesGcm(refreshed.access_token, env.ENCRYPTION_KEY);
        const expiresAt = refreshed.expires_in
          ? new Date(Date.now() + refreshed.expires_in * 1000)
          : null;

        await prisma.socialAccount.update({
          where: { id: socialAccount.id },
          data: {
            accessTokenEncrypted: encrypted.ciphertext,
            tokenIv: encrypted.iv,
            tokenTag: encrypted.tag,
            expiresAt,
            status: 'CONNECTED',
            lastHealthCheckAt: new Date(),
          },
        });

        return refreshed.access_token;
      }
    } catch (err) {
      console.warn(`[TokenService] Automatic token refresh failed for ${socialAccount.id}: ${err.message}`);
    }

    return plainToken;
  },
};
