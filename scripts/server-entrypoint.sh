#!/bin/sh
set -eu

echo "Starting StreamPix API..."

if [ "${RUN_MIGRATIONS_ON_BOOT:-true}" = "true" ]; then
  attempt=1
  max_attempts="${DATABASE_READY_RETRIES:-20}"
  delay_seconds="${DATABASE_READY_DELAY_SECONDS:-5}"

  until npm run prisma:migrate --workspace @streampix/server; do
    if [ "$attempt" -ge "$max_attempts" ]; then
      echo "Database migrations failed after ${attempt} attempts."
      exit 1
    fi

    echo "Database not ready yet. Retrying in ${delay_seconds}s..."
    attempt=$((attempt + 1))
    sleep "$delay_seconds"
  done
fi

if [ "${RUN_SEED_ON_BOOT:-false}" = "true" ]; then
  echo "Running seed..."
  npm run prisma:seed --workspace @streampix/server
fi

exec npm run start --workspace @streampix/server
