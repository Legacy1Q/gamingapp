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
    preserved_tables = ["AspNetUsers", "ForumTopics", "ForumReplies"]
    columns = {table: ','.join('"' + row[1] + '"' for row in source.execute(f'PRAGMA table_info("{table}")')) for table in preserved_tables}
    preserved = {table: source.execute(f'SELECT {columns[table]} FROM "{table}" ORDER BY Id').fetchall() for table in preserved_tables}

def migrate(path):
    result = subprocess.run([str(root / ".tools/dotnet-ef.exe"), "database", "update",
                    "--configuration", "AuthCheck", "--no-build", "--connection",
                    f"Data Source={path}"], cwd=project, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stdout + result.stderr)

migrate(test_db)
with sqlite3.connect(test_db) as db:
    assert db.execute("SELECT * FROM Games ORDER BY Id").fetchall() == original_games
    for table, rows in preserved.items():
        assert db.execute(f'SELECT {columns[table]} FROM "{table}" ORDER BY Id').fetchall() == rows

env = dict(os.environ, ASPNETCORE_ENVIRONMENT="Development",
           Recovery__Delivery="Preview", Recovery__PreviewDirectory=str(work / "mail"),
           Recovery__FrontendUrl="http://localhost:5173",
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

    game_paths = ["/games/z-dasher/index.html", "/games/z-dasher/"]
    for extension in ("*.loader.js", "*.framework.js", "*.data", "*.wasm"):
        matches = list((project / "wwwroot/games/z-dasher/Build").glob(extension))
        assert len(matches) == 1, extension
        game_paths.append("/games/z-dasher/Build/" + matches[0].name)
    assert request("/games")[0] == 200
    assert request("/leaderboards/z-dasher")[0] == 401
    assert request("/leaderboards/z-dasher/start", "POST", {"totalDeliveries": 5})[0] == 401
    review_game = original_games[0][0]
    review_path = f"/reviews/{review_game}"
    review_baseline = request(review_path)[1]
    assert request(review_path + "/mine", "PUT", {"rating": 5, "body": "Test"})[0] == 401
    assert request(review_path + "/mine", "DELETE")[0] == 401
    assert request("/forum/topics")[0] == 200
    assert request("/forum/reports")[0] == 401
    assert request("/forum/reports", "POST", {})[0] == 401
    assert request("/forum/topics/1", "PUT", {})[0] == 401
    assert request("/forum/replies/1", "PUT", {})[0] == 401
    assert request("/auth/profile", "POST", {"displayName": "Guest"})[0] == 401
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
    assert request("/auth/me")[1]["hasDisplayName"] is False
    public_name = "Player_" + uuid.uuid4().hex[:12]
    assert request("/auth/profile", "POST", {"displayName": public_name})[0] == 400
    for invalid in [" ", "ab", "x" * 31, "person@example.com", "<script>", "Player ABCD1234"]:
        assert request("/auth/profile", "POST", {"displayName": invalid}, csrf())[0] == 400
    assert request("/auth/profile", "POST", {"displayName": "  " + public_name + "  ", "userId": "spoofed"}, csrf())[0] == 204
    assert request("/auth/me")[1]["displayName"] == public_name
    assert request("/auth/me")[1]["hasDisplayName"] is True
    assert request(review_path + "/mine", "PUT", {"rating": 5, "body": "Test"})[0] == 400
    for invalid in [{"rating": 0, "body": "Test"}, {"rating": 6, "body": "Test"}, {"rating": 4, "body": " "}, {"rating": 4, "body": "x" * 2001}]:
        assert request(review_path + "/mine", "PUT", invalid, csrf())[0] == 400
    assert request("/reviews/2147483647/mine", "PUT", {"rating": 5, "body": "Test"}, csrf())[0] == 404
    assert request(review_path + "/mine", "PUT", {"rating": 5, "body": "<b>Great game</b>", "authorId": "spoofed"}, csrf())[0] == 204
    assert request(review_path + "/mine", "PUT", {"rating": 3, "body": "Updated review"}, csrf())[0] == 204
    ratings = request(review_path)[1]
    assert ratings["count"] == review_baseline["count"] + 1
    assert ratings["myReview"] == {"rating": 3, "body": "Updated review"}
    expected = ((review_baseline["average"] or 0) * review_baseline["count"] + 3) / ratings["count"]
    assert abs(ratings["average"] - expected) < 0.0001
    assert "authorId" not in json.dumps(ratings) and user["email"] not in json.dumps(ratings)
    assert ratings["items"][0]["author"] == public_name
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
    assert detail["canEdit"] and detail["replies"][0]["canEdit"]
    _, edit_topic, _ = request("/forum/topics", "POST", topic_input, csrf())
    edit_path = f'/forum/topics/{edit_topic["id"]}'
    _, edit_reply, _ = request(edit_path + "/replies", "POST", {"body": "Original reply"}, csrf())
    edit_reply_path = f'/forum/replies/{edit_reply["id"]}'
    assert request(edit_path, "PUT", topic_input)[0] == 400
    assert request(edit_reply_path, "PUT", {"body": "Edited"})[0] == 400
    assert request(edit_path, "PUT", {**topic_input, "title": " "}, csrf())[0] == 400
    assert request(edit_reply_path, "PUT", {"body": "x" * 4001}, csrf())[0] == 400
    assert request(edit_path, "PUT", {**topic_input, "title": "Edited title", "body": "Edited topic"}, csrf())[0] == 204
    assert request(edit_reply_path, "PUT", {"body": "Edited reply"}, csrf())[0] == 204
    changed = request(edit_path)[1]
    assert changed["updatedAt"] and changed["title"] == "Edited title"
    assert changed["replies"][0]["updatedAt"] and changed["replies"][0]["body"] == "Edited reply"
    report_topic = {"kind": "topic", "targetId": edit_topic["id"], "reason": "Test concern"}
    report_reply = {"kind": "reply", "targetId": edit_reply["id"], "reason": "Test reply concern"}
    assert request("/forum/reports", "POST", report_topic)[0] == 400
    assert request("/forum/reports", "POST", {**report_topic, "reason": " "}, csrf())[0] == 400
    assert request("/forum/reports", "POST", {**report_topic, "targetId": 2147483647}, csrf())[0] == 404
    assert request("/forum/reports", "POST", report_topic, csrf())[0] == 204
    assert request("/forum/reports", "POST", report_topic, csrf())[0] == 409
    assert request("/forum/reports", "POST", report_reply, csrf())[0] == 204
    assert request("/forum/reports")[0] == 403
    assert "reason" not in json.dumps(request(edit_path)[1])
    assert request(edit_path, "PUT", {**topic_input, "body": "Changed after report"}, csrf())[0] == 204
    with sqlite3.connect(test_db) as db:
        topic_report_id = db.execute("SELECT Id FROM ForumReports WHERE Kind='topic' AND TargetId=?", (edit_topic["id"],)).fetchone()[0]
        reply_report_id = db.execute("SELECT Id FROM ForumReports WHERE Kind='reply' AND TargetId=?", (edit_reply["id"],)).fetchone()[0]
    assert request(f"/forum/reports/{topic_report_id}/resolve", "POST", {"action": "dismiss"}, csrf())[0] == 403
    assert detail["body"] == topic_input["body"] and detail["total"] == 1 and detail["canDelete"]
    assert detail["author"] == public_name and detail["replies"][0]["author"] == public_name
    public_name += "New"
    assert request("/auth/profile", "POST", {"displayName": public_name}, csrf())[0] == 204
    assert request(topic_path)[1]["author"] == public_name
    assert request(topic_path)[1]["replies"][0]["author"] == public_name
    assert any(t["id"] == topic["id"] and t["author"] == public_name for t in request("/forum/topics")[1]["items"])
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
        assert "no-store" in headers.get("Cache-Control", "")
    assert request("/auth/logout", "POST", {}, None)[0] == 400
    assert request("/auth/logout", "POST", {}, csrf())[0] == 204
    assert request("/auth/me")[0] == 401
    for path in game_paths:
        assert game_file(path)[0] == 401, path
    assert request(review_path)[1]["myReview"] is None
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
    assert request(review_path)[1]["myReview"] is None
    assert request(review_path + "/mine", "DELETE", token=csrf())[0] == 404
    assert request(review_path + "/mine", "PUT", {"rating": 1, "body": "Second player"}, csrf())[0] == 204
    assert request(review_path)[1]["count"] == review_baseline["count"] + 2
    assert request(review_path + "/mine", "DELETE")[0] == 400
    assert request(review_path + "/mine", "DELETE", token=csrf())[0] == 204
    assert request(review_path)[1]["count"] == review_baseline["count"] + 1
    assert request("/auth/profile", "POST", {"displayName": public_name.lower()}, csrf())[0] == 409
    assert request("/auth/me")[1]["hasDisplayName"] is False
    assert request(topic_path, "DELETE", token=csrf())[0] == 403
    assert request(edit_path, "PUT", topic_input, csrf())[0] == 403
    assert request(edit_reply_path, "PUT", {"body": "Hijack"}, csrf())[0] == 403
    assert request("/auth/logout", "POST", {}, csrf())[0] == 204
    # Assign the test account a server-configured ID only in the isolated database.
    with sqlite3.connect(test_db) as db:
        db.execute("UPDATE AspNetUsers SET Id=? WHERE Email=?", ("integration-owner", owner["email"]))
    assert request("/auth/login", "POST", owner, csrf())[0] == 204
    assert request(edit_path, "PUT", topic_input, csrf())[0] == 403
    reports = request("/forum/reports")[1]
    # Fetch the relevant page if the source database already contains many reports.
    report_items = list(reports["items"])
    for report_page in range(2, (reports["total"] + 19) // 20 + 1):
        report_items.extend(request(f"/forum/reports?page={report_page}")[1]["items"])
    saved_report = next(r for r in report_items if r["id"] == topic_report_id)
    assert saved_report["bodySnapshot"] == "Edited topic"
    assert request(f"/forum/reports/{topic_report_id}/resolve", "POST", {"action": "dismiss"})[0] == 400
    assert request(f"/forum/reports/{reply_report_id}/resolve", "POST", {"action": "remove"}, csrf())[0] == 204
    assert request(edit_path)[1]["total"] == 0
    assert request(f"/forum/reports/{topic_report_id}/resolve", "POST", {"action": "dismiss"}, csrf())[0] == 204
    assert request(edit_path)[0] == 200
    assert request(f"/forum/reports/{topic_report_id}/resolve", "POST", {"action": "dismiss"}, csrf())[0] == 409
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
    assert request(f'/reviews/{created["id"]}/mine', "PUT", {"rating": 4, "body": "Cascade test"}, csrf())[0] == 204
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
        assert db.execute("SELECT COUNT(*) FROM GameReviews WHERE GameId=?", (created["id"],)).fetchone()[0] == 0
    with sqlite3.connect(test_db) as db:
        assert db.execute("SELECT * FROM Games ORDER BY Id").fetchall() == original_games
    print("PASS: anonymous/player mutations denied; owner create/update/delete allowed; owner CSRF and upload validation enforced.")
    print("PASS: forum posting, replies, validation, private author labels, anti-spoofing, author/owner deletion and cascade.")
    print("PASS: profiles require login/CSRF; validation, uniqueness, rename propagation and account isolation.")
    print("PASS: author-only edits, edit timestamps, report privacy/snapshots/duplicates, owner-only resolution and CSRF.")
    print("PASS: reviews require login/CSRF; validation, one-per-player updates, average, privacy, deletion and account isolation.")
    print("PASS: migration preserves games; registration, duplicate/weak rejection, password hashing,")
    print("login, HttpOnly cookie, session, logout, CSRF rejection, lockout, and CORS.")
    print("PASS: game files blocked before login/after logout; authenticated Unity assets served; library public.")
    leaderboard = "/leaderboards/z-dasher"
    assert request(leaderboard + "/start", "POST", {"totalDeliveries": 5})[0] == 400
    assert request(leaderboard + "/start", "POST", {"totalDeliveries": 4}, csrf())[0] == 400
    def start_run():
        status, result, _ = request(leaderboard + "/start", "POST", {"totalDeliveries": 5}, csrf())
        assert status == 200
        return leaderboard + "/runs/" + result["runId"] + "/event"
    def run_event(path, kind, completed=0):
        return request(path, "POST", {"kind": kind, "completed": completed, "elapsedMilliseconds": 1}, csrf())
    first_run = start_run()
    assert run_event(first_run, "finish")[0] == 400
    assert run_event(first_run, "delivery", 2)[0] == 400
    assert run_event(first_run, "delivery", 1)[0] == 200
    assert run_event(first_run, "delivery", 1)[0] == 400
    assert run_event(first_run, "fail")[0] == 200
    assert run_event(first_run, "finish")[0] == 409
    assert request(leaderboard)[1]["personalBest"] is None
    old_run = start_run()
    current_run = start_run()
    assert run_event(old_run, "delivery", 1)[0] == 404
    import datetime
    def age_run(seconds):
        stamp = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(seconds=seconds)).replace(tzinfo=None).isoformat()
        with sqlite3.connect(test_db) as db:
            db.execute("UPDATE LeaderboardRuns SET StartedAt=? WHERE UserId='integration-owner'", (stamp,))
    age_run(7201)
    assert run_event(current_run, "delivery", 1)[0] == 409
    current_run = start_run()
    age_run(20)
    for delivered in range(1, 6):
        assert run_event(current_run, "delivery", delivered)[0] == 200
    result = run_event(current_run, "finish")
    assert result[0] == 200 and result[1]["elapsedMilliseconds"] >= 20000
    best = request(leaderboard)[1]["personalBest"]["elapsedMilliseconds"]
    assert run_event(current_run, "finish")[1]["elapsedMilliseconds"] == best
    slower = start_run()
    age_run(40)
    for delivered in range(1, 6): run_event(slower, "delivery", delivered)
    assert run_event(slower, "finish")[0] == 200
    assert request(leaderboard)[1]["personalBest"]["elapsedMilliseconds"] == best
    faster = start_run()
    age_run(10)
    for delivered in range(1, 6): run_event(faster, "delivery", delivered)
    assert run_event(faster, "finish")[0] == 200
    assert request(leaderboard)[1]["personalBest"]["elapsedMilliseconds"] < best
    with sqlite3.connect(test_db) as db:
        best = db.execute("SELECT ElapsedMilliseconds FROM LeaderboardBests WHERE UserId='integration-owner'").fetchone()[0]
        other_id = db.execute("SELECT Id FROM AspNetUsers WHERE Email=?", (user["email"],)).fetchone()[0]
        db.execute("INSERT INTO LeaderboardBests (UserId,ElapsedMilliseconds,CompletedAt) VALUES (?,?,?)", (other_id, best, "2026-01-01T00:00:00"))
    board_result = request(leaderboard)[1]
    tied = [r for r in board_result["items"] if r["elapsedMilliseconds"] == best]
    assert len(tied) == 2 and tied[0]["rank"] == tied[1]["rank"]
    assert "userId" not in json.dumps(board_result) and "@" not in json.dumps(board_result)
    saved_browser = browser
    browser = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    stranger = {"email": uuid.uuid4().hex + "@example.com", "password": "Stranger-Test-842!"}
    assert request("/auth/register", "POST", stranger, csrf())[0] == 201
    assert request("/auth/login", "POST", stranger, csrf())[0] == 204
    assert run_event(faster, "finish")[0] == 404
    browser = saved_browser
    print("PASS: leaderboard eligibility, death/incomplete rejection, ordered events, expired/superseded runs, server timing, best-only ranking, ties and account isolation.")
    # Recovery uses a separate test account and isolated mail preview folder.
    assert request("/auth/logout", "POST", {}, csrf())[0] == 204
    recover = {"email": uuid.uuid4().hex + "@example.com", "password": "Recovery-Old-842!"}
    assert request("/auth/register", "POST", recover, csrf())[0] == 201
    assert request("/auth/login", "POST", recover, csrf())[0] == 204
    recover_id = request("/auth/me")[1]["id"]
    old_browser = browser
    browser = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    assert request("/auth/forgot-password", "POST", {"email": recover["email"]})[0] == 400
    known = request("/auth/forgot-password", "POST", {"email": recover["email"]}, csrf())
    unknown = request("/auth/forgot-password", "POST", {"email": "missing-" + recover["email"]}, csrf())
    assert known[:2] == unknown[:2] and known[0] == 200
    import urllib.parse
    for _ in range(100):
        messages = list((work / "mail").glob("*.txt")) if (work / "mail").exists() else []
        if messages:
            break
        time.sleep(0.05)
    assert len(messages) == 1
    mail_text = messages[0].read_text(encoding="utf-8")
    reset_link = next(line for line in mail_text.splitlines() if line.startswith("http://localhost:5173/reset-password#"))
    reset_values = urllib.parse.parse_qs(urllib.parse.urlsplit(reset_link).fragment)
    reset = {"userId": reset_values["userId"][0], "token": reset_values["token"][0], "password": "Recovery-New-842!"}
    assert reset["userId"] == recover_id
    assert request("/auth/reset-password", "POST", reset)[0] == 400
    assert request("/auth/reset-password", "POST", {**reset, "token": "invalid"}, csrf())[0] == 400
    assert request("/auth/reset-password", "POST", {**reset, "userId": "integration-owner"}, csrf())[0] == 400
    assert request("/auth/reset-password", "POST", {**reset, "password": "weak"}, csrf())[0] == 400
    with sqlite3.connect(test_db) as db:
        db.execute("UPDATE AspNetUsers SET LockoutEnd='2099-01-01 00:00:00+00:00', AccessFailedCount=5 WHERE Id=?", (recover_id,))
    assert request("/auth/reset-password", "POST", reset, csrf())[0] == 204
    assert request("/auth/reset-password", "POST", reset, csrf())[0] == 400
    try:
        old_browser.open(base + "/auth/me")
        raise AssertionError("Old login cookie survived password reset")
    except urllib.error.HTTPError as failure:
        assert failure.code == 401
    assert request("/auth/login", "POST", recover, csrf())[0] == 401
    assert request("/auth/login", "POST", {**recover, "password": reset["password"]}, csrf())[0] == 204
    for _ in range(21):
        limited = request("/auth/forgot-password", "POST", {"email": "nobody@example.com"}, csrf())[0]
        if limited == 429:
            break
    assert limited == 429
    print("PASS: recovery generic response, local delivery, invalid/cross-user/weak/replayed tokens, CSRF, password change, lockout clearing, old-session revocation and rate limiting.")
finally:
    process.terminate()
    process.wait(timeout=10)
    log.close()

if "--apply-migration" in sys.argv:
    backup = work / "before-migration.db"
    with sqlite3.connect(database) as source, sqlite3.connect(backup) as destination:
        source.backup(destination)
        before = source.execute("SELECT * FROM Games ORDER BY Id").fetchall()
        before_existing = {table: source.execute(f'SELECT {columns[table]} FROM "{table}" ORDER BY Id').fetchall() for table in preserved_tables}
    migrate(database)
    with sqlite3.connect(database) as db:
        assert db.execute("SELECT * FROM Games ORDER BY Id").fetchall() == before
        for table, rows in before_existing.items():
            assert db.execute(f'SELECT {columns[table]} FROM "{table}" ORDER BY Id').fetchall() == rows
    print("Applied migration; existing games unchanged. Backup:", backup)
