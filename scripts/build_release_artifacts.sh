#!/usr/bin/env bash
# No shell tracing: signing passwords are inherited only through the environment.
set +x
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
exec python3 scripts/release_tools.py build "$@"
