# Idle RPG — единый образ: API-сервер (NestJS) + собранный клиент (Mini App) + бот.
# Сборка:  docker build -t idle-rpg .
# Запуск:  см. docker-compose.yml и README.md

FROM node:22-slim AS build
WORKDIR /app

# зависимости отдельно — кэшируются, пока не меняются package*.json
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/client/package.json apps/client/
COPY apps/server/package.json apps/server/
RUN npm ci --no-audit --no-fund

COPY tsconfig.base.json ./
COPY packages packages
COPY apps apps

RUN npm run build && npm prune --omit=dev --no-audit --no-fund

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    STATIC_DIR=/app/apps/client/dist

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/packages/shared/package.json packages/shared/
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/server/package.json apps/server/
COPY --from=build /app/apps/server/dist apps/server/dist
COPY --from=build /app/apps/client/dist apps/client/dist

EXPOSE 3000
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/server/dist/main.js"]
