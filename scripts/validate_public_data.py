#!/usr/bin/env python3
"""Offline safety check for PUBLIC sanitized paper-ledger JSON. No network/credentials."""
import json
import math
import pathlib
import sys
from datetime import datetime

ROOT=pathlib.Path(__file__).resolve().parents[1]
PATH=ROOT/"data"/"dashboard.json"
PUBLIC_TOP={"schemaVersion","source","publishedAt","syncMode","paperTrading","disclaimer","portfolios","bets","verifiedAsOf"}
PUBLIC_PORT={"name","available","settledWins","settledLosses","realizedPL","roiPercent","pendingCount"}
PUBLIC_BET={"portfolio","sport","event","eventDate","market","selection","odds","stake","probability","status","placedAt","netPL","grossReturn","settledAt"}
def assert_public(cond, message):
    if not cond: raise ValueError(message)
def fields(obj, allowed, where):
    assert_public(isinstance(obj,dict),f"{where}: expected object")
    extra=set(obj)-allowed
    assert_public(not extra, f"{where}: unexpected fields (NOT public-safe): {', '.join(sorted(extra))}")
def amount(x):
    return isinstance(x,(int,float)) and not isinstance(x,bool) and math.isfinite(x) and round(x*100)==x*100 if isinstance(x,int) else isinstance(x,(int,float)) and not isinstance(x,bool) and math.isfinite(x) and abs(round(x*100)-x*100)<1e-6
def main():
    data=json.loads(PATH.read_text(encoding="utf-8"))
    fields(data,PUBLIC_TOP,"dashboard")
    assert_public(data.get("paperTrading") is True,"paperTrading must be true")
    assert_public(data.get("syncMode") in ("snapshot","automated"),"unknown sync mode")
    assert_public(data.get("schemaVersion")==1,"expected schemaVersion 1")
    datetime.fromisoformat(data["publishedAt"].replace("Z","+00:00"))
    p=data.get("portfolios",[])
    b=data.get("bets",[])
    assert_public(isinstance(p,list) and isinstance(b,list),"portfolios and bets must be arrays")
    assert_public(len(p)==2,"expected exactly two paper portfolios")
    names=[]
    for i,v in enumerate(p):
        fields(v,PUBLIC_PORT,f"portfolio {i}")
        assert_public(v.get("name") in ("STRICT VALUE","SHADOW TEST"),"unexpected portfolio")
        assert_public(amount(v.get("available")) and v["available"]>=0,"invalid available cash")
        names.append(v["name"])
    assert_public(set(names)=={"STRICT VALUE","SHADOW TEST"},"duplicate or missing portfolio")
    pending={name:0 for name in names}
    stakes={name:0.0 for name in names}
    for i,v in enumerate(b):
        fields(v,PUBLIC_BET,f"bet {i}")
        assert_public(v.get("portfolio") in names,f"bet {i} unknown portfolio")
        assert_public(v.get("status") in ("PENDING","WIN","LOSS","PUSH","VOID"),"bad status")
        assert_public(isinstance(v.get("odds"),int) and abs(v["odds"])>=100,"bad American odds")
        assert_public(amount(v.get("stake")) and v["stake"]>0,"bad stake")
        assert_public(v.get("probability") is None or isinstance(v["probability"],(int,float)) and 0<=v["probability"]<=1,"bad probability")
        assert_public(all(isinstance(v.get(k),str) and len(v[k])<250 for k in ("sport","event","market","selection","placedAt")),f"bet {i} missing required data")
        if v["status"]=="PENDING":
            pending[v["portfolio"]]+=1
            stakes[v["portfolio"]]+=v["stake"]
    for v in p:
        assert_public(v.get("pendingCount")==pending[v["name"]],f"{v['name']}: pending count inconsistent")
    print(f"Safe public JSON schema validated: {len(p)} portfolios, {len(b)} bets.")
if __name__=="__main__":
    try: main()
    except (ValueError,KeyError,TypeError,OverflowError) as e:
        print(f"Public dashboard validation FAILED: {e}",file=sys.stderr)
        sys.exit(1)
