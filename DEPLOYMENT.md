# GamesHQ deployment preparation

## Free Render preview (current Docker setup)

The root `Dockerfile` builds React and the .NET API into one service. The assigned
`https://<available-name>.onrender.com` URL serves the website, API, and Unity
files together, so no domain purchase, CORS setting, or frontend URL override
is needed. `/catalog` returns game JSON; `/games` is the frontend library page.

In Render's new Web Service form use:

| Field | Value |
| --- | --- |
| Repository | Legacy1Q/gamingapp |
| Name | gameshq-preview (or another available name) |
| Language | Docker |
| Branch | backup/working-desktop |
| Root Directory | Leave empty — both projects are required |
| Dockerfile Path | ./Dockerfile |
| Docker Build Context | . |
| Compute | Free |
| Health Check Path | /health |
| Environment variable | Hosting__EdgeHttps = true |

Leave the Docker command override empty. Render supplies PORT and the container
uses it automatically. The root `render.yaml` records the same configuration
if using a Blueprint instead of the manual form. `Hosting__EdgeHttps` delegates
HTTPS redirection to Render's TLS edge; do not set it on an unprotected host.

This image explicitly enables `Preview__Ephemeral`: it applies migrations to a
fresh temporary SQLite database, seeds Z-Dasher, and keeps temporary keys under
`/tmp/gameshq`. No local player data is copied into the image. Restarting can
lose accounts, posts, scores, uploads, and sessions. Password recovery returns
a clear unavailable message because free Render blocks SMTP. The frontend
displays a test-deployment notice. Use disposable accounts and no real personal
data. The owner is unset; game uploads and moderation stay unavailable until
an owner is deliberately configured.

Before accepting real users, move the database, keys, and uploads to persistent
storage, disable Preview__Ephemeral, rebuild with the test banner disabled, and
configure real recovery delivery and the remaining launch protections below.
Upgrading the hosting plan alone does not change these preview settings.

Local checks without Docker:

```powershell
dotnet publish back-server/GamingApp.api/GamingApp.api.csproj -c Release -o .local/render-preview
$env:VITE_TEST_DEPLOYMENT = "true"
npm --prefix front-client run build
Copy-Item front-client/dist/* .local/render-preview/wwwroot -Recurse -Force
node scripts/check_render_preview.mjs
```

With Docker installed, build from the repository root using
`docker build -t gameshq-preview .`. Render is the first container build if
Docker is unavailable locally.

## Persistent production deployment (later)

The frontend requires Node.js 22 or later. The API requires the .NET 10 SDK
to build and a current .NET 10 ASP.NET Core runtime to run.

## Recommended initial layout

Host the React build at `https://games.example.com` and the API and Unity files
at `https://api.example.com`. Use subdomains of the same domain: the login
cookie uses SameSite=Lax, so unrelated frontend/API domains will not work
reliably with the current authentication setup.

The API already owns `/games` and `/play`. If using a single origin, configure
the reverse proxy carefully to distinguish frontend pages from API/game routes;
do not send all `/games` requests to React or all of them to the API.

## Frontend

Copy `front-client/.env.example` to `front-client/.env.production` and replace
the example API origin with the real HTTPS API origin. This value is public,
and Vite embeds it at build time; rebuild after changing it. Never put secrets
in VITE variables. Without an override, production uses the frontend origin;
development defaults to `http://localhost:5004`.

From `front-client`, run:

```text
npm ci
npm test
npm run lint
npm run build
```

Deploy `front-client/dist` as static files. Configure the frontend host to serve
`index.html` for frontend routes such as `/community/123` and `/reset-password`.
Do not use Vite's development server as the public server.

## API environment variables

Configure these in the hosting service, not committed configuration files:

```text
ASPNETCORE_ENVIRONMENT=Production
AllowedHosts=api.example.com
Cors__AllowedOrigins__0=https://games.example.com
ConnectionStrings__DefaultConnection=Data Source=/persistent/data/GamingAppDb.db
DataProtection__KeysPath=/persistent/private/keys
Owner__UserId=<the production owner's Identity account ID>
Recovery__FrontendUrl=https://games.example.com
Recovery__Delivery=Smtp
Recovery__Smtp__Host=<provider host>
Recovery__Smtp__Port=587
Recovery__Smtp__From=<verified sender>
Recovery__Smtp__Username=<provider username>
Recovery__Smtp__Password=<provider credential>
```

Paths above are Linux examples; use absolute paths suitable for your host.
Create the data directory and give the API service account write access.
Mount persistent storage for the SQLite database, private key directory, and
uploaded games under `wwwroot/play`. Back up all three and test restoration.
Keep keys outside `wwwroot`; restrict access to the service account and protect
the storage at rest. File persistence alone does not encrypt the key files.
Production refuses to start without `DataProtection__KeysPath`.

For a reverse proxy, set `ReverseProxy__KnownProxies__0` to its actual source IP
(additional entries use `__1`, etc.). Default framework loopback trust remains.
The proxy must forward X-Forwarded-For and X-Forwarded-Proto and terminate TLS.
Do not trust arbitrary internet clients as proxies. Configure the host's HTTPS
port/redirect handling as needed. HTTPS redirection now runs before static game
files, and production enables HSTS and generic exception responses.

Build and publish:

```text
dotnet publish back-server/GamingApp.api/GamingApp.api.csproj -c Release -o .local/publish
```

Apply existing EF migrations to the production database before accepting traffic.
Use a .NET 10-compatible dotnet-ef tool and the API project with the production
connection string. Migrations are not automatically applied on startup. Back up
before migrations; do not copy development accounts into production by accident.

`GET /health` is a basic process health check; it does not test database or email
availability. Test those separately, including registration, login, password
reset, game access, reviews, reports, and owner permissions. Restart/redeploy
and verify data, sessions, and unexpired reset links still work.

## Remaining before public registration

- Add registration/login/community/leaderboard abuse limits and email verification.
- Set up automated backups, error monitoring, and an account suspension process.
- Harden game archive uploads and leaderboard event validation.
- Add privacy information, community rules, and an account deletion process.
- Review the remaining npm development dependency advisories. Compatible updates
  have been applied; Tailwind 3's transitive tooling still needs a separately
  tested upgrade. Do not run `npm audit fix --force` without checking CSS changes.

This preparation does not deploy the app or establish that every public launch
requirement has been met.
