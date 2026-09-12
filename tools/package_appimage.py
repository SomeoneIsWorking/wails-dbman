"""Build and inspect DBMan's Linux AppImage from a native Wails binary."""

from __future__ import annotations

import hashlib
import os
import platform
import shutil
import subprocess
import tarfile
import urllib.request
from pathlib import Path

from release import expected_version

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"
APPDIR = BUILD / "appimage" / "AppDir"
TOOLS = BUILD / "tools"
RELEASE = BUILD / "release"
TEMP = BUILD / "appimage" / "temp"
LINUXDEPLOY = (
    "https://github.com/linuxdeploy/linuxdeploy/releases/download/1-alpha-20251107-1/linuxdeploy-x86_64.AppImage",
    "c20cd71e3a4e3b80c3483cef793cda3f4e990aca14014d23c544ca3ce1270b4d",
)
APPIMAGETOOL = (
    "https://github.com/AppImage/appimagetool/releases/download/1.9.1/appimagetool-x86_64.AppImage",
    "ed4ce84f0d9caff66f50bcca6ff6f35aae54ce8135408b3fa33abfc3cb384eb0",
)
PATCHELF = (
    "https://github.com/NixOS/patchelf/releases/download/0.19.1/patchelf-0.19.1-x86_64.tar.gz",
    "a6818fef80128fb354423234ecacdcca3e993913d774e5d8346bc63f70fed4cf",
)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"appimage: {message}")


def verified_tool(name: str, source: tuple[str, str]) -> Path:
    path = TOOLS / name
    TOOLS.mkdir(parents=True, exist_ok=True)
    if not path.is_file():
        with (
            urllib.request.urlopen(source[0], timeout=120) as response,
            path.open("wb") as output,
        ):
            shutil.copyfileobj(response, output)
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    require(digest == source[1], f"{name} SHA-256 mismatch: {digest}")
    path.chmod(0o755)
    return path


def stage_appdir(binary: Path) -> None:
    require(binary.is_file(), f"missing Wails binary: {binary}")
    with binary.open("rb") as executable_file:
        require(
            executable_file.read(4) == b"\x7fELF", f"not an ELF executable: {binary}"
        )
    require((ROOT / "packaging/appicon-512.png").is_file(), "missing app icon")
    if APPDIR.exists():
        require(
            BUILD.resolve() in APPDIR.resolve().parents, "unsafe AppDir cleanup path"
        )
        shutil.rmtree(APPDIR)
    executable = APPDIR / "usr/bin/wails-dbman"
    desktop = APPDIR / "usr/share/applications/wails-dbman.desktop"
    icon = APPDIR / "usr/share/icons/hicolor/512x512/apps/wails-dbman.png"
    for path in (executable, desktop, icon):
        path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(binary, executable)
    shutil.copy2(ROOT / "packaging/appicon-512.png", icon)
    desktop.write_text(
        "[Desktop Entry]\nType=Application\nName=DBMan\n"
        "Exec=wails-dbman\nIcon=wails-dbman\n"
        "Categories=Development;Database;\nTerminal=false\n",
        encoding="utf-8",
    )


def patched_linuxdeploy(linuxdeploy: Path) -> Path:
    """Replace linuxdeploy's old ELF rewriter before it changes the binary."""
    archive = verified_tool("patchelf-0.19.1-x86_64.tar.gz", PATCHELF)
    patcher = TOOLS / "patchelf"
    with tarfile.open(archive, "r:gz") as contents:
        source = contents.extractfile("./bin/patchelf")
        require(source is not None, "pinned patchelf archive lacks bin/patchelf")
        with patcher.open("wb") as output:
            shutil.copyfileobj(source, output)
    patcher.chmod(0o755)
    version = subprocess.run(
        [str(patcher), "--version"], check=True, capture_output=True, text=True
    ).stdout.strip()
    require(version == "patchelf 0.19.1", f"unexpected patchelf version: {version}")

    directory = BUILD / "appimage" / "deployer"
    if directory.exists():
        require(
            BUILD.resolve() in directory.resolve().parents,
            "unsafe deployer cleanup path",
        )
        shutil.rmtree(directory)
    directory.mkdir(parents=True)
    subprocess.run(
        [str(linuxdeploy), "--appimage-extract"],
        cwd=directory,
        check=True,
        stdout=subprocess.DEVNULL,
    )
    root = directory / "squashfs-root"
    launcher = root / "AppRun"
    bundled_patcher = root / "usr/bin/patchelf"
    require(
        launcher.is_file() and bundled_patcher.is_file(),
        "linuxdeploy extraction lacks its launcher or patchelf",
    )
    shutil.copy2(patcher, bundled_patcher)
    bundled_patcher.chmod(0o755)
    return launcher


