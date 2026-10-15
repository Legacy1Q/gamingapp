FROM node:22-bookworm-slim AS frontend
WORKDIR /src/front-client
COPY front-client/package*.json ./
RUN npm ci
COPY front-client/ ./
ENV VITE_TEST_DEPLOYMENT=true
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend
WORKDIR /src
COPY back-server/GamingApp.api/GamingApp.api.csproj ./
RUN dotnet restore GamingApp.api.csproj
COPY back-server/GamingApp.api/ ./
RUN dotnet publish GamingApp.api.csproj -c Release --no-restore -o /out /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=backend /out/ ./
COPY --from=frontend /src/front-client/dist/ ./wwwroot/
ENV ASPNETCORE_ENVIRONMENT=Production \
    Hosting__ServeFrontend=true \
    Preview__Ephemeral=true \
    DataProtection__KeysPath=/tmp/gameshq/keys \
    ConnectionStrings__DefaultConnection="Data Source=/tmp/gameshq/GamingAppDb.db"
USER $APP_UID
EXPOSE 10000
CMD ["/bin/sh", "-c", "mkdir -p /tmp/gameshq/keys && exec dotnet GamingApp.api.dll --urls http://0.0.0.0:${PORT:-10000}"]
