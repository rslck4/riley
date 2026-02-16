#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HOSTNAME_NOW="$(hostname 2>/dev/null || true)"

if [[ "$HOSTNAME_NOW" == doghouse* ]]; then
  case "$REPO_ROOT" in
    "/Volumes/Samsung T7/Codex/"*|"/Volumes/Samsung T7/Codex") ;;
    *)
      echo "ERROR: On doghouse, repo path must stay under /Volumes/Samsung T7/Codex/."
      echo "Current repo: $REPO_ROOT"
      exit 1
      ;;
  esac
fi

source "$REPO_ROOT/scripts/e2e/load-auth-token.sh"

cleanup() {
  "$REPO_ROOT/scripts/e2e/server.sh" stop >/dev/null 2>&1 || true
}
trap cleanup EXIT

E2E_MODE=1 E2E_AUTO_APPROVE_PAIRING=1 "$REPO_ROOT/scripts/e2e/server.sh" start

E2E_MODE=1 \
E2E_AUTO_APPROVE_PAIRING=1 \
E2E_AUTH_TOKEN="$E2E_AUTH_TOKEN" \
E2E_UI_BASE_URL="${E2E_UI_BASE_URL:-http://127.0.0.1:18789/}" \
pnpm --dir "$REPO_ROOT/ui" test:e2e:smoke
