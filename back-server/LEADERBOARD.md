# Z-Dasher leaderboard

The leaderboard is at `/leaderboard` in React. Login is required to read rankings
and submit runs. Public display names are shown, never account email addresses.
Each player has one best time; lower times rank higher, and exact ties share rank.

## Recording a run

The Unity source project is `C:/Users/mdsim/Unity/Z-Dasher`. Its GameManager starts
a server run before unpausing gameplay, OrderManager reports each delivery, and
the loss/win events report failure or completion. The build currently requires
five deliveries, matching Map_Test_01. Retry reloads the scene and starts a new run.
A later run on the same account supersedes an earlier unfinished run.

`ZDasherLeaderboard.jslib` sends same-origin requests with login cookies and CSRF
tokens. Events are queued so deliveries arrive before completion. Errors stop
ranking that run. The game displays connection, practice, and saved-time status.
Unity Editor play mode is practice only; ranked play uses the hosted WebGL build.

The server timestamps start and finish; it rejects incomplete, failed, expired,
wrong-account, and superseded runs. Runs expire after two hours. Network delays,
pauses, and background-tab time count toward the official server time. The live
in-game timer is approximate; the saved finish message is the official time.

This is a casual, client-reported leaderboard. The server validates the event
sequence but does not simulate Unity physics or prove a player did not manipulate
the client. It is not suitable for prizes or competitive anti-cheat guarantees.
Downloaded games already in progress are not remotely stopped by logout.

## Updated export and validation

The rebuilt game is installed in `GamingApp.api/wwwroot/games/z-dasher`. Previous
game exports and original Unity source files are backed up under the repository's
ignored `.local` folder. Unity build logs are at `.local/unity-leaderboard-build.log`.

For a new build, the Unity editor method `GameHubWebBuild.Build` reads the output
directory from `GAMEHUB_BUILD_OUTPUT`; export to a staging folder first. It uses
enabled build scenes and uncompressed assets compatible with the .NET static-file
configuration. After verifying the export, install it with the backup-preserving
`scripts/install_leaderboard_build.py` helper (which expects the staging folder
`.local/z-dasher-leaderboard-build`).

Build the API with `dotnet build -c AuthCheck`, then run
`python scripts/check_accounts.py` to check run eligibility, elapsed timing,
best-only scores, ties, privacy, and account isolation on an isolated database.
`node --test scripts/check_unity_bridge.mjs` checks event ordering and connection
failure behavior. It reads the installed Unity plugin without making network calls.
