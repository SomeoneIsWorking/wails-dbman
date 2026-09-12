"""Validate a release tag and package Wails desktop bundles."""

from __future__ import annotations

import argparse
import json
import os
import plistlib
import re
import shutil
import subprocess
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RELEASE = ROOT / "build" / "release"
PROJECT = ROOT / "wails.json"
FRONTEND_PACKAGE = ROOT / "frontend" / "package.json"
TAG_PATTERN = re.compile(r"v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"release: {message}")


def check_tag(tag: str) -> None:
    require(
        TAG_PATTERN.fullmatch(tag) is not None,
        f"tag must be a stable version like v1.2.3, received {tag!r}",
    )
    version = frontend_version()
    require(
        tag == f"v{version}",
        f"tag {tag} does not match frontend/package.json version {version}",
    )


def frontend_version() -> str:
    version = json.loads(FRONTEND_PACKAGE.read_text(encoding="utf-8")).get("version")
    require(
        isinstance(version, str) and TAG_PATTERN.fullmatch(f"v{version}") is not None,
        f"frontend/package.json has no stable version: {version!r}",
    )
    return version


def prepare_version(tag: str | None) -> None:
    if tag is not None:
        check_tag(tag)
    version = frontend_version()
    project = json.loads(PROJECT.read_text(encoding="utf-8"))
    project.setdefault("info", {})["productVersion"] = version
    PROJECT.write_text(json.dumps(project, indent=2) + "\n", encoding="utf-8")
    windows_resource = ROOT / "build" / "windows" / "info.json"
    windows_resource.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / "packaging" / "windows-info.json", windows_resource)
    print(f"release: Wails package version set to {version}")


def expected_version() -> str:
    version = frontend_version()
    project = json.loads(PROJECT.read_text(encoding="utf-8"))
    require(
        project.get("info", {}).get("productVersion") == version,
        "Wails build input version differs from frontend/package.json",
    )
    return version


def package_windows() -> None:
    version = expected_version()
    binary = ROOT / "build/bin/wails-dbman.exe"
    require(binary.is_file(), f"missing Wails Windows executable: {binary}")
    with binary.open("rb") as source:
        require(source.read(2) == b"MZ", f"not a PE executable: {binary}")
    metadata = subprocess.run(
        [
            "pwsh",
            "-NoProfile",
            "-Command",
            "(Get-Item -LiteralPath $env:DBMAN_RELEASE_BINARY).VersionInfo.ProductVersion",
        ],
        env=dict(os.environ, DBMAN_RELEASE_BINARY=str(binary)),
        text=True,
        capture_output=True,
        check=True,
    ).stdout.strip()
    windows_version = f"{version}.0"
    require(
        metadata == windows_version,
        f"Windows executable ProductVersion {metadata!r} differs from {windows_version!r}",
    )
    RELEASE.mkdir(parents=True, exist_ok=True)
    archive = RELEASE / "DBMan-windows-x86_64.zip"
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as output:
        output.write(binary, arcname="wails-dbman.exe")
    with zipfile.ZipFile(archive) as package:
        require(
            package.testzip() is None and package.namelist() == ["wails-dbman.exe"],
            f"invalid Windows release archive: {archive}",
        )
    print(f"release: verified {archive}")


def package_macos() -> None:
    version = expected_version()
    bundle = ROOT / "build/bin/wails-dbman.app"
    binary = bundle / "Contents/MacOS/wails-dbman"
    plist = bundle / "Contents/Info.plist"
    require(
        binary.is_file() and plist.is_file(), f"incomplete Wails macOS bundle: {bundle}"
    )
    with plist.open("rb") as source:
        info = plistlib.load(source)
    require(
        info.get("CFBundleExecutable") == "wails-dbman",
        "macOS bundle executable does not match Wails output",
    )
    require(
        info.get("CFBundleVersion") == version
        and info.get("CFBundleShortVersionString") == version,
        f"macOS app version differs from {version!r}",
    )
    RELEASE.mkdir(parents=True, exist_ok=True)
    archive = RELEASE / "DBMan-macos-arm64.zip"
    subprocess.run(
        [
            "ditto",
            "-c",
            "-k",
            "--sequesterRsrc",
            "--keepParent",
            str(bundle),
            str(archive),
        ],
        check=True,
    )
    verification = RELEASE / "verify-macos"
    if verification.exists():
        require(
            RELEASE.resolve() in verification.resolve().parents,
            "unsafe macOS verification cleanup path",
        )
        shutil.rmtree(verification)
    verification.mkdir()
    subprocess.run(["ditto", "-x", "-k", str(archive), str(verification)], check=True)
    require(
        (verification / "wails-dbman.app/Contents/MacOS/wails-dbman").is_file(),
        f"macOS archive lost the app executable: {archive}",
    )
    print(f"release: verified {archive}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "platform", choices=("check-tag", "prepare-version", "windows", "macos")
    )
    parser.add_argument("--tag")
    arguments = parser.parse_args()
    if arguments.platform == "check-tag":
        require(arguments.tag is not None, "check-tag requires --tag")
        check_tag(arguments.tag)
    elif arguments.platform == "prepare-version":
        prepare_version(arguments.tag or None)
    elif arguments.platform == "windows":
        package_windows()
    elif arguments.platform == "macos":
        package_macos()


if __name__ == "__main__":
    main()
