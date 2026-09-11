# Player accounts: backend step

`GamingApp.api/Auth/PlayerAccounts.cs` contains the account setup and endpoints.
`Program.cs` registers those services and adds authentication before endpoint handling.
`AppDbContext` now inherits from `IdentityDbContext<IdentityUser>` so Entity Framework
knows about account tables as well as the existing Games table. The
`AddPlayerAccounts` migration adds Identity tables without changing Games.

## Request flow

1. GET `/auth/csrf` to receive a request token and its companion cookie.
2. POST `/auth/register` with JSON `{ "email": "...", "password": "..." }`
   and the `X-CSRF-TOKEN` header. Success is 201; registration does not log in.
3. POST `/auth/login` with the same JSON shape and header. Success is 204 and
   sets an HttpOnly session cookie. JavaScript cannot read that cookie.
4. GET `/auth/me` to get the signed-in account's `id` and `email`, or 401.
5. Fetch a fresh `/auth/csrf` token after logging in, since tokens are tied to
   the current identity. POST `/auth/logout` with that token to clear the cookie.
   Fetch a new token after logging out before another account action.

All frontend fetch calls must use `credentials: "include"` to send cookies to
the API on its separate port. CORS permits credentials only from the existing
`http://localhost:5173` frontend origin. No passwords or tokens belong in localStorage.

Passwords must be 10–128 characters with uppercase, lowercase, a digit and a
non-alphanumeric character. Identity hashes passwords; it never stores their
original text. Five failed password attempts lock the account for 15 minutes.

## Run and verify

From `back-server/GamingApp.api`, restart the API with:

```powershell
dotnet run --launch-profile http
```

The local database has already been migrated. Future checkouts can install the
matching migration tool from the repository root:

```powershell
dotnet tool install dotnet-ef --version 9.0.0 --tool-path .tools
```

Then, from `back-server/GamingApp.api`:

```powershell
../../.tools/dotnet-ef.exe database update
```

To run the repeatable integration check, build with `dotnet build -c AuthCheck`
in the API directory and run `python scripts/check_accounts.py` from the root.
The script tests a SQLite backup on a temporary local server; it does not create
test users in the real database. Its optional `--apply-migration` flag backs up
and migrates the real DB only after checks pass. Artifacts live in ignored `.local/`.

## Next steps

React registration/login forms and navbar login status are not connected yet.
Game files and existing game-management endpoints retain their previous access
behavior. Restricting gameplay and owner-only game management is a separate step;
simply hiding frontend buttons does not protect those server routes.

Email confirmation, password recovery, and production deployment configuration
are not included in this first local-development step. Production cookies require
HTTPS. The configurable `ConnectionStrings:DefaultConnection` overrides the
default `GamingAppDb.db` location when needed.
