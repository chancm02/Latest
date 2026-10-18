#!/usr/bin/env bash
# PUBLIC read-only dashboard deployment. It never touches the private ledger.
set -Eeuo pipefail
cd "$(dirname "$0")"
TARGET="chancm02/edge-bankroll-dashboard"

fail() { printf "ERROR: %s\n" "$*" >&2; exit 1; }
for x in git gh python3; do command -v "$x" >/dev/null || fail "Missing $x"; done
gh auth status >/dev/null 2>&1 || fail "Sign in using: gh auth login (do not share credentials in chat)"
[[ ! -e .git ]] || fail "The deployment folder already has git history. Unpack a fresh copy first."
[[ -f index.html && -f .github/workflows/publish.yml ]] || fail "Missing website files"
python3 scripts/verify_public_data.py || fail "Public snapshot validation failed"
python3 scripts/validate_public_data.py || fail "Public snapshot validation failed"

printf "You approved a PUBLIC, READ-ONLY website at %s.\n" "$TARGET"
printf "The current JSON is an historic paper-ledger snapshot, NOT a live sheet connection.\n"
read -r -p "Type PUBLIC to create and publish: " confirmation
[[ "$confirmation" == "PUBLIC" ]] || fail "Canceled"

if gh repo view "$TARGET" --json name >/dev/null 2>&1; then
  fail "Repository already exists. No changes were made."
fi
git init -b main >/dev/null
git add index.html .nojekyll README.md WORK-HANDOFF.md assets data scripts deploy.sh .github
git commit -m "Publish read-only Edge Bankroll dashboard" >/dev/null
gh repo create "$TARGET" --public --source=. --remote=origin --push \
  --description "Read-only simulated paper bankroll cards and cached scores"

if gh api "/repos/${TARGET}/pages" >/dev/null 2>&1; then
  gh api -X PUT "repos/${TARGET}/pages" -f build_type=workflow >/dev/null \
    || fail "Created repository, but couldn't configure Pages. Use Settings > Pages."
else
  gh api -X POST "repos/${TARGET}/pages" -f build_type=workflow >/dev/null \
    || fail "Created repository, but couldn't configure Pages. Use Settings > Pages."
fi

success=0
for attempt in 1 2 3 4; do
  if gh workflow run publish.yml --repo "$TARGET" --ref main >/dev/null 2>&1; then
    success=1
    break
  fi
  sleep 8
done
[[ "$success" -eq 1 ]] || fail "Created repo and Pages, but workflow was not dispatched. Run it from GitHub Actions."
printf "\nDeployment requested, not yet confirmed. Check https://github.com/%s/actions\n" "$TARGET"
gh api "/repos/${TARGET}/pages" --jq '.html_url' || true
printf "Do not claim the website is live before the GitHub Actions job reports success.\n"
printf "Private ledger auto-sync remains unconfigured.\n"
