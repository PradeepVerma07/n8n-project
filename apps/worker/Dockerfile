FROM node:20-alpine AS base
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
COPY apps/worker/package*.json ./apps/worker/
COPY apps/web/package*.json ./apps/web/

RUN npm ci

COPY packages/shared/ ./packages/shared/
COPY apps/api/prisma/ ./apps/api/prisma/
COPY apps/worker/ ./apps/worker/

WORKDIR /app/apps/api
RUN npx prisma generate

WORKDIR /app/apps/worker
CMD ["node", "src/index.js"]
