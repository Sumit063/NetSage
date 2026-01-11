#!/bin/sh
set -e

/app/worker &
worker_pid=$!

cleanup() {
  if kill -0 "$worker_pid" 2>/dev/null; then
    kill "$worker_pid"
  fi
}

trap cleanup INT TERM

exec /app/api
