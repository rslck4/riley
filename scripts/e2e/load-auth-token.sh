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

if [[ -n "${E2E_AUTH_TOKEN:-}" ]]; then
  export E2E_AUTH_TOKEN
  exit 0
fi

KEYCHAIN_SERVICE="openclaw-e2e"
KEYCHAIN_ACCOUNT="gateway-token"

if command -v security >/dev/null 2>&1; then
  token="$(security find-generic-password -s "$KEYCHAIN_SERVICE" -a "$KEYCHAIN_ACCOUNT" -w 2>/dev/null || true)"
  if [[ -n "$token" ]]; then
    export E2E_AUTH_TOKEN="$token"
    exit 0
  fi
fi

SECRETS_FILE="$REPO_ROOT/.secrets/e2e.env"
if [[ -f "$SECRETS_FILE" ]]; then
  token_line="$(grep -E '^E2E_AUTH_TOKEN=' "$SECRETS_FILE" | tail -n 1 || true)"
  if [[ -n "$token_line" ]]; then
    token_value="${token_line#E2E_AUTH_TOKEN=}"
    if [[ -n "$token_value" ]]; then
      export E2E_AUTH_TOKEN="$token_value"
      exit 0
    fi
  fi
fi

cat <<'ERR'
ERROR: Missing E2E_AUTH_TOKEN for hands-free onboarding.

Set one of these non-interactive secret sources, then rerun:

1) macOS Keychain (preferred)
   security add-generic-password -U -s openclaw-e2e -a gateway-token -w '<TOKEN>'

2) Local untracked file
   mkdir -p .secrets
   printf 'E2E_AUTH_TOKEN=<TOKEN>\n' > .secrets/e2e.env

3) CI
   Set GitHub Actions secret: E2E_AUTH_TOKEN
ERR

exit 1
