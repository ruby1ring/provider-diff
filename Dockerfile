ARG DOCKER_BASE_REGISTRY=docker.io

FROM ${DOCKER_BASE_REGISTRY}/library/golang:1.22-alpine AS backend-builder

WORKDIR /src/backend

COPY backend/go.mod ./
COPY backend/*.go ./

RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/provider-diff-backend .

FROM ${DOCKER_BASE_REGISTRY}/library/python:3.12-alpine AS runtime

WORKDIR /app

ENV APP_PORT=4173
ENV PORT=8080

COPY --from=backend-builder /out/provider-diff-backend /usr/local/bin/provider-diff-backend
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

COPY index.html styles.css main.js package.json ./
COPY assets ./assets
COPY docs ./docs
COPY lib ./lib
COPY outputs ./outputs
COPY payloads ./payloads

RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 4173 8080

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
