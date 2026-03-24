#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/Backend"
FRONTEND_DIR="$ROOT_DIR/Frontend"
RUNTIME_DIR="$ROOT_DIR/.runtime"
LOG_DIR="$HOME/Library/Logs"
BACKEND_LOG="$LOG_DIR/schedora-backend.log"
FRONTEND_LOG="$LOG_DIR/schedora-frontend.log"
BACKEND_PID_FILE="$RUNTIME_DIR/backend-watch.pid"
FRONTEND_PID_FILE="$RUNTIME_DIR/frontend-watch.pid"
BACKEND_URL="http://127.0.0.1:5097"
BACKEND_PORT="5097"
FRONTEND_WWWROOT="$BACKEND_DIR/wwwroot"
PATH_WITH_BREW="/opt/homebrew/bin:/usr/local/bin:$PATH"

mkdir -p "$RUNTIME_DIR" "$LOG_DIR"

print_usage() {
  cat <<'EOF'
Usage: ./scripts/schedora.sh <command>

Commands:
  status   Show backend/frontend status, ports, and log locations
  start    Start backend and frontend watch build in the background
  stop     Stop the background backend/frontend processes
  restart  Stop everything, then start again
EOF
}

find_backend_watch_pid() {
  ps -axo pid=,command= | awk -v project="$BACKEND_DIR" '
    index($0, "dotnet watch run") &&
    index($0, "--project " project) &&
    index($0, "--launch-profile http") {
      print $1
      exit
    }
  '
}

find_frontend_watch_pid() {
  ps -axo pid=,command= | awk -v frontend="$FRONTEND_DIR" '
    index($0, frontend) &&
    index($0, "vite build --watch") {
      print $1
      exit
    }
  '
}

backend_service_pid() {
  lsof -nP -iTCP:"$BACKEND_PORT" -sTCP:LISTEN -t 2>/dev/null | head -n 1 || true
}

backend_http_ok() {
  curl -fsS -o /dev/null --max-time 3 "$BACKEND_URL"
}

backend_http_code() {
  curl -sS -o /dev/null -w '%{http_code}' --max-time 3 "$BACKEND_URL" 2>/dev/null || true
}

log_tail() {
  local file="$1"
  if [[ -f "$file" ]]; then
    tail -n 20 "$file"
  else
    echo "No log file yet: $file"
  fi
}

show_status() {
  local backend_watch_pid
  local backend_pid
  local frontend_watch_pid
  local http_code

  backend_watch_pid="$(find_backend_watch_pid || true)"
  backend_pid="$(backend_service_pid || true)"
  frontend_watch_pid="$(find_frontend_watch_pid || true)"
  http_code="$(backend_http_code)"

  echo "Schedora status"
  echo "Project root: $ROOT_DIR"
  echo

  if [[ -n "$backend_watch_pid" || -n "$backend_pid" ]]; then
    echo "Backend: running"
    [[ -n "$backend_watch_pid" ]] && echo "  Watch PID: $backend_watch_pid"
    [[ -n "$backend_pid" ]] && echo "  Service PID: $backend_pid"
    echo "  URL: $BACKEND_URL"
    if [[ "$http_code" == "200" ]]; then
      echo "  HTTP: healthy (200)"
    elif [[ -n "$http_code" ]]; then
      echo "  HTTP: responding ($http_code)"
    else
      echo "  HTTP: not responding"
    fi
  else
    echo "Backend: stopped"
    echo "  URL: $BACKEND_URL"
  fi

  echo

  if [[ -n "$frontend_watch_pid" ]]; then
    echo "Frontend watch build: running"
    echo "  Watch PID: $frontend_watch_pid"
    echo "  Output dir: $FRONTEND_WWWROOT"
  else
    echo "Frontend watch build: stopped"
    echo "  Output dir: $FRONTEND_WWWROOT"
  fi

  echo
  echo "Logs:"
  echo "  Backend: $BACKEND_LOG"
  echo "  Frontend: $FRONTEND_LOG"
}

wait_for_backend() {
  local watch_pid="$1"
  local i

  for i in {1..30}; do
    if backend_http_ok; then
      return 0
    fi

    if ! kill -0 "$watch_pid" 2>/dev/null; then
      echo "Backend exited during startup. Recent log output:"
      log_tail "$BACKEND_LOG"
      return 1
    fi

    sleep 1
  done

  echo "Backend did not become ready within 30 seconds."
  echo "Recent backend log output:"
  log_tail "$BACKEND_LOG"
  return 1
}

