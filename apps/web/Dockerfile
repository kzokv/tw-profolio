FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY libs/shared-types/package.json libs/shared-types/

RUN npm ci

COPY tsconfig.base.json ./
COPY libs/shared-types/ libs/shared-types/
COPY apps/web/ apps/web/

ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

RUN npm run build -w @tw-portfolio/web

FROM node:22-alpine

WORKDIR /app

COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static apps/web/.next/static

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
