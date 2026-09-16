"""Preserve every conflict stage plus the working database before resolving index entries."""
from pathlib import Path
import subprocess
import shutil
import sqlite3
import uuid
import json

root = Path(__file__).resolve().parents[1]
backup = root / ".local" / ("merge-backup-" + uuid.uuid4().hex)
backup.mkdir(parents=True)
def git(*args):
    return subprocess.check_output(["git", *args], cwd=root)

entries = git("ls-files", "-u", "-z").split(b"\0")
manifest = []
for entry in entries:
    if not entry:
        continue
    meta, filename = entry.split(b"\t", 1)
    mode, blob, stage = meta.decode().split()
    relative = filename.decode()
    destination = backup / ("stage-" + stage) / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(git("cat-file", "blob", blob))
    manifest.append({"file": relative, "stage": stage, "blob": blob})
shutil.copy2(root / ".git/index", backup / "git-index")
(backup / "working.patch").write_bytes(git("diff", "--binary"))
(backup / "staged.patch").write_bytes(git("diff", "--cached", "--binary"))
(backup / "manifest.json").write_text(json.dumps(manifest, indent=2))
database = root / "back-server/GamingApp.api/GamingAppDb.db"
for path in database.parent.glob("GamingAppDb.db*"):
    shutil.copy2(path, backup / ("working-" + path.name))
with sqlite3.connect(database.as_uri() + "?mode=ro", uri=True) as source, sqlite3.connect(backup / "working-consistent.db") as destination:
    source.backup(destination)
    assert destination.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
print("Conflict and database backup:", backup)
print("Saved conflict stages:", len(manifest))
