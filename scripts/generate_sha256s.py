"""Regenerate SHA256SUMS.txt from the exact bytes staged in Git."""

from __future__ import annotations

import hashlib
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "SHA256SUMS.txt"


def git_output(*args: str) -> bytes:
    completed = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        check=True,
        stdout=subprocess.PIPE,
    )
    return completed.stdout


def main() -> None:
    paths = sorted(
        path
        for path in git_output("ls-files", "-z").decode("utf-8").split("\0")
        if path and path != OUTPUT.name
    )
    lines = []
    for path in paths:
        digest = hashlib.sha256(git_output("show", f":{path}")).hexdigest()
        lines.append(f"{digest}  {path}")

    with OUTPUT.open("w", encoding="utf-8", newline="\n") as stream:
        stream.write("\n".join(lines) + "\n")
    print(f"Wrote {len(lines)} staged-file checksums to {OUTPUT.name}")


if __name__ == "__main__":
    main()
