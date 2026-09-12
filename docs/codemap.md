# Codemap

| Responsibility | Current owner and entry point | Dependency direction |
| --- | --- | --- |
| Desktop lifecycle and Wails bindings | `main.go`, `app.go` | Composes frontend and database services |
| Database connections and engine adapters | `pkg/adapters/`, `pkg/models/` | Backend uses adapters; frontend calls Wails bindings |
| Persisted workspace and SQL interface | `frontend/src/` | Frontend calls generated Wails bindings |
| Tagged desktop package verification | `.github/workflows/release.yml`, `tools/release.py`, `tools/package_appimage.py`, `packaging/windows-info.json`, `build/darwin/Info.plist` | Packaging consumes Wails build output; it does not own product behavior |
