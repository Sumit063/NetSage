#!/bin/sh
set -e

mkdir -p /data/uploads
chown -R app:app /data/uploads

exec su-exec app "$@"
