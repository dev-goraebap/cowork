# syntax=docker/dockerfile:1.7
#
# The whole system in one image: the server serves the API and the built screens (app.screens). The screens are a
# layer of their own, so a change to one side leaves the other's build cached.
#
#   docker build -t cowork:<tag> .
#   docker run -p 8080:8080 -v cowork-data:/var/lib/cowork --env-file app.env cowork:<tag>
#
# Tests are not run here; CI runs them before it builds (.gitlab-ci.yml).

FROM node:24-alpine AS screens
WORKDIR /src/web
COPY web/package.json web/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY web/ ./
# The release tag, shown at the foot of the screens' rail (vite.config).
ARG APP_VERSION=local
RUN npm run build

FROM eclipse-temurin:21-jdk-alpine AS server
WORKDIR /src/server
COPY server/gradlew ./
COPY server/gradle gradle
COPY server/build.gradle server/settings.gradle ./
RUN --mount=type=cache,target=/root/.gradle sh ./gradlew --no-daemon --console=plain -q dependencies > /dev/null
COPY server/ ./
RUN --mount=type=cache,target=/root/.gradle sh ./gradlew --no-daemon --console=plain -q bootJar

FROM eclipse-temurin:21-jre-alpine
# The deploy cleanup removes only images with this title.
LABEL org.opencontainers.image.title=cowork
WORKDIR /app
COPY --from=server /src/server/build/libs/app.jar app.jar
COPY --from=screens /src/web/dist screens/
# The SQLite database; mount a volume here so it outlives the container.
RUN mkdir -p /var/lib/cowork && chown 10001:10001 /var/lib/cowork
USER 10001:10001
ENV TZ=Asia/Seoul
ENV DB_PATH=/var/lib/cowork/cowork.db
ENV STORAGE_LOCAL_ROOT=/var/lib/cowork/files
ENV APP_SCREENS=file:/app/screens/
# The log database of the system status page, beside the business one.
ENV LOG_DB_PATH=/var/lib/cowork/logs.db
# The tag the image was built for (scripts/ci/build-image.sh), shown on the system status page.
ARG APP_VERSION=local
ENV APP_VERSION=$APP_VERSION
EXPOSE 8080
# The health read touches the database, so it tells that the server is up and connected.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/v1/health > /dev/null || exit 1
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
