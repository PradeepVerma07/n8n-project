import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { parseLocalToUtc } from '@postpilot/shared';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting PostPilot Database Seeding...');

  // 1. Clean existing data in reverse order of foreign keys
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.publishJob.deleteMany({});
  await prisma.postPlatform.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.socialAccount.deleteMany({});
  await prisma.sheetConfig.deleteMany({});
  await prisma.brand.deleteMany({});
  await prisma.apiKey.deleteMany({});
  await prisma.membership.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.organization.deleteMany({});

  console.log('🧹 Cleaned existing records.');

  // 2. Create Primary Organization
  const org = await prisma.organization.create({
    data: {
      name: 'Apex Global Media Agency',
      slug: 'apex-global-media',
      logoUrl: 'https://cdn.postpilot.app/branding/apex-logo.png',
    },
  });
  console.log(`🏢 Created Organization: ${org.name} (${org.id})`);

  // 3. Create Users across all roles
  const defaultPasswordSalt = await bcrypt.genSalt(10);
  const hash = async (pwd) => bcrypt.hash(pwd, defaultPasswordSalt);

  const usersData = [
    {
      email: 'superadmin@postpilot.app',
      passwordHash: await hash('SuperAdmin123!'),
      firstName: 'System',
      lastName: 'SuperAdmin',
      role: 'SUPER_ADMIN',
    },
    {
      email: 'admin@apexmedia.com',
      passwordHash: await hash('ApexAdmin123!'),
      firstName: 'Sarah',
      lastName: 'Connor',
      role: 'AGENCY_ADMIN',
    },
    {
      email: 'manager@apexmedia.com',
      passwordHash: await hash('Manager123!'),
      firstName: 'David',
      lastName: 'Miller',
      role: 'BRAND_MANAGER',
    },
    {
      email: 'creator@apexmedia.com',
      passwordHash: await hash('Creator123!'),
      firstName: 'Elena',
      lastName: 'Rostova',
      role: 'CONTENT_CREATOR',
    },
    {
      email: 'client@acmefoods.com',
      passwordHash: await hash('ClientViewer123!'),
      firstName: 'Rajesh',
      lastName: 'Sharma',
      role: 'CLIENT_VIEWER',
    },
  ];

  const createdUsers = {};
  for (const u of usersData) {
    const user = await prisma.user.create({
      data: {
        email: u.email,
        passwordHash: u.passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
      },
    });

    await prisma.membership.create({
      data: {
        orgId: org.id,
        userId: user.id,
        role: u.role,
      },
    });

    createdUsers[u.role] = user;
    console.log(`👤 Created User: ${u.email} [${u.role}]`);
  }

  // 4. Create Master n8n Automation API Key
  const n8nApiKeyPlain = 'pp_live_secret_n8n_scheduler_api_key_123456';
  await prisma.apiKey.create({
    data: {
      orgId: org.id,
      name: 'n8n Automation Engine Key',
      keyHash: crypto.createHash('sha256').update(n8nApiKeyPlain).digest('hex'),
      keyPrefix: n8nApiKeyPlain.slice(0, 16),
    },
  });
  console.log('🔑 Created n8n Automation API Key.');

  // 5. Create 3 Sample Brands in Different Timezones
  const brandsConfig = [
    {
      name: 'Acme Foods India',
      slug: 'acme-foods',
      defaultTimezone: 'Asia/Kolkata', // IST +5:30
      primaryColor: '#F59E0B',
      defaultHashtags: '#AcmeFoods #HealthyEating #IndianSpices',
      requiresApproval: false,
      autoPublishMissed: false,
      lookbackMinutes: 10,
      sheet: {
        scheduleSpreadsheetId: '1AcmeFoodsSpreadsheetScheduleSampleId12345',
        scheduleSheetName: 'Schedule',
        reportSpreadsheetId: '1AcmeFoodsSpreadsheetReportSampleId67890',
      },
    },
    {
      name: 'Nova Tech USA',
      slug: 'nova-tech',
      defaultTimezone: 'America/New_York', // EST/EDT
      primaryColor: '#3B82F6',
      defaultHashtags: '#NovaTech #AI #SaaS #FutureOfWork',
      requiresApproval: true,
      autoPublishMissed: true,
      lookbackMinutes: 15,
      sheet: {
        scheduleSpreadsheetId: '2NovaTechSpreadsheetScheduleSampleId12345',
        scheduleSheetName: 'Schedule',
        reportSpreadsheetId: '2NovaTechSpreadsheetReportSampleId67890',
      },
    },
    {
      name: 'Zephyr London',
      slug: 'zephyr-london',
      defaultTimezone: 'Europe/London', // GMT/BST
      primaryColor: '#10B981',
      defaultHashtags: '#ZephyrLondon #LuxuryFashion #SustainableStyle',
      requiresApproval: false,
      autoPublishMissed: false,
      lookbackMinutes: 10,
      sheet: {
        scheduleSpreadsheetId: '3ZephyrSpreadsheetScheduleSampleId12345',
        scheduleSheetName: 'Schedule',
        reportSpreadsheetId: '3ZephyrSpreadsheetReportSampleId67890',
      },
    },
  ];

  const createdBrands = [];
  for (const b of brandsConfig) {
    const { sheet, ...brandPayload } = b;
    const brand = await prisma.brand.create({
      data: {
        ...brandPayload,
        orgId: org.id,
      },
    });

    await prisma.sheetConfig.create({
      data: {
        brandId: brand.id,
        scheduleSpreadsheetId: sheet.scheduleSpreadsheetId,
        scheduleSheetName: sheet.scheduleSheetName,
        reportSpreadsheetId: sheet.reportSpreadsheetId,
      },
    });

    createdBrands.push(brand);
    console.log(`🏷️  Created Brand: ${brand.name} [Timezone: ${brand.defaultTimezone}]`);
  }

  // 6. Create Connected Social Accounts for Acme Foods
  const acmeBrand = createdBrands[0];
  const sampleSocials = [
    { platform: 'FACEBOOK', name: 'Acme Foods FB Official', handle: '@acmefoods' },
    { platform: 'INSTAGRAM', name: 'Acme Foods IG', handle: '@acme_foods' },
    { platform: 'LINKEDIN', name: 'Acme Foods Company', handle: 'acme-foods-inc' },
  ];

  for (const s of sampleSocials) {
    await prisma.socialAccount.create({
      data: {
        brandId: acmeBrand.id,
        platform: s.platform,
        platformAccountId: `acc_${s.platform.toLowerCase()}_123`,
        accountName: s.name,
        accountHandle: s.handle,
        accessTokenEncrypted: 'mock_encrypted_token_123',
        tokenIv: 'mock_iv_123',
        tokenTag: 'mock_tag_123',
        status: 'CONNECTED',
      },
    });
  }
  console.log('📱 Created connected social accounts for Acme Foods.');

  // 7. Create Sample Posts across statuses
  const kolkataPostTime = parseLocalToUtc('2026-11-01', '18:30', 'Asia/Kolkata');
  const post1 = await prisma.post.create({
    data: {
      customId: 'PP-2026-000101',
      brandId: acmeBrand.id,
      createdById: createdUsers.CONTENT_CREATOR.id,
      topic: 'Diwali Special Spice Launch',
      caption: 'Celebrate this festive season with authentic aromatic spices! Enjoy 20% off.',
      hashtags: '#Diwali #Spices #IndianFood',
      postType: 'IMAGE',
      mediaUrls: ['https://cdn.postpilot.app/samples/spices.jpg'],
      scheduledDate: '2026-11-01',
      scheduledTime: '18:30',
      scheduledLocal: new Date('2026-11-01T18:30:00'),
      timezone: 'Asia/Kolkata',
      scheduledUtc: kolkataPostTime.dateTimeUtc.toJSDate(),
      status: 'SCHEDULED',
      source: 'DASHBOARD',
    },
  });

  await prisma.postPlatform.createMany({
    data: [
      { postId: post1.id, platform: 'FACEBOOK', status: 'PENDING' },
      { postId: post1.id, platform: 'INSTAGRAM', status: 'PENDING' },
      { postId: post1.id, platform: 'LINKEDIN', status: 'PENDING' },
    ],
  });

  console.log(`📝 Created Sample Post: ${post1.customId} (${post1.topic})`);
  console.log('✅ PostPilot Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