def verify_package(package: Path) -> None:
    require(
        package.is_file() and package.stat().st_size > 100_000,
        f"missing or empty AppImage: {package}",
    )
    extraction = BUILD / "appimage" / "verify"
    if extraction.exists():
        require(
            BUILD.resolve() in extraction.resolve().parents,
            "unsafe extraction cleanup path",
        )
        shutil.rmtree(extraction)
    extraction.mkdir(parents=True)
    subprocess.run(
        [str(package), "--appimage-extract"],
        cwd=extraction,
        check=True,
        stdout=subprocess.DEVNULL,
    )
    payload = extraction / "squashfs-root"
    require((payload / "AppRun").is_file(), "AppImage has no AppRun")
    require((payload / "usr/bin/wails-dbman").is_file(), "AppImage has no Wails binary")
    require(
        (payload / "usr/share/applications/wails-dbman.desktop").is_file(),
        "AppImage has no desktop entry",
    )
    require(
        shutil.which("xvfb-run") is not None and shutil.which("timeout") is not None,
        "xvfb-run and timeout are required for the packaged launch check",
    )
    smoke = subprocess.run(
        [
            "timeout",
            "8s",
            "xvfb-run",
            "-a",
            "-s",
            "-screen 0 1280x720x24",
            str(package),
        ],
        env=dict(
            os.environ,
            APPIMAGE_EXTRACT_AND_RUN="1",
            TMPDIR=str(TEMP),
            XDG_CONFIG_HOME=str(BUILD / "appimage" / "smoke-config"),
        ),
        text=True,
        capture_output=True,
        check=False,
    )
    require(
        smoke.returncode == 124,
        f"packaged app exited during launch smoke (exit {smoke.returncode}): "
        f"{(smoke.stderr or smoke.stdout).strip()}",
    )


def main() -> None:
    require(
        platform.system() == "Linux" and platform.machine() == "x86_64",
        "this packager supports Linux x86_64 only",
    )
    binary = BUILD / "bin/wails-dbman"
    version = expected_version()
    stage_appdir(binary)
    TEMP.mkdir(parents=True, exist_ok=True)
    linuxdeploy = verified_tool("linuxdeploy-x86_64.AppImage", LINUXDEPLOY)
    appimagetool = verified_tool("appimagetool-x86_64.AppImage", APPIMAGETOOL)
    environment = dict(
        os.environ,
        APPIMAGE_EXTRACT_AND_RUN="1",
        NO_STRIP="1",
        ARCH="x86_64",
        VERSION=version,
        TMPDIR=str(TEMP),
    )
    deployer = patched_linuxdeploy(linuxdeploy)
    subprocess.run(
        [
            str(deployer),
            "--appdir",
            str(APPDIR),
            "--executable",
            str(APPDIR / "usr/bin/wails-dbman"),
            "--desktop-file",
            str(APPDIR / "usr/share/applications/wails-dbman.desktop"),
            "--icon-file",
            str(APPDIR / "usr/share/icons/hicolor/512x512/apps/wails-dbman.png"),
        ],
        env=environment,
        check=True,
    )
    RELEASE.mkdir(parents=True, exist_ok=True)
    package = RELEASE / "DBMan-linux-x86_64.AppImage"
    if package.exists():
        package.unlink()
    subprocess.run(
        [str(appimagetool), str(APPDIR), str(package)], env=environment, check=True
    )
    verify_package(package)
    print(f"appimage: verified {package} ({package.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
