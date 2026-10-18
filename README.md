# EDGE BANKROLL — read-only GitHub Pages dashboard

A dark, mobile-first static dashboard for **simulated paper bets**, available bankroll,
ROI, hypothetical payouts and a near-live, separately sourced score center.

## Status of this starter

- **Ready to deploy:** HTML/CSS/JavaScript frontend with zero runtime dependencies and a
  GitHub Pages publishing workflow. It comes with a *real, historical* ledger snapshot
  from October 17, 2026, about 6:50 PM Central, confirmed via a committed private read.
- **Not yet connected:** Private ledger auto-export. The `data/dashboard.json` file is
  intentionally a **timestamped snapshot**, not an automatically synchronized feed.
- **Scores:** A public Github Actions job attempts to fetch scores from an **unofficial
  ESPN JSON endpoint** ~every 15 minutes (schedules may be delayed). If the feed fails,
  the page retains or reports stale results. This is **near-live**, not sportsbook-grade.
- **Never:** Places wagers, settles bets based on score alone, modifies the Google Sheet,
  or accesses private ledger credentials in the browser.

## ⚠ PUBLIC VISIBILITY / PRIVACY

**GitHub Pages sites are publicly available by default**, even when they originate from
a private repository on plans that support private-repo Pages. This site includes a
historical snapshot of **three real simulated entries** in `data/dashboard.json`. Anyone
with the site URL can read those bets, bankroll and published model probabilities.

If you do not want these details public, **DO NOT PUBLISH the included dashboard.json**.
Instead keep the site off the public internet or clear the `bets` and `portfolios` arrays
before deployment. GitHub Pages is not a private login dashboard for ordinary personal
plans. Never publish notes, Bet_IDs, credentials, Google Sheet URLs, issue records, private
GitHub tokens, a user's name, or other personal identifying data.

Keep `chancm02/edge-bankroll-api` **PRIVATE**. Its existing shared Action token and
Google Sheets credentials must NEVER be copied here.

## One-command deployment (GitHub CLI)

For an authenticated local computer, the included `deploy.sh` safely creates a **new
public** `chancm02/edge-bankroll-dashboard` repository, configures Pages, and
dispatches the deployment workflow. It requires Git, Python 3, GitHub CLI (`gh`)
and an existing `gh auth login`; it **never asks you to paste a token here**.

```bash
unzip edge-bankroll-github-pages-starter.zip -d edge-bankroll-pages
cd edge-bankroll-pages
bash deploy.sh
```

The script asks you to type `PUBLIC` before creating the repository. It refuses
to overwrite an existing repository, validates the sanitized snapshot before
uploading it, and refuses pre-existing git remotes. It does **not** enable private
ledger synchronization or automatically verify that the published deployment
completed; check the created repository's Actions tab and Pages URL.

If you're on mobile, ChatGPT Work with an authorized GitHub session can execute
the GitHub steps using this ZIP instead of the local shell.

### Publication safeguards

- The Pages workflow publishes **only** `index.html`, `.nojekyll`, `assets/`,
  and `data/` from an explicitly whitelisted `_site` folder.
- `scripts/validate_public_data.py` rejects unknown JSON keys and the release
  build checks every portfolio and pending count before publishing.
- The static site is **public**; no passwords or other identity data belong in
  `data/dashboard.json`. Only the historical authorized paper-bet snapshot
  is included.
- Site publication cannot operate on or unlock the private ledger.

## Deploy on GitHub Free (public repository)

1. Create a **separate public repository**, suggested: `edge-bankroll-dashboard`.
   **Do not change the visibility of `edge-bankroll-api`**.
2. Put **the contents of this ZIP** in the root of the new repository. Keep the
   `.github/workflows/publish.yml` folder.
3. Open the new repo > **Settings > Pages > Build and deployment > Source: GitHub Actions**.
4. Open **Actions > Publish Edge Dashboard > Run workflow** (or push a change to `main`).
5. Once the Pages deployment succeeds, GitHub shows the real website address in
   **Settings > Pages**. No guessed site URL is provided here.

