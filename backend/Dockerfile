FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx tsc

FROM node:22-alpine AS production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/src ./src
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=base /app/node_modules ./node_modules
COPY package*.json ./
COPY drizzle.config.ts ./
COPY migrations ./migrations
EXPOSE 3000
CMD ["npx", "tsx", "dist/index.js"]

FROM node:22-alpine AS development
RUN apk add --no-cache curl
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
COPY . .
EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["npx", "tsx", "watch", "src/index.ts"]
