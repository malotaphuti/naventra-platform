#!/usr/bin/env bash
# Writes a compressed PostgreSQL dump to ./backups and keeps the last 14 days.
# Schedule daily with cron (crontab -e):
#   0 2 * * * /home/ubuntu/fleetops/scripts/backup.sh >> /home/ubuntu/fleetops/backups/backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."

source <(grep -E '^(DB_NAME|DB_USERNAME)=' .env)
mkdir -p backups
FILE="backups/fleetops-$(date +%Y%m%d-%H%M%S).dump"

docker compose -f docker-compose.prod.yml --env-file .env exec -T postgres \
  pg_dump -U "$DB_USERNAME" -d "$DB_NAME" -Fc > "$FILE"

echo "Backup written: $FILE ($(du -h "$FILE" | cut -f1))"
find backups -name 'fleetops-*.dump' -mtime +14 -delete
