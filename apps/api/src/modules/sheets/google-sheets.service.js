import { google } from 'googleapis';
import crypto from 'node:crypto';
import { sheetRowSchema } from '@postpilot/shared';

/**
 * Maps a row array from Google Sheets (Columns A through S) into a structured PostPilot row object.
 *
 * @param {Array<string>} row - Raw array of cell strings
 * @param {number} rowIndex - 1-indexed sheet row position (e.g. 2 for row 2)
 * @returns {object} Structured schedule row
 */
export function mapCellsToRow(row = [], rowIndex) {
  return {
    post_id: (row[0] || '').trim(),
    client_name: (row[1] || '').trim(),
    brand_id: (row[2] || '').trim(),
    topic: (row[3] || '').trim(),
    caption: row[4] || '',
    hashtags: (row[5] || '').trim(),
    platforms: (row[6] || '').trim(),
    post_type: (row[7] || '').trim(),
    media_urls: (row[8] || '').trim(),
    scheduled_date: (row[9] || '').trim(),
    scheduled_time: (row[10] || '').trim(),
    timezone: (row[11] || '').trim(),
    status: (row[12] || 'Scheduled').trim(),
    first_comment: (row[13] || '').trim(),
    link_url: (row[14] || '').trim(),
    published_at_utc: (row[15] || '').trim(),
    platform_post_ids: (row[16] || '').trim(),
    error_message: (row[17] || '').trim(),
    last_updated_by: (row[18] || '').trim(),
    rowIndex,
  };
}

/**
 * Maps a structured PostPilot row object back to the array of cell strings (Columns A through S).
 *
 * @param {object} rowData - Structured post row
 * @returns {Array<string>} Raw array of cell strings
 */
export function mapRowToCells(rowData) {
  return [
    rowData.post_id || '',
    rowData.client_name || '',
    rowData.brand_id || '',
    rowData.topic || '',
    rowData.caption || '',
    rowData.hashtags || '',
    Array.isArray(rowData.platforms) ? rowData.platforms.join(', ') : rowData.platforms || '',
    rowData.post_type || '',
    Array.isArray(rowData.media_urls) ? rowData.media_urls.join(', ') : rowData.media_urls || '',
    rowData.scheduled_date || '',
    rowData.scheduled_time || '',
    rowData.timezone || '',
    rowData.status || 'Draft',
    rowData.first_comment || '',
    rowData.link_url || '',
    rowData.published_at_utc || '',
    typeof rowData.platform_post_ids === 'object'
      ? JSON.stringify(rowData.platform_post_ids)
      : rowData.platform_post_ids || '',
    rowData.error_message || '',
    rowData.last_updated_by || 'system',
  ];
}

/**
 * Computes a deterministic SHA-256 checksum of schedule rows to prevent sync loops.
 *
 * @param {Array<object>} rows - Array of parsed rows
 * @returns {string} Hex SHA-256 hash
 */
export function computeRowsChecksum(rows) {
  const content = rows
    .map((r) => `${r.post_id}|${r.status}|${r.scheduled_date}|${r.scheduled_time}|${r.caption}`)
    .sort()
    .join('||');
  return crypto.createHash('sha256').update(content).digest('hex');
}

export class GoogleSheetsService {
  /**
   * @param {object} [options]
   * @param {string} [options.clientEmail]
   * @param {string} [options.privateKey]
   * @param {boolean} [options.isMock=false]
   */
  constructor(options = {}) {
    this.clientEmail = options.clientEmail || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    this.privateKey = (options.privateKey || process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    this.isMock = options.isMock || !this.clientEmail || !this.privateKey;
    this.sheetsClient = null;

    if (!this.isMock) {
      const auth = new google.auth.JWT({
        email: this.clientEmail,
        key: this.privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      this.sheetsClient = google.sheets({ version: 'v4', auth });
    }
  }

  /**
   * Executes a Google Sheets API call with exponential backoff for 429/503 quota management.
   *
   * @param {Function} apiFn
   * @param {number} [maxRetries=3]
   * @returns {Promise<any>}
   */
  async executeWithBackoff(apiFn, maxRetries = 3) {
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        return await apiFn();
      } catch (err) {
        attempt++;
        const status = err.response?.status || err.code;
        if ((status === 429 || status === 503) && attempt <= maxRetries) {
          const delayMs = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        throw err;
      }
    }
  }

  /**
   * Helper to extract sheet ID and type from URL or raw ID
   */
  extractSheetId(spreadsheetId) {
    if (!spreadsheetId || typeof spreadsheetId !== 'string') return null;
    const trimmed = spreadsheetId.trim();
    if (trimmed.includes('2PACX-')) {
      const match = trimmed.match(/(2PACX-[a-zA-Z0-9-_]+)/);
      return { type: 'pub', id: match ? match[1] : trimmed };
    }
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1] !== 'e') {
      return { type: 'standard', id: match[1] };
    }
    return { type: 'standard', id: trimmed };
  }