wait_for_frontend() {
  local watch_pid="$1"
  local i

  for i in {1..30}; do
    if [[ -f "$FRONTEND_LOG" ]] && grep -q "watching for file changes" "$FRONTEND_LOG"; then
      return 0
    fi

    if ! kill -0 "$watch_pid" 2>/dev/null; then
      echo "Frontend watch build exited during startup. Recent log output:"
      log_tail "$FRONTEND_LOG"
      return 1
    fi

    sleep 1
  done

  echo "Frontend watch build did not finish its initial startup within 30 seconds."
  echo "Recent frontend log output:"
  log_tail "$FRONTEND_LOG"
  return 1
}

start_backend() {
  local pid

  pid="$(find_backend_watch_pid || true)"
  if [[ -n "$pid" ]]; then
    echo "Backend already running (watch PID $pid)."
    return 0
  fi

  if ! command -v dotnet >/dev/null 2>&1; then
    echo "dotnet is not installed or not on PATH."
    return 1
  fi

  if [[ ! -f "$BACKEND_DIR/appsettings.local.json" ]]; then
    echo "Warning: $BACKEND_DIR/appsettings.local.json not found."
    echo "Backend startup may fail if appsettings.json does not contain a valid connection string."
  fi

  (
    cd "$ROOT_DIR"
    nohup dotnet watch run --project "$BACKEND_DIR" --launch-profile http --non-interactive >"$BACKEND_LOG" 2>&1 < /dev/null &
    echo $! > "$BACKEND_PID_FILE"
  )

  pid="$(cat "$BACKEND_PID_FILE")"
  if wait_for_backend "$pid"; then
    echo "Backend started."
    echo "  Watch PID: $pid"
    echo "  URL: $BACKEND_URL"
  else
    return 1
  fi
}

start_frontend() {
  local pid

  pid="$(find_frontend_watch_pid || true)"
  if [[ -n "$pid" ]]; then
    echo "Frontend watch build already running (watch PID $pid)."
    return 0
  fi

  export PATH="$PATH_WITH_BREW"
  if ! command -v npm >/dev/null 2>&1; then
    echo "npm is not installed or not on PATH."
    return 1
  fi

  if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
    echo "Frontend dependencies not found. Running npm install first..."
    (
      cd "$FRONTEND_DIR"
      npm install
    )
  fi

  (
    cd "$FRONTEND_DIR"
    nohup env PATH="$PATH_WITH_BREW" npm run build -- --watch >"$FRONTEND_LOG" 2>&1 < /dev/null &
    echo $! > "$FRONTEND_PID_FILE"
  )

  pid="$(cat "$FRONTEND_PID_FILE")"
  if wait_for_frontend "$pid"; then
    echo "Frontend watch build started."
    echo "  Watch PID: $pid"
    echo "  Output dir: $FRONTEND_WWWROOT"
  else
    return 1
  fi
}

kill_if_running() {
  local pid="$1"
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
  fi
}

stop_backend() {
  local pid

  pid=""
  if [[ -f "$BACKEND_PID_FILE" ]]; then
    pid="$(cat "$BACKEND_PID_FILE" 2>/dev/null || true)"
  fi
  kill_if_running "$pid"
  pkill -f "dotnet watch run --project $BACKEND_DIR --launch-profile http" 2>/dev/null || true
  pkill -f "$BACKEND_DIR/bin/Debug/net9.0/InspectionApi" 2>/dev/null || true
  rm -f "$BACKEND_PID_FILE"
}

stop_frontend() {
  local pid

  pid=""
  if [[ -f "$FRONTEND_PID_FILE" ]]; then
    pid="$(cat "$FRONTEND_PID_FILE" 2>/dev/null || true)"
  fi
  kill_if_running "$pid"
  pkill -f "$FRONTEND_DIR/node_modules/.bin/vite build --watch" 2>/dev/null || true
  pkill -f "npm run build --watch" 2>/dev/null || true
  pkill -f "npm run build -- --watch" 2>/dev/null || true
  rm -f "$FRONTEND_PID_FILE"
}

start_all() {
  start_backend
  echo
  start_frontend
  echo
  show_status
}

stop_all() {
  stop_frontend
  stop_backend
  echo "Schedora background processes stopped."
}

main() {
  local command="${1:-status}"

  case "$command" in
    status)
      show_status
      ;;
    start)
      start_all
      ;;
    stop)
      stop_all
      ;;
    restart)
      stop_all
      echo
      start_all
      ;;
    *)
      print_usage
      exit 1
      ;;
  esac
}

main "$@"
