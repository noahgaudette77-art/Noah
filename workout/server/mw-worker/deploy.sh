#!/usr/bin/env bash
# Deploys the MuscleWiki token Worker as `temp-mw` and stores the MuscleWiki key as a Worker secret.
# Needs: CLOUDFLARE_API_TOKEN (an API token, e.g. the "Edit Cloudflare Workers" template) and MUSCLEWIKI_API_KEY.
# Never prints either value. Cleans up common paste mistakes in the token (spaces, a leading "Bearer").
set -euo pipefail
cd "$(dirname "$0")"
raw="${CLOUDFLARE_API_TOKEN:-}"
tok="$(printf '%s' "$raw" | tr -d '\r\n\t ' | sed -E 's/^(Bearer|bearer)//')"
[ -n "$tok" ] || { echo "CLOUDFLARE_API_TOKEN is empty"; exit 2; }
[ -n "${MUSCLEWIKI_API_KEY:-}" ] || { echo "MUSCLEWIKI_API_KEY is empty"; exit 2; }
echo "token: ${#tok} characters after cleanup ($( [ "$tok" != "$raw" ] && echo 'cleaned' || echo 'as typed' ))"
if printf '%s' "$tok" | grep -Eq '^[0-9a-f]{37}$'; then
  echo "This looks like the Global API Key (37 hex characters), not an API token."; exit 3
fi
export CLOUDFLARE_API_TOKEN="$tok"
verify=$(curl -sS https://api.cloudflare.com/client/v4/user/tokens/verify -H "Authorization: Bearer $tok")
echo "verify: $(echo "$verify" | head -c 160)"
echo "$verify" | grep -q '"success":true' || { echo "Cloudflare does not accept this token."; exit 4; }
acct=$(curl -sS https://api.cloudflare.com/client/v4/accounts -H "Authorization: Bearer $tok" | python3 -c 'import sys,json;r=json.load(sys.stdin).get("result") or [];print(r[0]["id"] if r else "")')
[ -n "$acct" ] && export CLOUDFLARE_ACCOUNT_ID="$acct"
npx --yes wrangler@4 deploy
printf '%s' "$MUSCLEWIKI_API_KEY" | npx --yes wrangler@4 secret put MUSCLEWIKI_API_KEY
sleep 5
echo "status: $(curl -sS https://temp-mw.noahgaudette77.workers.dev/mw/status -H 'Origin: https://noahgaudette77-art.github.io')"
echo "exercise: $(curl -sS https://temp-mw.noahgaudette77.workers.dev/mw/exercise/398 -H 'Origin: https://noahgaudette77-art.github.io' | head -c 120)"
