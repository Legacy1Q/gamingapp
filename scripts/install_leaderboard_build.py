"""Install a compiled Unity export with a recoverable backup of the old build."""
from pathlib import Path
import shutil
import uuid

root = Path(__file__).resolve().parents[1]
source = root / ".local/z-dasher-leaderboard-build"
target = root / "back-server/GamingApp.api/wwwroot/games/z-dasher"
backup = root / ".local" / ("game-build-backup-" + uuid.uuid4().hex)
staging = target.with_name("z-dasher-next-" + uuid.uuid4().hex)
for path in (source, target, backup, staging):
    assert path.resolve().is_relative_to(root.resolve())
assert (source / "index.html").is_file()
for suffix in ("*.loader.js", "*.framework.js", "*.data", "*.wasm"):
    assert list((source / "Build").glob(suffix)), f"Missing Unity asset: {suffix}"
assert any("zDasherRankedRun" in path.read_text(encoding="utf-8") for path in (source / "Build").glob("*.framework.js"))
shutil.copytree(source, staging)
target.rename(backup)
try:
    staging.rename(target)
except Exception:
    backup.rename(target)
    raise
print("Updated game export:", target)
print("Previous build backup:", backup)
