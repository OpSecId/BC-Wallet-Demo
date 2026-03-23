FROM node:18-alpine as base

# Official Node images ship npm only; monorepo install needs Yarn 1.x (yarn.lock).
RUN corepack enable && corepack prepare yarn@1.22.22 --activate

WORKDIR /app
COPY . .
RUN npm install -g typescript
RUN npm install -g ts-node
RUN yarn install --frozen-lockfile

WORKDIR /app/server

EXPOSE 5000

ENTRYPOINT [ "ts-node", "src/index.ts"]
