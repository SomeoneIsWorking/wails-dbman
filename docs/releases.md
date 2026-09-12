# Desktop releases

A major update is a release decision, not merely a version tag. Update
`docs/project-state.md` with the changed capabilities and evidence first. Set the app version in
`frontend/package.json` and its npm lockfile, then tag that source as `vMAJOR.MINOR.PATCH`. The tag
must match the source version; the release builder injects it into Wails package metadata and
checks the resulting Windows and macOS metadata before publication. The tag starts the release
workflow, which publishes only after all three desktop package jobs pass:
Windows x86-64 `.exe` in a ZIP, macOS arm64 `.app` in a ZIP, and Linux x86-64 `.AppImage`.
The initial GitHub Release is marked as a pre-release while platform signing and complete
database workflows remain unqualified. The ZIPs and AppImage contain the app, not database
credentials or data. Do not promote an unverified workflow artifact to a release manually.
Run the workflow manually on `main` first to verify all three hosted package jobs without
publishing; only a validated version tag enables the publish job.

After the GitHub Release succeeds, update this project's entry in `~/repo/pages` from the exact
project-state feature inventory and release URL, then verify and push Pages in the same release task.
The Pages repository owns the public listing. There is no cross-repository secret or automatic Pages
dispatch here, so a successful source release alone does not finish that task.

The current desktop release path has no Apple Developer ID signing/notarization or end-to-end
database qualification. Record those gaps in project state before describing a package as fully
qualified. Android and browser/WASM packages require platform implementations that are not part of
the current native desktop goal.
