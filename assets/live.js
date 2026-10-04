// /live: read-only status. Data: sanitized status.json pushed from Kyrre's PC to the repo's live-status branch.
(function(){
  var SRC = 'https://raw.githubusercontent.com/kyrregrotan-design/digital-eukaryotic-cell/live-status/status.json';
  var STALE_MIN = 15, NAMES = {cursor:'Cursor', codex:'Codex'};
  var $ = function(id){ return document.getElementById(id); };
  function hm(iso){ if(!iso) return '–'; var d=new Date(iso); if(isNaN(d)) return '–';
    return d.toLocaleTimeString('nb-NO',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Oslo'}); }
  function dayLabel(iso){ var d=new Date(iso), n=new Date(); var f=function(x){return x.toLocaleDateString('nb-NO',{timeZone:'Europe/Oslo'});};
    if(f(d)===f(n)) return 'i dag'; var y=new Date(n.getTime()-864e5); if(f(d)===f(y)) return 'i går';
    return d.toLocaleDateString('nb-NO',{day:'numeric',month:'short',timeZone:'Europe/Oslo'}); }
  function mins(s){ var m=Math.max(1,Math.round(s/60)); return m<60 ? m+' min' : Math.floor(m/60)+' t '+(m%60)+' min'; }
  function txt(id,v){ $(id).textContent = (v===null||v===undefined||v==='') ? '\u00a0' : v; }
  function render(d){
    var act = d.active_agent && d.agents && d.agents[d.active_agent] ? d.active_agent : null;
    var gen = new Date(d.generated_at), ageMin = (Date.now()-gen.getTime())/60000, stale = !(ageMin < STALE_MIN);
    var a, label;
    if(act && !stale){ a=d.agents[act]; label=NAMES[act]+' jobber nå'; $('now').className='now card on'; }
    else {
      var c=d.agents||{}, best=null;
      ['cursor','codex'].forEach(function(k){ if(c[k] && c[k].task && (!best || (c[k].updated||'')>(c[best].updated||''))) best=k; });
      a = best ? c[best] : null;
      label = stale ? 'Ukjent nå – data er ikke ferske' : 'Ingen agent kjører nå';
      if(best && !stale) label += ' · sist: '+NAMES[best];
      $('now').className='now card idle';
    }
    txt('who', label);
    txt('task', a && a.task ? a.task : 'Ingen oppgave registrert');
    if(a && a.total){
      var line = 'Steg '+a.step+' av '+a.total + (a.step_title ? ' · '+a.step_title : '');
      if(!act || stale) line = (a.status==='done' ? 'Fullført · ' : '') + line;
      txt('step', line);
      var pct = Math.max(0,Math.min(100, a.percent!=null ? a.percent : 100*a.step/a.total));
      $('bar').style.width = pct+'%'; $('barwrap').setAttribute('aria-valuenow', Math.round(pct));
      txt('pct', Math.round(pct)+' %');
      txt('eta', (act && !stale && a.eta_seconds) ? 'ca. '+mins(a.eta_seconds)+' igjen (estimat)' : '');
    } else { txt('step',''); $('bar').style.width='0%'; txt('pct',''); txt('eta',''); }
    if(d.next_run && d.next_run.time){
      txt('next', hm(d.next_run.time)); var dm=(new Date(d.next_run.time)-Date.now())/60000;
      txt('nextsub', (NAMES[d.next_run.agent]||'Agent') + (dm>0 ? ' · om '+mins(dm*60) : ''));
    } else { txt('next','–'); txt('nextsub',''); }
    txt('runs', d.today_runs!=null ? String(d.today_runs) : '–');
    if(d.queue && d.queue.length){ var q=$('queue'); q.textContent=''; d.queue.forEach(function(x){ var li=document.createElement('li'); li.textContent=x; q.appendChild(li); }); }
    var r=$('recent'); r.textContent='';
    (d.recent||[]).filter(function(x){ return x && typeof x.task==='string' && x.finished && !isNaN(new Date(x.finished)); }).slice(0,5).forEach(function(x){ var li=document.createElement('li'); var s=document.createElement('span'); s.className='t';
      s.textContent=(NAMES[x.agent]||'')+' · '+dayLabel(x.finished)+' '+hm(x.finished); li.appendChild(s); li.appendChild(document.createTextNode(x.task)); r.appendChild(li); });
    if(!r.children.length){ var li=document.createElement('li'); li.className='muted'; li.textContent='Ingen data ennå'; r.appendChild(li); }
    var u=$('upd');
    if(stale){ u.className='updated stale'; u.textContent='Sist oppdatert '+dayLabel(d.generated_at)+' kl. '+hm(d.generated_at)+(outside()?' · oppdateres 07:00–23:30':''); }
    else { u.className='updated'; u.textContent='Oppdatert kl. '+hm(d.generated_at); }
  }
  function outside(){ var s=new Date().toLocaleTimeString('nb-NO',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Oslo',hour12:false}); return s<'07:00'||s>'23:35'; }
  var last=null;
  function load(){
    fetch(SRC+'?t='+Date.now(), {cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); })
      .then(function(d){ last=d; render(d); })
      .catch(function(){ if(last){ render(last); } else { txt('who','Fant ingen live-data ennå'); $('upd').className='updated stale'; txt('upd','Prøver igjen om 30 sekunder'); } });
  }
  load(); setInterval(load, 30000);
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) load(); });
})();