  /**
   * Generates candidate public CSV export URLs for a sheet
   */
  getCsvUrls(spreadsheetId) {
    const parsed = this.extractSheetId(spreadsheetId);
    if (!parsed) return [];
    if (parsed.type === 'pub') {
      return [`https://docs.google.com/spreadsheets/d/e/${parsed.id}/pub?output=csv`];
    }
    return [
      `https://docs.google.com/spreadsheets/d/${parsed.id}/export?format=csv`,
      `https://docs.google.com/spreadsheets/d/${parsed.id}/gviz/tq?tqx=out:csv`,
    ];
  }

  /**
   * Tests connection and permissions for a Google Sheet.
   *
   * @param {string} spreadsheetId
   * @returns {Promise<{ success: boolean, title: string, sheets: string[] }>}
   */
  async testConnection(spreadsheetId) {
    const candidateUrls = this.getCsvUrls(spreadsheetId);
    for (const url of candidateUrls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const text = await res.text();
          if (text.includes('post_id') || text.includes('client_name') || text.includes(',')) {
            return {
              success: true,
              title: 'Live Shared Google Sheet (CSV Sync Active)',
              sheets: ['Schedule', 'Live Feed'],
              isMock: false,
            };
          }
        }
      } catch (err) {
        // Fall through
      }
    }

    if (this.isMock) {
      return {
        success: true,
        title: `Mock Spreadsheet (${spreadsheetId.slice(0, 8)}...)`,
        sheets: ['Schedule', 'Report_2026_11', 'Summary'],
        isMock: true,
      };
    }

    return this.executeWithBackoff(async () => {
      const res = await this.sheetsClient.spreadsheets.get({
        spreadsheetId,
      });

      return {
        success: true,
        title: res.data.properties.title,
        sheets: (res.data.sheets || []).map((s) => s.properties.title),
        isMock: false,
      };
    });
  }

  /**
   * Reads schedule rows using batchGet for high quota efficiency or direct live CSV for shared/published sheets.
   *
   * @param {string} spreadsheetId
   * @param {string} [sheetName='Schedule']
   * @returns {Promise<{ rawRows: Array<object>, validRows: Array<object>, invalidRows: Array<object>, checksum: string }>}
   */
  async readScheduleRows(spreadsheetId, sheetName = 'Schedule') {
    const candidateUrls = this.getCsvUrls(spreadsheetId);
    for (const url of candidateUrls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const csvText = await res.text();
          if (csvText.includes('<!DOCTYPE html>')) continue;

          const { parse: csvParse } = await import('csv-parse/sync');
          const records = csvParse(csvText, { columns: true, skip_empty_lines: true, trim: true });

          const rawRows = [];
          const validRows = [];
          const invalidRows = [];

          for (let i = 0; i < records.length; i++) {
            const mapped = {
              ...records[i],
              rowIndex: i + 2,
            };

            // Sanitize media_urls if placeholder text like [link removed] was passed
            if (
              typeof mapped.media_urls === 'string' &&
              (mapped.media_urls.includes('[link removed]') ||
                mapped.media_urls.toLowerCase() === 'n/a' ||
                mapped.media_urls.toLowerCase() === 'none')
            ) {
              mapped.media_urls =
                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80';
            }

            rawRows.push(mapped);

            const parseResult = sheetRowSchema.safeParse(mapped);
            if (parseResult.success) {
              validRows.push({ ...mapped, parsed: parseResult.data });
            } else {
              invalidRows.push({
                ...mapped,
                errors: parseResult.error.issues.map((iss) => iss.message),
              });
            }
          }

          return {
            rawRows,
            validRows,
            invalidRows,
            checksum: computeRowsChecksum(validRows),
            isMock: false,
          };
        }
      } catch (err) {
        console.warn('Failed to read live CSV from url:', url, err.message);
      }
    }

    if (this.isMock) {
      // Return high quality simulated schedule rows matching the 19-column contract
      const simulatedRows = [
        {
          post_id: 'PP-2026-000101',
          client_name: 'Acme Corp',
          brand_id: 'brand-acme',
          topic: 'Diwali Festive Sale',
          caption: 'Celebrate Diwali with up to 30% discount on all premium gift hampers! #Diwali2026',
          hashtags: '#Diwali #Sale #Offer',
          platforms: 'facebook, instagram, linkedin',
          post_type: 'image',
          media_urls: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800',
          scheduled_date: '2026-11-01',
          scheduled_time: '18:30',
          timezone: 'Asia/Kolkata',
          status: 'Scheduled',
          first_comment: 'Link in bio for more exciting offers!',
          link_url: 'https://acme.example.com/diwali',
          published_at_utc: '',
          platform_post_ids: '',
          error_message: '',
          last_updated_by: 'system',
          rowIndex: 2,
        },
        {
          post_id: 'PP-2026-000102',
          client_name: 'Acme Corp',
          brand_id: 'brand-acme',
          topic: 'Product Announcement',
          caption: 'Introducing PostPilot: Automated social media scheduling for modern enterprise teams.',
          hashtags: '#SaaS #SocialMedia #Automation',
          platforms: 'linkedin, twitter',
          post_type: 'text',
          media_urls: '',
          scheduled_date: '2026-11-02',
          scheduled_time: '09:00',
          timezone: 'Asia/Kolkata',
          status: 'Scheduled',
          first_comment: '',
          link_url: 'https://postpilot.local',
          published_at_utc: '',
          platform_post_ids: '',
          error_message: '',
          last_updated_by: 'system',
          rowIndex: 3,
        },
      ];

      return {
        rawRows: simulatedRows,
        validRows: simulatedRows,
        invalidRows: [],
        checksum: computeRowsChecksum(simulatedRows),
        isMock: true,
      };
    }

    const range = `${sheetName}!A2:S`;
    const response = await this.executeWithBackoff(async () => {
      return this.sheetsClient.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges: [range],
      });
    });

    const valueRanges = response.data.valueRanges || [];
    const rawValues = valueRanges[0]?.values || [];

    const rawRows = [];
    const validRows = [];
    const invalidRows = [];

    for (let i = 0; i < rawValues.length; i++) {
      const rowIndex = i + 2; // Rows start at 2 after header
      const mapped = mapCellsToRow(rawValues[i], rowIndex);
      rawRows.push(mapped);

      // Validate with sheetRowSchema
      const parseResult = sheetRowSchema.safeParse(mapped);
      if (parseResult.success) {
        validRows.push({ ...mapped, parsed: parseResult.data });
      } else {
        invalidRows.push({
          ...mapped,
          errors: parseResult.error.issues.map((iss) => iss.message),
        });
      }
    }

    const checksum = computeRowsChecksum(validRows);

    return {
      rawRows,
      validRows,
      invalidRows,
      checksum,
      isMock: false,
    };
  }

  /**
   * Updates row status and publish results in batch (A to S or M to S).
   *
   * @param {string} spreadsheetId
   * @param {Array<{ rowIndex: number, values: Array<string> }>} updates
   * @param {string} [sheetName='Schedule']
   * @returns {Promise<object>}
   */
  async batchUpdateRowStatuses(spreadsheetId, updates = [], sheetName = 'Schedule') {
    if (this.isMock || updates.length === 0) {
      return {
        success: true,
        updatedRowsCount: updates.length,
        isMock: this.isMock,
      };
    }

    const data = updates.map((u) => ({
      range: `${sheetName}!M${u.rowIndex}:S${u.rowIndex}`,
      values: [u.values],
    }));

    return this.executeWithBackoff(async () => {
      const res = await this.sheetsClient.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data,
        },
      });

      return {
        success: true,
        updatedRowsCount: res.data.totalUpdatedRows || updates.length,
      };
    });
  }
}

export const googleSheetsService = new GoogleSheetsService();
