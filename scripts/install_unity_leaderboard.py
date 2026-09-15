"""Install the reviewed Unity patch, preserving original files in .local."""
from pathlib import Path
import hashlib
import json
import shutil
import uuid

root = Path(__file__).resolve().parents[1]
target = Path("C:/Users/mdsim/Unity/Z-Dasher").resolve()
stage = root / ".local/unity-staging"
originals = json.loads((stage / "originals.json").read_text(encoding="utf-8-sig"))
for item in originals:
    path = Path(item["Path"]).resolve()
    assert path.is_relative_to(target)
    assert hashlib.sha256(path.read_bytes()).hexdigest().upper() == item["Hash"], f"Source changed: {path}"
files = list((stage / "Assets").rglob("*"))
files = [path for path in files if path.is_file()]
known = {Path(item["Path"]).resolve() for item in originals}
for path in files:
    destination = (target / path.relative_to(stage)).resolve()
    assert destination.is_relative_to(target)
    assert destination in known or not destination.exists(), f"New file already exists: {destination}"
backup = root / ".local" / ("unity-backup-" + uuid.uuid4().hex)
for path in files:
    relative = path.relative_to(stage)
    destination = target / relative
    if destination.exists():
        saved = backup / relative
        saved.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(destination, saved)
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, destination)
print(f"Installed {len(files)} source files. Original-file backup: {backup}")
