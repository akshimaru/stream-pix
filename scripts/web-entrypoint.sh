#!/bin/sh
set -eu

exec npm run start --workspace @streampix/web -- --hostname 0.0.0.0 --port "${PORT:-3000}"
