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
           Owner__UserId="integration-owner",
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
        payload = json.dumps(data).encode() if data is not None else None
        if path.endswith("/upload"):
            headers["Content-Type"] = "multipart/form-data; boundary=test-boundary"
            payload = b'--test-boundary\r\nContent-Disposition: form-data; name="file"; filename="test.zip"\r\nContent-Type: application/zip\r\n\r\ntest\r\n--test-boundary--\r\n'
        req = urllib.request.Request(base + path, method=method, headers=headers, data=payload)
        try:
            response = browser.open(req)
        except urllib.error.HTTPError as error:
            response = error
        body = response.read()
        return response.status, json.loads(body) if body else None, response.headers

    def csrf():
        return request("/auth/csrf")[1]["token"]

    def game_file(path):
        req = urllib.request.Request(base + path, headers={"Range": "bytes=0-15"})
        try:
            response = browser.open(req)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            return response.status, response.headers

    game_paths = ["/games/z-dasher/index.html", "/games/z-dasher/",
                  "/games/z-dasher/Build/Downloads.loader.js",
                  "/games/z-dasher/Build/Downloads.data",
                  "/games/z-dasher/Build/Downloads.wasm"]
    assert request("/games")[0] == 200
    assert request("/forum/topics")[0] == 200
    assert request("/forum/topics", "POST", {})[0] == 401
    assert request("/forum/topics/1/replies", "POST", {})[0] == 401
    mutations = [("/games", "POST"), ("/games/1", "PUT"), ("/games/1", "DELETE"), ("/games/1/upload", "POST")]
    for path, method in mutations:
        assert request(path, method, {})[0] == 401
    for path in game_paths + ["/play/example/index.html", "/GAMES/z-dasher/index.html", "/%67ames/z-dasher/index.html"]:
        assert game_file(path)[0] == 401, path

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
    topic_input = {"title": "Test feedback", "category": "Feedback", "body": "<script>not executed</script>", "authorId": "spoofed"}
    assert request("/forum/topics", "POST", topic_input)[0] == 400
    assert request("/forum/topics", "POST", {**topic_input, "title": " "}, csrf())[0] == 400
    assert request("/forum/topics", "POST", {**topic_input, "category": "invalid"}, csrf())[0] == 400
    assert request("/forum/topics", "POST", {**topic_input, "body": "x" * 4001}, csrf())[0] == 400
    status, topic, _ = request("/forum/topics", "POST", topic_input, csrf())
    assert status == 201
    topic_path = f'/forum/topics/{topic["id"]}'
    assert request(topic_path + "/replies", "POST", {"body": "A reply"}, csrf())[0] == 200
    assert request(topic_path + "/replies", "POST", {"body": " "}, csrf())[0] == 400
    detail = request(topic_path)[1]
    assert detail["body"] == topic_input["body"] and detail["total"] == 1 and detail["canDelete"]
    assert "@" not in json.dumps(detail) and "authorId" not in detail
    with sqlite3.connect(test_db) as db:
        author_id = db.execute("SELECT AuthorId FROM ForumTopics WHERE Id=?", (topic["id"],)).fetchone()[0]
        assert author_id == db.execute("SELECT Id FROM AspNetUsers WHERE Email=?", (user["email"],)).fetchone()[0]
    _, own_topic, _ = request("/forum/topics", "POST", topic_input, csrf())
    assert request(f'/forum/topics/{own_topic["id"]}', "DELETE", token=csrf())[0] == 204
    for path, method in mutations:
        outcome = request(path, method, {}, csrf())
        assert outcome[0] == 403, (path, method, outcome[:2])
    for path in game_paths:
        status, headers = game_file(path)
        assert status in (200, 206), (path, status)
        assert headers.get("Cache-Control") == "no-store"
    assert request("/auth/logout", "POST", {}, None)[0] == 400
    assert request("/auth/logout", "POST", {}, csrf())[0] == 204
    assert request("/auth/me")[0] == 401
    for path in game_paths:
        assert game_file(path)[0] == 401, path
    token = csrf()
    for _ in range(5):
        assert request("/auth/login", "POST", {**user, "password": "Wrong-Password-842!"}, token)[0] == 401
    assert request("/auth/login", "POST", user, token)[0] == 401
    _, _, headers = request("/auth/csrf", extra={"Origin": "http://localhost:5173"})
    assert headers.get("Access-Control-Allow-Credentials") == "true"
    _, _, headers = request("/auth/csrf", extra={"Origin": "https://untrusted.example"})
    assert headers.get("Access-Control-Allow-Origin") is None
    owner = {"email": uuid.uuid4().hex + "@example.com", "password": "Owner-Test-842!"}
    assert request("/auth/register", "POST", owner, csrf())[0] == 201
    assert request("/auth/login", "POST", owner, csrf())[0] == 204
    assert request(topic_path, "DELETE", token=csrf())[0] == 403
    assert request("/auth/logout", "POST", {}, csrf())[0] == 204
    # Assign the test account a server-configured ID only in the isolated database.
    with sqlite3.connect(test_db) as db:
        db.execute("UPDATE AspNetUsers SET Id=? WHERE Email=?", ("integration-owner", owner["email"]))
    assert request("/auth/login", "POST", owner, csrf())[0] == 204
    assert request(topic_path, "DELETE")[0] == 400
    assert request(topic_path, "DELETE", token=csrf())[0] == 204
    assert request(topic_path)[0] == 404
    with sqlite3.connect(test_db) as db:
        assert db.execute("SELECT COUNT(*) FROM ForumReplies WHERE ForumTopicId=?", (topic["id"],)).fetchone()[0] == 0
    game = {"title": "Owner test", "genre": "Test", "description": "Test", "developerName": "Test", "playUrl": ""}
    assert request("/games", "POST", game)[0] == 400
    status, created, _ = request("/games", "POST", game, csrf())
    assert status == 201
    game_path = f'/games/{created["id"]}'
    assert request(game_path, "PUT", game)[0] == 400
    assert request(game_path, "DELETE")[0] == 400
    assert request(game_path, "PUT", {**game, "title": "Updated"}, csrf())[0] == 200
    # Exercise multipart upload authorization/CSRF without writing any game files.
    boundary = "account-test-boundary"
    payload = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.txt"\r\n'
               'Content-Type: text/plain\r\n\r\nnot-a-zip\r\n' + f'--{boundary}--\r\n').encode()
    req = urllib.request.Request(base + game_path + "/upload", data=payload,
          headers={"Content-Type": f"multipart/form-data; boundary={boundary}", "X-CSRF-TOKEN": csrf()})
    try:
        browser.open(req)
        raise AssertionError("Invalid upload accepted")
    except urllib.error.HTTPError as error:
        assert error.code == 400 and b"Only .zip files" in error.read()
    assert request(game_path, "DELETE", token=csrf())[0] == 204
    with sqlite3.connect(test_db) as db:
        assert db.execute("SELECT * FROM Games ORDER BY Id").fetchall() == original_games
    print("PASS: anonymous/player mutations denied; owner create/update/delete allowed; owner CSRF and upload validation enforced.")
    print("PASS: forum posting, replies, validation, private author labels, anti-spoofing, author/owner deletion and cascade.")
    print("PASS: migration preserves games; registration, duplicate/weak rejection, password hashing,")
    print("login, HttpOnly cookie, session, logout, CSRF rejection, lockout, and CORS.")
    print("PASS: game files blocked before login/after logout; authenticated Unity assets served; library public.")
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
