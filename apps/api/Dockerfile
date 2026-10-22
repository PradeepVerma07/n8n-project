FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies required for Prisma and native extensions
RUN apk add --no-cache libc6-compat openssl

# Copy root workspace configurations
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
COPY apps/worker/package*.json ./apps/worker/
COPY apps/web/package*.json ./apps/web/

# Install all dependencies
RUN npm ci

# Copy source files
COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/

# Generate Prisma Client
WORKDIR /app/apps/api
RUN npx prisma generate

EXPOSE 4000
CMD ["node", "src/server.js"]
