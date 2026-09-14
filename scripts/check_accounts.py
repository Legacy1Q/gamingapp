"""Integration check using a SQLite backup; never registers users in the real DB.

Run after building the API with configuration AuthCheck. Pass --apply-migration
to back up and migrate the real database after every check passes.
"""
import http.cookiejar
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid

root = Path(__file__).resolve().parents[1]
project = root / "back-server/GamingApp.api"
work = root / ".local" / ("accounts-" + uuid.uuid4().hex)
work.mkdir(parents=True)
database = project / "GamingAppDb.db"
test_db = work / "test.db"
with sqlite3.connect(database) as source, sqlite3.connect(test_db) as destination:
    source.backup(destination)
    original_games = source.execute("SELECT * FROM Games ORDER BY Id").fetchall()

def migrate(path):
    result = subprocess.run([str(root / ".tools/dotnet-ef.exe"), "database", "update",
                    "--configuration", "AuthCheck", "--no-build", "--connection",
                    f"Data Source={path}"], cwd=project, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stdout + result.stderr)

migrate(test_db)
with sqlite3.connect(test_db) as db:
    assert db.execute("SELECT * FROM Games ORDER BY Id").fetchall() == original_games

env = dict(os.environ, ASPNETCORE_ENVIRONMENT="Development",
           ASPNETCORE_URLS="http://127.0.0.1:0",
           ConnectionStrings__DefaultConnection=f"Data Source={test_db}")
log = open(work / "server.log", "w")
process = subprocess.Popen(["dotnet", str(project / "bin/AuthCheck/net9.0/GamingApp.api.dll")],
                           cwd=project, env=env, stdout=log, stderr=log,
                           creationflags=subprocess.CREATE_NO_WINDOW)
try:
    import re
    for _ in range(100):
        text = (work / "server.log").read_text()
        match = re.search(r"Now listening on: (http://127\.0\.0\.1:\d+)", text)
        if match:
            base = match.group(1)
            break
        if process.poll() is not None:
            raise RuntimeError("API failed to start; inspect " + str(work / "server.log"))
        time.sleep(0.1)
    else:
        raise RuntimeError("API startup timeout")

    browser = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    def request(path, method="GET", data=None, token=None, extra=None):
        headers = {"Content-Type": "application/json", **(extra or {})}
        if token:
            headers["X-CSRF-TOKEN"] = token
        req = urllib.request.Request(base + path, method=method, headers=headers,
                                     data=json.dumps(data).encode() if data is not None else None)
        try:
            response = browser.open(req)
        except urllib.error.HTTPError as error:
            response = error
        body = response.read()
        return response.status, json.loads(body) if body else None, response.headers

    def csrf():
        return request("/auth/csrf")[1]["token"]

    user = {"email": uuid.uuid4().hex + "@example.com", "password": "Example-Test-842!"}
    assert request("/auth/me")[0] == 401
    assert request("/auth/register", "POST", user)[0] == 400
    token = csrf()
    assert request("/auth/register", "POST", {**user, "password": "weak"}, token)[0] == 400
    assert request("/auth/register", "POST", user, token)[0] == 201
    assert request("/auth/register", "POST", user, token)[0] == 400
    with sqlite3.connect(test_db) as db:
        saved_hash = db.execute("SELECT PasswordHash FROM AspNetUsers WHERE Email=?", (user["email"],)).fetchone()[0]
        assert saved_hash and saved_hash != user["password"]
    assert request("/auth/login", "POST", {**user, "password": "Wrong-Password-842!"}, token)[0] == 401
    status, _, headers = request("/auth/login", "POST", user, token)
    assert status == 204 and "httponly" in headers.get("Set-Cookie", "").lower()
    assert request("/auth/me")[1]["email"] == user["email"]
    assert request("/auth/logout", "POST", {}, None)[0] == 400
    assert request("/auth/logout", "POST", {}, csrf())[0] == 204
    assert request("/auth/me")[0] == 401
    token = csrf()
    for _ in range(5):
        assert request("/auth/login", "POST", {**user, "password": "Wrong-Password-842!"}, token)[0] == 401
    assert request("/auth/login", "POST", user, token)[0] == 401
    _, _, headers = request("/auth/csrf", extra={"Origin": "http://localhost:5173"})
    assert headers.get("Access-Control-Allow-Credentials") == "true"
    _, _, headers = request("/auth/csrf", extra={"Origin": "https://untrusted.example"})
    assert headers.get("Access-Control-Allow-Origin") is None
    print("PASS: migration preserves games; registration, duplicate/weak rejection, password hashing,")
    print("login, HttpOnly cookie, session, logout, CSRF rejection, lockout, and CORS.")
finally:
    process.terminate()
    process.wait(timeout=10)
    log.close()

if "--apply-migration" in sys.argv:
    backup = work / "before-migration.db"
    with sqlite3.connect(database) as source, sqlite3.connect(backup) as destination:
        source.backup(destination)
        before = source.execute("SELECT * FROM Games ORDER BY Id").fetchall()
    migrate(database)
    with sqlite3.connect(database) as db:
        assert db.execute("SELECT * FROM Games ORDER BY Id").fetchall() == before
    print("Applied migration; existing games unchanged. Backup:", backup)
