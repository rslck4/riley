#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PID_FILE="$REPO_ROOT/.tmp/e2e-gateway.pid"
LOG_FILE="$REPO_ROOT/.tmp/e2e-gateway.log"
HOSTNAME_NOW="$(hostname 2>/dev/null || true)"
E2E_GATEWAY_PORT="${E2E_GATEWAY_PORT:-18789}"
E2E_UI_BASE_URL="${E2E_UI_BASE_URL:-http://127.0.0.1:${E2E_GATEWAY_PORT}/}"

mkdir -p "$REPO_ROOT/.tmp"

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

wait_for_health() {
  local attempts=60
  local sleep_s=1
  for _ in $(seq 1 "$attempts"); do
    if OPENCLAW_GATEWAY_TOKEN="$E2E_AUTH_TOKEN" pnpm --dir "$REPO_ROOT" openclaw health --json --timeout 2000 >/dev/null 2>&1; then
      return 0
    fi
    sleep "$sleep_s"
  done
  return 1
}

start_server() {
  echo "[e2e:server] Building runtime and control UI assets..."
  pnpm --dir "$REPO_ROOT" build
  pnpm --dir "$REPO_ROOT" ui:build

  if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "[e2e:server] Server already running (pid $(cat "$PID_FILE"))."
    return 0
  fi

  echo "[e2e:server] Starting gateway on loopback:${E2E_GATEWAY_PORT}"
  if [[ "${E2E_MODE:-0}" == "1" ]] && [[ -z "${E2E_AUTO_APPROVE_PAIRING:-}" ]]; then
    echo "[e2e:server] ERROR: E2E_MODE=1 requires explicit E2E_AUTO_APPROVE_PAIRING=1."
    exit 1
  fi

  gateway_args=(gateway --bind loopback --port "$E2E_GATEWAY_PORT")
  # CI may run in minimal environments without local config bootstrapped.
  if [[ "${CI:-}" == "true" ]]; then
    gateway_args+=(--allow-unconfigured)
  fi

  OPENCLAW_GATEWAY_TOKEN="$E2E_AUTH_TOKEN" \
  E2E_MODE="${E2E_MODE:-0}" \
  E2E_AUTO_APPROVE_PAIRING="${E2E_AUTO_APPROVE_PAIRING:-0}" \
  E2E_ALLOW_TAILNET_PAIRING_AUTOAPPROVE="${E2E_ALLOW_TAILNET_PAIRING_AUTOAPPROVE:-0}" \
  pnpm --dir "$REPO_ROOT" openclaw "${gateway_args[@]}" >"$LOG_FILE" 2>&1 &

  local pid=$!
  echo "$pid" > "$PID_FILE"

  if wait_for_health; then
    echo "[e2e:server] Ready at ${E2E_UI_BASE_URL}"
    exit 0
  fi

  echo "[e2e:server] ERROR: health probe failed."
  tail -n 200 "$LOG_FILE" || true
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
  exit 1
}

stop_server() {
  if [[ ! -f "$PID_FILE" ]]; then
    echo "[e2e:server] No pid file."
    exit 0
  fi
  local pid
  pid="$(cat "$PID_FILE")"
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
    echo "[e2e:server] Stopped pid $pid"
  else
    echo "[e2e:server] Process $pid not running"
  fi
  rm -f "$PID_FILE"
}

status_server() {
  if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "running pid $(cat "$PID_FILE")"
    exit 0
  fi
  echo "stopped"
  exit 1
}

cmd="${1:-start}"
case "$cmd" in
  start) start_server ;;
  stop) stop_server ;;
  status) status_server ;;
  *)
    echo "Usage: $0 {start|stop|status}"
    exit 2
    ;;
esac
