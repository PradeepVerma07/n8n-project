import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

export let isOfflineMode = false;

export function setOfflineMode(val) {
  isOfflineMode = Boolean(val);
}

export function isDbConnectionError(err) {
  if (
    err?.name === 'PrismaClientInitializationError' ||
    err?.message?.includes("Can't reach database server") ||
    err?.message?.includes('database server is running') ||
    err?.code === 'P1001'
  ) {
    isOfflineMode = true;
    return true;
  }
  return isOfflineMode;
}

/**
 * Prisma Client singleton instance.
 */
export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