If using Git CLI:
```bash
git init
git add .
git commit -m "Initial read-only Edge dashboard"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/edge-bankroll-dashboard.git
git push -u origin main
```
Create the new repository before using the Git CLI method.

## Wire the PRIVATE ledger to this PUBLIC read-only site (NOT included yet)

Current private ledger source: Bets, Transactions, Portfolio Summary Google Sheet;
the authenticated private writer is GitHub Actions in `chancm02/edge-bankroll-api`.
The dashboard **never** calls a private GitHub API or the Google Sheet directly.

Recommended secure flow:
1. Add an **operator-reviewed, read-only export step** to the existing private ledger
   backend. It reads **complete** committed `Bets` and `Portfolio Summary` records,
   follows all pagination and generates a **whitelisted, sanitized** JSON feed.
2. On confirmed bet/settlement/cash commits (or a carefully limited periodic schedule),
   publish ONLY `data/dashboard.json` into the separate public Pages repository, using
   a **fine-grained token scoped solely to that public repository's contents**,
   stored as a secret in the PRIVATE repo. Never store the token in this frontend repo,
   the data file, or browser JavaScript.
3. Trigger the public site's publish workflow using an approved non-secret deployment
   mechanism; pushing a commit using a `GITHUB_TOKEN` does not automatically trigger
   a Pages build with branch deployment.
4. Verify the updated `publishedAt` timestamp and compare two portfolio balances,
   W/L, P/L, ROI, pending count and gross payouts to the private ledger.

**Important:** This backend integration must be implemented separately and reviewed
before use; these starter files do *not* provide an authenticated bridge. Do not claim
the website is ledger-live before that is deployed and checked.

## JSON contract (`data/dashboard.json`)

```json
{
  "schemaVersion": 1,
  "publishedAt": "2026-10-17T22:35:52Z",
  "source": "PRIVATE LEDGER — confirmed snapshot",
  "syncMode": "snapshot",
  "paperTrading": true,
  "portfolios": [{
    "name": "SHADOW TEST",
    "available": 94,
    "settledWins": 0, "settledLosses": 0,
    "realizedPL": 0, "roiPercent": null, "pendingCount": 3
  }],
  "bets": [{
    "portfolio": "SHADOW TEST",
    "sport": "NCAA Football",
    "event": "Kentucky at Oklahoma",
    "market": "Point spread",
    "selection": "Kentucky +6.5",
    "odds": -108,
    "stake": 2,
    "probability": 0.548,
    "status": "PENDING",
    "placedAt": "2026-10-17T22:28:59.028Z"
  }]
}
```

Payouts are per-bet **cent-rounded gross** at recorded American odds; pending
net and max balance are hypothetical. Only a committed private ledger write changes
bet status or available cash. Settled `netPL` can be exported from ledger `Net_PL`.
ROI is **realized betting P/L ÷ settled stakes × 100**, supplied by private ledger;
if no settled stakes, the display shows `N/A`. Historical deposits/withdrawals do
not count as betting profit. Avoid exporting partial pages or accidental duplicates.
Recommended `syncMode` when configured: `"automated"` with a current `publishedAt`.

## Score feed

The GitHub Actions workflow fetches a JSON score cache for NCAA football, NFL, NBA, NHL
and MLB through unofficial publicly accessible ESPN endpoints. This is not a contractual
API and can change, throttle, or go away at any time. Scores update only after deployment,
and scheduled GitHub Actions can be delayed or skipped. If it stops, the site shows stale
age or a missing feed. Scores never update the private ledger.

## Local preview

```bash
cd edge-bankroll-pages
python3 -m http.server 8000
# Open http://localhost:8000
```

For local score testing only:
```bash
python3 scripts/update_scores.py
```

## Safety rules

- No real wagers. No wallet, deposit or betting workflow.
- No write connections in this site.
- Don't infer settlement from a game score. Match/line/market outcomes require
  verified final results and user-authorized ledger settlement.
- Per-bet probabilities and EV are **experimental scenario values**, not a proven edge.
- Distinguish published odds *at observation time* from today's live sportsbook line.
- This dashboard does not circumvent the private Action's $0 budget.

## Sources

- [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [GitHub Actions scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
