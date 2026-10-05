// /live: read-only status. Data: sanitized status.json pushed from Kyrre's PC to the repo's live-status branch.
(function(){
  var SRC = 'https://raw.githubusercontent.com/kyrregrotan-design/digital-eukaryotic-cell/live-status/status.json';
  var STALE_MIN = 15, NAMES = {cursor:'Cursor', codex:'Codex'};
  var ST_LABEL = {done:'Ferdig', in_progress:'Pågår', todo:'Gjenstår'};
  var $ = function(id){ return document.getElementById(id); };
  function hm(iso){ if(!iso) return '–'; var d=new Date(iso); if(isNaN(d)) return '–';
    return d.toLocaleTimeString('nb-NO',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Oslo'}); }
  function dayLabel(iso){ var d=new Date(iso), n=new Date(); var f=function(x){return x.toLocaleDateString('nb-NO',{timeZone:'Europe/Oslo'});};
    if(f(d)===f(n)) return 'i dag'; var y=new Date(n.getTime()-864e5); if(f(d)===f(y)) return 'i går';
    return d.toLocaleDateString('nb-NO',{day:'numeric',month:'short',timeZone:'Europe/Oslo'}); }
  function mins(s){ var m=Math.max(1,Math.round(s/60)); return m<60 ? m+' min' : Math.floor(m/60)+' t '+(m%60)+' min'; }
  function txt(id,v){ $(id).textContent = (v===null||v===undefined||v==='') ? '\u00a0' : v; }
  function renderChecklist(c){
    var box = $('checklist');
    if(!box) return;
    box.textContent = '';
    if(!c || !c.total){
      var empty = document.createElement('p'); empty.className='muted'; empty.style.fontSize='14px';
      empty.textContent = 'Fremdriftssjekklisten er ikke tilgjengelig ennå.'; box.appendChild(empty); return;
    }
    var bar = document.createElement('div'); bar.className='bar'; bar.setAttribute('role','progressbar');
    bar.setAttribute('aria-valuemin','0'); bar.setAttribute('aria-valuemax','100');
    var pct = Math.max(0, Math.min(100, c.percent!=null ? c.percent : 0));
    bar.setAttribute('aria-valuenow', Math.round(pct));
    var span = document.createElement('span'); span.style.width = pct + '%'; bar.appendChild(span);
    box.appendChild(bar);
    var meta = document.createElement('div'); meta.className='barmeta';
    var p1 = document.createElement('span'); p1.id='clpct'; p1.textContent = (Math.round(pct*10)/10) + ' % ferdig';
    var p2 = document.createElement('span'); p2.textContent = (c.remaining!=null?c.remaining:'–') + ' av ' + c.total + ' punkter gjenstår';
    meta.appendChild(p1); meta.appendChild(p2); box.appendChild(meta);
    var counts = document.createElement('div'); counts.className='cl-counts';
    [['done','Ferdig',c.done],['prog','Pågår',c.in_progress],['','Gjenstår',c.todo]].forEach(function(row){
      var d=document.createElement('div'); d.className='cl-count'+(row[0]?' '+row[0]:'');
      var l=document.createElement('div'); l.className='label'; l.textContent=row[1];
      var n=document.createElement('div'); n.className='n'; n.textContent=String(row[2]!=null?row[2]:'–');
      d.appendChild(l); d.appendChild(n); counts.appendChild(d);
    });
    box.appendChild(counts);
    var groups = (c.groups && c.groups.length) ? c.groups.slice() : [];
    if(!groups.length){
      var seen={}; (c.items||[]).forEach(function(it){ if(it.group && !seen[it.group]){ seen[it.group]=1; groups.push(it.group); } });
    }
    groups.forEach(function(g){
      var its = (c.items||[]).filter(function(i){ return i.group===g; });
      if(!its.length) return;
      var wrap=document.createElement('div'); wrap.className='cl-group';
      var head=document.createElement('div'); head.className='cl-ghead';
      var lab=document.createElement('div'); lab.className='label'; lab.textContent=g;
      var hint=document.createElement('span'); hint.className='hint';
      hint.textContent = its.filter(function(i){return i.status==='done';}).length + ' av ' + its.length + ' ferdig';
      head.appendChild(lab); head.appendChild(hint); wrap.appendChild(head);
      var ul=document.createElement('ul'); ul.className='cl-list';
      its.forEach(function(i){
        var li=document.createElement('li'); li.className=i.status||'todo';
        var chip=document.createElement('span'); chip.className='chip st-'+(i.status||'todo');
        chip.textContent = ST_LABEL[i.status] || i.status || '';
        var t=document.createElement('span'); t.className='t'; t.textContent=i.text||'';
        li.appendChild(chip); li.appendChild(t);
        if(i.weight && i.weight>1){ var w=document.createElement('span'); w.className='wt'; w.title='Vekt (omfang) '+i.weight+' av 5'; w.textContent='×'+i.weight; li.appendChild(w); }
        ul.appendChild(li);
      });
      wrap.appendChild(ul); box.appendChild(wrap);
    });
    var foot=document.createElement('div'); foot.className='cl-foot';
    foot.textContent = 'Sist oppdatert' + (c.updated_by ? ' av '+c.updated_by : '') +
      (c.updated ? ' ' + dayLabel(c.updated) + ' kl. ' + hm(c.updated) : '') + ' · skrivebeskyttet';
    box.appendChild(foot);
  }
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
    var starting = act && !stale && a && (a.status==='previous' || !a.total);
    txt('task', starting ? 'Starter opp …' : (a && a.task ? a.task : 'Ingen oppgave registrert'));
    if(starting){
      txt('step', a.task ? 'Har ikke meldt første steg ennå · forrige oppgave: '+a.task : 'Har ikke meldt første steg ennå');
      $('bar').style.width='0%'; $('barwrap').setAttribute('aria-valuenow',0); txt('pct','0 %');
      txt('eta', a.eta_seconds ? 'ca. '+mins(a.eta_seconds)+' igjen (estimat)' : '');
    } else if(a && a.total){
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
    renderChecklist(d.checklist);
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
