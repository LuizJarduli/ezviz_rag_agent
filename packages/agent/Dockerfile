# Build stage
# Using slim instead of alpine for glibc compatibility (required by chromadb-default-embed/onnxruntime)
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=4444

EXPOSE 4444

CMD ["node", "dist/index.js"]
