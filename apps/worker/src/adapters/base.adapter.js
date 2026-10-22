/**
 * @typedef {object} PublishResult
 * @property {boolean} success - Whether publication succeeded
 * @property {string} platformPostId - Native ID returned by social platform
 * @property {string} platformPostUrl - Public permalink to the published post
 * @property {object} [metadata] - Raw response payload from platform API
 * @property {string} [errorCode] - Error code if failed
 * @property {string} [errorMessage] - Error message if failed
 */

/**
 * @typedef {object} HealthCheckResult
 * @property {boolean} healthy - Whether account connection is valid
 * @property {string} status - Connected, expiring_soon, expired, error
 * @property {string} [message] - Additional diagnostics
 */

/**
 * Abstract Base Class for Platform Adapters.
 * All platform implementations (Meta, LinkedIn, X, YouTube, TikTok, Pinterest, Mock) must extend this class.
 */
export class PlatformAdapter {
  /**
   * @param {string} platform - Normalized Platform enum name
   */
  constructor(platform) {
    if (new.target === PlatformAdapter) {
      throw new TypeError('Cannot construct PlatformAdapter instances directly; must be subclassed');
    }
    this.platform = platform;
  }

  /**
   * Returns the normalized platform enum name (e.g. FACEBOOK, INSTAGRAM, LINKEDIN).
   *
   * @returns {string}
   */
  getPlatformName() {
    return this.platform;
  }

  /**
   * Pre-flight validation verifying that post contents satisfy platform-specific specifications.
   *
   * @param {object} post - PostPilot Post entity
   * @param {object} [socialAccount] - Connected SocialAccount entity
   * @returns {{ valid: boolean, errors?: string[] }}
   */
  validate(post, socialAccount) {
    throw new Error(`validate() not implemented on ${this.constructor.name}`);
  }

  /**
   * Publishes post to the target platform API.
   *
   * @param {object} post - PostPilot Post entity
   * @param {object} [socialAccount] - Connected SocialAccount entity
   * @returns {Promise<PublishResult>}
   */
  async publish(post, socialAccount) {
    throw new Error(`publish() not implemented on ${this.constructor.name}`);
  }

  /**
   * Performs token health check against the platform's user/me or token inspection endpoint.
   *
   * @param {object} socialAccount - Connected SocialAccount entity
   * @returns {Promise<HealthCheckResult>}
   */
  async checkHealth(socialAccount) {
    throw new Error(`checkHealth() not implemented on ${this.constructor.name}`);
  }

  /**
   * Formats caption and hashtags according to platform best practices.
   *
   * @param {object} post
   * @param {string} [platformOverride]
   * @returns {string}
   */
  formatCaption(post, platformOverride = null) {
    const baseCaption = (platformOverride || post.caption || '').trim();
    const hashtags = (post.hashtags || '').trim();

    if (!hashtags) {
      return baseCaption;
    }

    // Append hashtags with clean spacing
    return `${baseCaption}\n\n${hashtags}`;
  }
}
