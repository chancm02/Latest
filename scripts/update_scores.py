#!/usr/bin/env python3
"""Fetch a public, unofficial scoreboard as a READ-ONLY cache for GitHub Pages.
This script never talks to Google Sheets, private GitHub repositories, or DraftKings.
If third-party data is unavailable, it preserves old timestamped data rather than
pretending the cache is fresh. Source/API availability is not guaranteed.
"""
import datetime as dt
import json
import os
import pathlib
import urllib.parse
import urllib.request
from zoneinfo import ZoneInfo

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "scores.json"
TODAY = dt.datetime.now(ZoneInfo("America/Chicago")).date()
LEAGUES = {
    "NCAA Football": ("football", "college-football", {"groups":"80","limit":"500"}),
    "NFL": ("football", "nfl", {"limit":"100"}),
    "NBA": ("basketball", "nba", {"limit":"100"}),
    "NHL": ("hockey", "nhl", {"limit":"100"}),
    "MLB": ("baseball", "mlb", {"limit":"100"}),
}

def fetch_league(name, args):
    sport, league, extra = args
    # Limit calls to the current Central calendar day (ESPN endpoint is unofficial).
    dates = [TODAY.strftime("%Y%m%d")]
    entries = []
    for match_date in dates:
        params = {"dates":match_date,**extra}
        url = f"https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/scoreboard?{urllib.parse.urlencode(params)}"
        req = urllib.request.Request(url, headers={"User-Agent":"EdgeBankrollDashboard/1.0 (read-only score cache)","Accept":"application/json"})
        with urllib.request.urlopen(req, timeout=10) as response:
            parsed = json.load(response)
        for game in parsed.get("events",[]):
            competition = next(iter(game.get("competitions",[])),{})
            competitors = sorted(competition.get("competitors",[]),key=lambda x: x.get("homeAway")!="away")
            if len(competitors)!=2:
                continue
            status=game.get("status",{}) or competition.get("status",{}) or {}
            typ=status.get("type",{})
            entries.append({
                "id":f"{league}:{game.get('id')}",
                "league":name,
                "start":game.get("date"),
                "state":typ.get("state","unknown"),
                "status":typ.get("shortDetail") or typ.get("detail") or typ.get("description") or "Status unavailable",
                "teams":[{
                   "name":c.get("team",{}).get("displayName",""),
                   "displayName":c.get("team",{}).get("displayName",""),
                   "abbreviation":c.get("team",{}).get("abbreviation",""),
                   "score":c.get("score","")
                } for c in competitors]
            })
    return entries

def main():
    prior={}
    if OUT.exists():
        try: prior=json.loads(OUT.read_text(encoding="utf-8"))
        except (ValueError,OSError): pass
    all_events=[]
    errors=[]
    success=0
    for name,args in LEAGUES.items():
        try:
            all_events += fetch_league(name,args)
            success+=1
        except Exception as exc:
            errors.append(f"{name}: feed unavailable ({type(exc).__name__})")
    unique={x["id"]:x for x in all_events}
    if success:
        body = {"updatedAt":dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00","Z"),
                "source":"ESPN public scoreboard (unofficial, may be delayed)",
                "events":sorted(unique.values(), key=lambda g:g.get("start") or ""),
                "errors":errors}
    else:
        body={"updatedAt":prior.get("updatedAt"),
              "source":prior.get("source","ESPN public scoreboard (unofficial)"),
              "events":prior.get("events",[]),
              "errors":["All external score sources unavailable; previous timestamp retained."]+errors}
    OUT.parent.mkdir(exist_ok=True,parents=True)
    OUT.write_text(json.dumps(body,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print(f"score cache: {len(body['events'])} events from {success}/{len(LEAGUES)} leagues; errors={len(errors)}")

if __name__=="__main__":
    main()
