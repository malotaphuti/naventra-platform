#!/usr/bin/env bash
# Deploys (or updates) FleetOps on the server.
#   ./scripts/deploy.sh            -> deploys the FLEETOPS_VERSION in .env
#   ./scripts/deploy.sh 1.2.0      -> sets FLEETOPS_VERSION=1.2.0 in .env, then deploys it
# Run from the deploy directory (where docker-compose.prod.yml and .env live).
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env"

if [[ $# -ge 1 ]]; then
  sed -i "s/^FLEETOPS_VERSION=.*/FLEETOPS_VERSION=$1/" .env
fi
VERSION=$(grep '^FLEETOPS_VERSION=' .env | cut -d= -f2)
echo "==> Deploying FleetOps $VERSION"

# Always back up the database before a release: Flyway migrations are forward-only
if $COMPOSE ps --status running postgres | grep -q postgres; then
  ./scripts/backup.sh
fi

$COMPOSE pull
$COMPOSE up -d --remove-orphans

echo "==> Waiting for the backend to become healthy..."
for i in $(seq 1 40); do
  status=$(docker inspect --format '{{.State.Health.Status}}' "$($COMPOSE ps -q backend)" 2>/dev/null || echo starting)
  if [[ "$status" == "healthy" ]]; then
    echo "==> Backend healthy. FleetOps $VERSION is live."
    docker image prune -f >/dev/null
    exit 0
  fi
  sleep 5
done

echo "!! Backend did not become healthy. Recent logs:" >&2
$COMPOSE logs --tail=80 backend >&2
exit 1
