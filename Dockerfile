# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=4444

EXPOSE 4444

CMD ["node", "dist/index.js"]
