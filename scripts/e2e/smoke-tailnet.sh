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

E2E_AUTH_TOKEN="$E2E_AUTH_TOKEN" \
E2E_UI_BASE_URL="${E2E_UI_BASE_URL:-https://doghouse.tail8dfdc0.ts.net/}" \
E2E_GATEWAY_URL="${E2E_GATEWAY_URL:-wss://doghouse.tail8dfdc0.ts.net}" \
pnpm --dir "$REPO_ROOT/ui" test:e2e:smoke
