#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_DIR="$ROOT_DIR/client"
SERVER_DIR="$ROOT_DIR/server"
VENV_DIR="$SERVER_DIR/.venv"

if [[ -x "$VENV_DIR/bin/python" ]]; then
  PYTHON_BIN="$VENV_DIR/bin/python"
elif [[ -x "$VENV_DIR/Scripts/python.exe" ]]; then
  PYTHON_BIN="$VENV_DIR/Scripts/python.exe"
else
  PYTHON_BIN=""
fi

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]]; then
    kill "$SERVER_PID" 2>/dev/null || true
  fi

  if [[ -n "${CLIENT_PID:-}" ]]; then
    kill "$CLIENT_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

echo "Installing frontend dependencies..."
cd "$CLIENT_DIR"
npm install

echo "Setting up backend virtual environment..."
cd "$SERVER_DIR"

if [[ ! -d "$VENV_DIR" ]]; then
  python3 -m venv .venv
fi

if [[ -z "$PYTHON_BIN" ]]; then
  if [[ -x "$VENV_DIR/bin/python" ]]; then
    PYTHON_BIN="$VENV_DIR/bin/python"
  elif [[ -x "$VENV_DIR/Scripts/python.exe" ]]; then
    PYTHON_BIN="$VENV_DIR/Scripts/python.exe"
  else
    echo "Could not find the virtual environment Python executable."
    exit 1
  fi
fi

"$PYTHON_BIN" -m pip install --upgrade pip
"$PYTHON_BIN" -m pip install -r requirements.txt

echo "Starting backend on http://127.0.0.1:8000 ..."
"$PYTHON_BIN" -m uvicorn app.main:app --reload --port 8000 &
SERVER_PID=$!

echo "Starting frontend on http://127.0.0.1:5173 ..."
cd "$CLIENT_DIR"
npm run dev &
CLIENT_PID=$!

wait "$SERVER_PID" "$CLIENT_PID"