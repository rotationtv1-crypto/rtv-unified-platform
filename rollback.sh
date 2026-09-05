#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# RTV Production Rollback Script
# Each deployment layer can be rolled back independently.
###############################################################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

usage() {
  echo "Usage: $0 <layer>"
  echo ""
  echo "Layers:"
  echo "  worker    - Rollback Cloudflare Worker to previous version"
  echo "  frontend  - Rollback Cloudflare Pages to previous deployment"
  echo "  d1        - Show D1 backup/restore instructions"
  echo "  supabase  - Rollback Supabase function to previous version"
  echo "  all       - Show status of all layers"
  exit 1
}

if [ $# -lt 1 ]; then usage; fi

LAYER="$1"

case "$LAYER" in
  worker)
    echo -e "${YELLOW}Rolling back Worker...${NC}"
    cd worker
    npx wrangler rollback
    echo -e "${GREEN}✅ Worker rolled back to previous version${NC}"
    ;;

  frontend)
    echo -e "${YELLOW}Rolling back Frontend (Cloudflare Pages)...${NC}"
    echo "Cloudflare Pages rollback:"
    echo "  1. Go to: https://dash.cloudflare.com → Pages → rotationtv-web-app → Deployments"
    echo "  2. Click the previous successful deployment"
    echo "  3. Click 'Rollback to this deployment'"
    echo ""
    echo "Or via API:"
    echo "  curl -X POST 'https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects/rotationtv-web-app/deployments/{deployment_id}/rollback'"
    ;;

  d1)
    echo -e "${YELLOW}D1 Database Rollback:${NC}"
    echo "  D1 migrations are forward-only. To rollback:"
    echo "  1. Create a backup before migration: wrangler d1 export rtv-production"
    echo "  2. To restore: wrangler d1 execute rtv-production --file=backup.sql"
    echo ""
    echo "  Current migrations applied:"
    cd worker
    npx wrangler d1 execute rtv-production --command="SELECT name FROM d1_migrations ORDER BY id" --remote 2>/dev/null || echo "  (check manually)"
    ;;

  supabase)
    echo -e "${YELLOW}Rolling back Supabase Functions...${NC}"
    echo "  npx supabase functions deploy webhook-tribute --project-ref \$SUPABASE_PROJECT_REF"
    echo "  (deploy the previous commit's version of the function)"
    echo ""
    echo "  Alternatively, disable the function temporarily:"
    echo "  npx supabase functions delete webhook-tribute --project-ref \$SUPABASE_PROJECT_REF"
    ;;

  all)
    echo -e "${GREEN}=== Deployment Layer Status ===${NC}"
    echo ""
    echo "1. Worker:    npx wrangler deployments list"
    echo "2. Frontend:  Cloudflare Dashboard → Pages → rotationtv-web-app"
    echo "3. D1:        npx wrangler d1 info rtv-production"
    echo "4. Supabase:  npx supabase functions list"
    echo ""
    echo "Each layer is independently deployable and rollbackable."
    ;;

  *)
    usage
    ;;
esac
