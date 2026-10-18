#!/usr/bin/env python3
"""Whitelist-only GitHub Pages artifact: never publish the whole repository."""
import shutil
from pathlib import Path
from validate_public_data import main as validate

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "_site"
def main():
    validate()
    if PUBLIC.exists():
        shutil.rmtree(PUBLIC)
    PUBLIC.mkdir()
    for name in ("index.html", ".nojekyll"):
        shutil.copy2(ROOT / name, PUBLIC / name)
    for name in ("assets", "data"):
        shutil.copytree(ROOT / name, PUBLIC / name)
    print("Whitelisted static site written to _site/")
if __name__=="__main__": main()
