#!/usr/bin/env python3
"""Fail closed if a public EDGE dashboard snapshot is malformed or looks like a raw ledger dump.
This checks a *published* read-only JSON snapshot, never accesses the private ledger.
"""
import json
import math
import pathlib
from datetime import datetime

ROOT = pathlib.Path(__file__).resolve().parents[1]
FILE = ROOT / "data" / "dashboard.json"
ALLOWED_ROOT = {"schemaVersion","source","publishedAt","verifiedAsOf","syncMode","paperTrading","disclaimer","portfolios","bets"}
ALLOWED_PORTFOLIO = {"name","available","settledWins","settledLosses","realizedPL","roiPercent","pendingCount"}
ALLOWED_BET = {"portfolio","sport","event","eventDate","market","selection","odds","stake","probability","status","placedAt","netPL","settledAt"}

def require(ok, message):
    if not ok:
        raise ValueError(message)

def amount(v):
    return isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v) and round(v,2)==v

def check():
    data=json.loads(FILE.read_text(encoding="utf-8"))
    require(isinstance(data,dict), "Root must be an object")
    require(set(data).issubset(ALLOWED_ROOT), "Unapproved root keys; never publish raw ledger fields")
    require(data.get("schemaVersion")==1 and data.get("paperTrading") is True, "Not a recognized paper-ledger snapshot")
    require(data.get("syncMode") in {"snapshot","automated"}, "Missing/invalid syncMode")
    for name in ("publishedAt","verifiedAsOf"):
        if data.get(name):
            datetime.fromisoformat(data[name].replace("Z","+00:00"))
    require(isinstance(data.get("portfolios"),list) and len(data["portfolios"])==2,"Expected exactly two portfolios")
    require(isinstance(data.get("bets"),list),"Expected bets array")
    ports={}
    for p in data["portfolios"]:
        require(isinstance(p,dict) and set(p).issubset(ALLOWED_PORTFOLIO), "Unapproved portfolio fields")
        name=p.get("name")
        require(name in ("STRICT VALUE","SHADOW TEST") and name not in ports,"Unexpected/duplicate portfolio")
        require(amount(p.get("available")) and p["available"]>=0,"Invalid available bankroll")
        require(amount(p.get("realizedPL")),"Invalid realized PL")
        for n in ("settledWins","settledLosses","pendingCount"):
            require(type(p.get(n)) is int and p[n]>=0,f"Invalid {n}")
        require(p.get("roiPercent") is None or isinstance(p["roiPercent"],(int,float)), "Invalid ROI")
        ports[name]=p
    pending_count={key:0 for key in ports}
    seen=set()
    for i,b in enumerate(data["bets"]):
        require(isinstance(b,dict) and set(b).issubset(ALLOWED_BET),f"Bet {i}: unapproved/raw fields")
        require(b.get("portfolio") in ports,f"Bet {i}: unknown portfolio")
        for s in ("event","market","selection","sport","placedAt"):
            require(isinstance(b.get(s),str) and bool(b[s].strip()), f"Bet {i}: missing {s}")
        require(type(b.get("odds")) is int and b["odds"] not in (0,-100) and (b["odds"]<=-101 or b["odds"]>=100), f"Bet {i}: invalid odds")
        require(amount(b.get("stake")) and b["stake"]>0,f"Bet {i}: invalid stake")
        prob=b.get("probability")
        require(prob is None or isinstance(prob,(int,float)) and 0<=prob<=1, f"Bet {i}: invalid probability")
        status=b.get("status")
        require(status in {"PENDING","WIN","LOSS","PUSH","VOID"},f"Bet {i}: invalid status")
        if status=="PENDING":
            pending_count[b["portfolio"]]+=1
        else:
            require(amount(b.get("netPL")),f"Bet {i}: settled bet missing net PL")
        key=(b["portfolio"],b["placedAt"],b["event"],b["selection"],b["stake"])
        require(key not in seen,f"Bet {i}: possible duplicate")
        seen.add(key)
    for name,p in ports.items():
        require(p["pendingCount"]==pending_count[name],f"Pending-count mismatch: {name}")
    print(f"Safe public snapshot: {len(data['bets'])} sanitized bets and {len(ports)} portfolios")

if __name__=="__main__":
    check()
