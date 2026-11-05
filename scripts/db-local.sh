#!/usr/bin/env bash
# Starts a throwaway local Postgres (port 54329) for db tests. Needs Postgres server binaries; run as root or a normal user.
#   scripts/db-local.sh start|stop     -> prints the URL to export as RIGLAB_TEST_PG
set -euo pipefail
BIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1); DIR=${RIGLAB_PGDIR:-/tmp/riglab-pg}; PORT=54329
run() { if [ "$(id -u)" = 0 ]; then su postgres -s /bin/bash -c "$*"; else bash -c "$*"; fi; }
case "${1:-start}" in
  start)
    if [ ! -d "$DIR" ]; then mkdir -p "$DIR"; [ "$(id -u)" = 0 ] && chown postgres "$DIR"; run "$BIN/initdb -D $DIR -A trust >/dev/null"; fi
    run "$BIN/pg_ctl -D $DIR -o '-p $PORT -k /tmp' -l $DIR/log -w start >/dev/null" || true
    echo "postgresql://postgres@localhost:$PORT/postgres?host=/tmp" ;;
  stop) run "$BIN/pg_ctl -D $DIR -m fast stop" ;;
esac
