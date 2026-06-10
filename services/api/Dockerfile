FROM node:20-bookworm-slim AS builder

RUN apt-get update -y \
    && apt-get install -y openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS production

RUN apt-get update -y \
    && apt-get install -y openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

ARG APP_ENV=production
ENV NODE_ENV=${APP_ENV}

EXPOSE 3001

CMD ["node", "dist/src/main.js"]
