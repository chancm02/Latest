/* Edge Bankroll: no secrets, no write requests, no private API access. */
(() => {
'use strict';
const $ = (id) => document.getElementById(id);
const money = (n) => Number.isFinite(Number(n)) ? new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n)) : 'N/A';
const pct = (n, digits=1) => Number.isFinite(Number(n)) ? `${(Number(n)*100).toFixed(digits)}%` : 'N/A';
const clean = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date = (s) => { if(!s) return 'Unavailable'; const d=new Date(s); return Number.isNaN(d.getTime())?'Unavailable':d.toLocaleString('en-US',{timeZone:'America/Chicago',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}); };
const timeAgo = (s) => {const v=Date.now()-Date.parse(s);if(!Number.isFinite(v))return 'time unknown';if(v<0)return 'updating'; if(v<60000)return 'just now';if(v<3600000)return `${Math.floor(v/60000)}m old`;if(v<86400000)return `${Math.floor(v/3600000)}h old`;return `${Math.floor(v/86400000)}d old`;};
const price = (odd) => {let x=Number(odd);return Number.isFinite(x)?`${x>0?'+':''}${x}`:'—';};
const gross = (stake, odds) => {const s=Number(stake),o=Number(odds);if(!(s>=0)||!Number.isFinite(o)||o===0)return NaN;return Math.round(100*s*(o>0?1+o/100:1+100/Math.abs(o)))/100;};
const net = (stake, odds) => Math.round(100*(gross(stake,odds)-Number(stake)))/100;
const ev = (b) => {
  if(b.probability===null || b.probability===undefined || b.probability==='') return null;
  const p=Number(b.probability),g=gross(1,b.odds);
  return Number.isFinite(p)&&p>=0&&p<=1&&Number.isFinite(g)?(p*g-1)*100:null;
};
const num = (n) => Number.isFinite(Number(n))?Number(n):0;
let ledger=null, scoreFeed={events:[]}, state={status:'ALL',portfolio:'ALL'};
let baseUrl='./data/';
function teamNorm(s){return String(s||'').toLowerCase().replace(/\([^)]*\)/g,'').replace(/[^a-z0-9]/g,'').replace(/(fightingirish|cornhuskers|cowboys|cougars|sooners|wildcats|ducks|bruins|goldenbears|demondeacons|badgers|utes|buffaloes|rams|raiders|broncos|chargers|texans|jaguars|bills|giants|titans|colts|eagles|steelers|falcons|patriots|saints|ravens|browns|bears|panthers|cardinals|seahawks|commanders|fortyniners)$/,'');}
function isMatch(a,b){const x=teamNorm(a),y=teamNorm(b);if(!x||!y)return false;return x===y||((x.length>=4&&y.length>=4)&&(x.startsWith(y)||y.startsWith(x)));}
function findGame(b){
  const teams=String(b.event||'').replace(/\s*\(\d{4}-\d{2}-\d{2}\)\s*$/,'').split(/\s+(?:at|vs\.?|@)\s+/i);
  if(teams.length!==2)return null;
  return (scoreFeed.events||[]).find((e)=>{
    if(!Array.isArray(e.teams)||e.teams.length!==2)return false;
    const aliases=e.teams.map(t=>t.displayName||t.name||'');
    return (isMatch(teams[0],aliases[0])&&isMatch(teams[1],aliases[1]))||(isMatch(teams[0],aliases[1])&&isMatch(teams[1],aliases[0]));
  })||null;
}
function statusLabel(status){const s=String(status||'').toUpperCase();return ['WIN','LOSS','PUSH','VOID','PENDING'].includes(s)?s:'UNKNOWN';}
function kpis(){
  const portfolios=ledger.portfolios||[],bets=ledger.bets||[];
  const combined=portfolios.reduce((s,p)=>s+num(p.available),0),pending=bets.filter(b=>statusLabel(b.status)==='PENDING');
  const reserved=pending.reduce((s,b)=>s+num(b.stake),0);
  const grossAll=pending.reduce((s,b)=>s+gross(b.stake,b.odds),0);
  $('combinedAvailable').textContent=money(combined);
  $('availableDetail').textContent=`${portfolios.length} confirmed portfolios`;
  $('reservedMetric').textContent=money(reserved);
  $('pendingDetail').textContent=`${pending.length} open positions`;
  $('plMetric').textContent=money(portfolios.reduce((s,p)=>s+num(p.realizedPL),0));
  $('maxMetric').textContent=money(combined+grossAll);
  $('navPending').textContent=String(pending.length);
  $('betCount').textContent=String(bets.length);
}
function portfoliosRender(){
 const bets=ledger.bets||[];
 $('portfolioCards').innerHTML=(ledger.portfolios||[]).map(p=>{
    const pending=bets.filter(b=>b.portfolio===p.name&&statusLabel(b.status)==='PENDING'),reserved=pending.reduce((s,b)=>s+num(b.stake),0);
    const potentialGross=pending.reduce((s,b)=>s+gross(b.stake,b.odds),0);
    const maxBankroll=num(p.available)+potentialGross,starting=100;
    const usage=reserved+num(p.available)>0 ? Math.max(0,Math.min(100,100*num(p.available)/(reserved+num(p.available)))):0;
    const roi=p.roiPercent==null || p.roiPercent==='' ? 'N/A':`${num(p.roiPercent).toFixed(1)}%`;
    return `<article class="portfolio-card ${p.name==='SHADOW TEST'?'shadow':''}">
      <div class="portfolio-head"><div class="portfolio-name">${clean(p.name)}</div><span class="portfolio-class">${p.name==='SHADOW TEST'?'EXPERIMENTAL':'DISCIPLINED'}</span></div>
      <div class="portfolio-main"><strong>${money(p.available)}</strong><span>available cash</span></div>
      <div class="progress-bar"><div class="progress-inner" style="width:${usage.toFixed(1)}%"></div></div>
      <div class="portfolio-stats"><div><span>W–L</span><b>${num(p.settledWins)}–${num(p.settledLosses)}</b></div><div><span>REALIZED P/L</span><b>${money(p.realizedPL)}</b></div><div><span>ROI</span><b>${roi}</b></div><div><span>PENDING</span><b>${pending.length} / ${money(reserved)}</b></div></div>
      <div class="portfolio-stats" style="margin-top:18px"><div><span>NET IF ALL WIN</span><b>${money(potentialGross-reserved)}</b></div><div><span>POT. GROSS</span><b>${money(potentialGross)}</b></div><div style="grid-column:span 2"><span>MAX POTENTIAL BALANCE</span><b>${money(maxBankroll)}</b></div></div>
    </article>`;
  }).join('');
}
function scoreFeedIsStale(){
 const ts=Date.parse(scoreFeed.updatedAt||'');
 return !Number.isFinite(ts)||Date.now()-ts>25*60*1000;
}
function scoreLabel(game){
 if(!game)return null;
 const state=String(game.state||'').toLowerCase();
 let text=game.status|| (state==='pre'?'Scheduled':state==='post'?'Final':state==='in'?'LIVE':'Status unavailable');
 let first=game.teams?.[0], second=game.teams?.[1];
 const score=state==='pre'?null:`${clean(first?.abbreviation||first?.name||'')} ${clean(first?.score??'–')} : ${clean(second?.score??'–')} ${clean(second?.abbreviation||second?.name||'')}`;
 return {state:state==='in'&&scoreFeedIsStale()?'stale':state,text:clean(state==='in'&&scoreFeedIsStale()?`Last reported: ${text}`:text),score};
}
function betsRender(){
 if(!ledger)return;
 const filtered=(ledger.bets||[]).filter(b=> (state.portfolio==='ALL'||b.portfolio===state.portfolio) &&
  (state.status==='ALL'|| (state.status==='SETTLED'?['WIN','LOSS','PUSH','VOID'].includes(statusLabel(b.status)):statusLabel(b.status)==='PENDING')));
 filtered.sort((a,b)=>Date.parse(b.placedAt||0)-Date.parse(a.placedAt||0));
 $('betsList').innerHTML=filtered.length?filtered.map(b=>{
  const status=statusLabel(b.status),g=findGame(b),gs=scoreLabel(g), winGross=gross(b.stake,b.odds),expected=ev(b),
  result=status==='WIN'?`${money(b.netPL)}`:status==='LOSS'?`${money(b.netPL)}`:status==='PENDING'?`+${money(net(b.stake,b.odds))}`:'N/A';
  let scoreView=gs?`<div class="score-strip"><span class="teams">${gs.score||'Game not started'}</span><span class="${gs.state==='in'?'livegame':'scheduled'}">${gs.text}</span></div>`:'';
  return `<article class="bet-card"><div class="bet-topbar"></div><div class="bet-inner">
  <div class="bet-upper"><span class="sport-chip">${clean(b.sport||'SPORT')} / ${clean(b.portfolio)}</span><span class="bet-status ${status.toLowerCase()}">${status}</span></div>
  <div class="bet-title">${clean(b.event)}</div>
  <div class="bet-selection">${clean(b.selection)} <span class="odds-chip">${price(b.odds)}</span></div>
  <div class="bet-info"><span>${clean(b.market)}</span><span class="sep">•</span><span>Recorded ${date(b.placedAt)}</span></div>
  ${scoreView}
  <div class="bet-grid">
  <div class="bet-kpi"><label>STAKE</label><b>${money(b.stake)}</b></div>
  <div class="bet-kpi"><label>MODEL INPUT</label><b>${b.probability==null?'N/A':pct(b.probability)}</b></div>
  <div class="bet-kpi"><label>SCENARIO EV</label><b class="${expected>0?'kpi-plus':''}">${expected==null?'N/A':`${expected>0?'+':''}${expected.toFixed(1)}%`}</b></div>
  <div class="bet-kpi"><label>${status==='PENDING'?'NET IF WIN':'NET RESULT'}</label><b>${result}</b></div>
  </div>
  <div class="bet-bottom"><span class="foot-tag">${status==='PENDING'?`POTENTIAL GROSS ${money(winGross)}`:`RECORDED STATUS ${status}`}</span><span class="model-note">Experimental probabilities · not validated</span></div>
  </div></article>`;
 }).join(''):'<div class="loading-card">No positions match these filters. The ledger has not recorded any for this selection.</div>';
}
function scoreRender(){
 const events=scoreFeed.events||[], activeEvents=events.filter(g=>g.state==='in');
 $('scoreAsOf').textContent=scoreFeed.updatedAt?timeAgo(scoreFeed.updatedAt):'Not updated';
 $('scoreRefreshState').textContent=!scoreFeed.updatedAt?'Scores not connected':scoreFeedIsStale()?'Score cache stale':'Cached score feed';
 let associated=[];
 for(const b of (ledger?.bets||[])){const g=findGame(b);if(g&&!associated.includes(g))associated.push(g);}
 const selection=[...associated,...activeEvents,...events.filter(x=>!associated.includes(x))].filter((g,i,a)=>a.findIndex(z=>z.id===g.id)===i).slice(0,9);
 $('scoresList').innerHTML=selection.length?selection.map(g=>{
    const pre=g.state==='pre';
    const t=g.teams||[];
    return `<div class="score-match"><div class="score-match-head"><span>${clean(g.league||'SPORT')}</span><span class="right">${g.state==='in'?(scoreFeedIsStale()?'LAST UPDATE STALE':'● LIVE'):g.state==='post'?'FINAL':'UPCOMING'}</span></div>
     ${t.map(x=>`<div class="score-row"><span class="team">${clean(x.abbreviation||x.name)}</span><span class="score">${pre?'–':clean(x.score??'–')}</span></div>`).join('')}
     <div class="score-status">${clean(g.status||'Time unavailable')}</div></div>`;
 }).join(''):'<div class="loading-card">Scores will appear after the first GitHub Pages refresh workflow runs. Until then, use the sportsbook or another official live scoreboard.</div>';
}
function updateSync(){
 if(!ledger)return;
 $('snapshotTime').textContent=date(ledger.publishedAt);
 $('snapshotMode').textContent=`${ledger.syncMode==='snapshot'?'Manual ledger snapshot':'Published ledger data'} · ${timeAgo(ledger.publishedAt)}`;
 const age=Date.now()-Date.parse(ledger.publishedAt);
 const manual=ledger.syncMode!=='automated';
 const stale=manual||age>15*60*1000||!Number.isFinite(age);
 $('syncPill').classList.toggle('stale',stale);
 $('syncPill').querySelector('span:last-child').textContent=manual?'Manual snapshot · not auto-synced':(stale?'Automated ledger update delayed':'Automated ledger feed recent');
}
async function fetchJSON(file){
 const r=await fetch(`${baseUrl}${file}?_=${Date.now()}`,{cache:'no-store'});
 if(!r.ok)throw Error(`${file} HTTP ${r.status}`);
 return r.json();
}
async function refresh(){
 $('refreshBtn').disabled=true;
 try{
    const response=await Promise.allSettled([fetchJSON('dashboard.json'),fetchJSON('scores.json')]);
    if(response[0].status==='fulfilled'){
      const x=response[0].value;
      if(!x||!Array.isArray(x.portfolios)||!Array.isArray(x.bets)) throw Error('Ledger data shape invalid');
      ledger=x;
      kpis();portfoliosRender();updateSync();
    }else if(!ledger){$('betsList').innerHTML='<div class="loading-card">Ledger snapshot unavailable. Verify the published dashboard.json file.</div>'; $('syncPill').querySelector('span:last-child').textContent='Ledger unavailable';}
    if(response[1].status==='fulfilled'&&Array.isArray(response[1].value.events))scoreFeed=response[1].value;
    scoreRender();betsRender();
 } catch(err){$('notice').textContent=`Data warning: ${err.message}`;}
 finally{$('refreshBtn').disabled=false;}
}
document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{
 state.status=btn.dataset.status;
 document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t===btn));
 betsRender();
}));
$('portfolioFilter').addEventListener('change',e=>{state.portfolio=e.target.value;betsRender();});
$('refreshBtn').addEventListener('click',refresh);
refresh();
setInterval(refresh,90*1000);
setInterval(()=>{if(ledger)updateSync();if(scoreFeed){$('scoreAsOf').textContent=scoreFeed.updatedAt?timeAgo(scoreFeed.updatedAt):'Not updated'; $('scoreRefreshState').textContent=!scoreFeed.updatedAt?'Scores not connected':scoreFeedIsStale()?'Score cache stale':'Cached score feed';}},60*1000);
})();
