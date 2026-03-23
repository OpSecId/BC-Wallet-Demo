ARG build_image=node:18-alpine
ARG runtime_image=caddy:alpine

# build stage
FROM ${build_image} as build-stage
RUN corepack enable && corepack prepare yarn@1.22.22 --activate
WORKDIR /app
COPY . .
RUN yarn install --frozen-lockfile
RUN yarn build


# production stage
FROM ${runtime_image} as production-stage

RUN mkdir -p /srv/digital-trust/showcase /etc/caddy
COPY --from=build-stage /app/client/build /srv/digital-trust/showcase
COPY client/Caddyfile.docker /etc/caddy/Caddyfile

# Fix permissions issue with Caddy image (OpenShift)
RUN chown 1001:root /usr/bin/caddy

ENV PORT=8080
EXPOSE 8080

# Do not use `yarn start` here — final image has no Node/Yarn; Caddy serves the CRA build.
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]