// Compact docking menu (Forside / Live / Kommentarer) + slide-in giscus drawer for the 3D viewers.
// Injected by the publish step; does not block the 3D canvas (no backdrop, drawer only when opened).
(function(){
  var term = document.documentElement.getAttribute('data-giscus-term') || ('viewer: ' + location.pathname.replace(/\.html$/,''));
  // Compact navigation (QA item 2, 2026-10-06): one small round button that docks in a free
  // corner of the 3D canvas (never on top of the viewer's own panels, chips or legend) and
  // expands into a small menu only when tapped.
  var css = '' +
  '#decbar{position:fixed;left:-9999px;top:0;z-index:9999;font:500 13px/1.2 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}' +
  '#decbar.low{z-index:4}' +
  '#decfab{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;color:#eef3f7;' +
  'background:rgba(22,28,36,.62);border:1px solid rgba(255,255,255,.14);backdrop-filter:saturate(180%) blur(16px);-webkit-backdrop-filter:saturate(180%) blur(16px);' +
  'box-shadow:0 4px 16px rgba(0,0,0,.28);transition:transform .18s ease,background .18s ease,opacity .18s ease;opacity:.82}' +
  '#decfab:hover,#decfab:focus-visible,#decbar.open #decfab{opacity:1;background:rgba(32,40,50,.82)}' +
  '#decfab:active{transform:scale(.94)}' +
  '#decfab:focus-visible,#decmenu a:focus-visible,#decmenu button:focus-visible{outline:2px solid #0a84ff;outline-offset:2px}' +
  '#decfab svg{width:18px;height:18px;display:block}' +
  '#decmenu{position:absolute;left:0;min-width:188px;padding:6px;border-radius:14px;display:flex;flex-direction:column;gap:2px;' +
  'background:rgba(22,28,36,.86);border:1px solid rgba(255,255,255,.12);backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px);' +
  'box-shadow:0 12px 36px rgba(0,0,0,.42);opacity:0;visibility:hidden;transform:scale(.96);transition:opacity .16s ease,transform .2s cubic-bezier(.2,.8,.2,1),visibility 0s linear .2s}' +
  '#decbar.up #decmenu{bottom:48px;transform-origin:0 100%}#decbar.down #decmenu{top:48px;transform-origin:0 0}' +
  '#decbar.right #decmenu{left:auto;right:0}#decbar.up.right #decmenu{transform-origin:100% 100%}#decbar.down.right #decmenu{transform-origin:100% 0}' +
  '#decbar.open #decmenu{opacity:1;visibility:visible;transform:none;transition:opacity .16s ease,transform .2s cubic-bezier(.2,.8,.2,1)}' +
  '#decmenu a,#decmenu button{display:flex;align-items:center;gap:10px;min-height:40px;padding:0 12px;border-radius:9px;color:#eef3f7;background:transparent;border:0;text-decoration:none;font:inherit;text-align:left;cursor:pointer;white-space:nowrap}' +
  '#decmenu a:hover,#decmenu button:hover{background:rgba(255,255,255,.09)}' +
  '#decmenu button.on{background:#0a84ff}' +
  '#decmenu .i{width:18px;text-align:center;opacity:.85}' +
  '@media (pointer:coarse){#decfab{width:44px;height:44px}#decmenu a,#decmenu button{min-height:44px}#decbar.up #decmenu{bottom:52px}#decbar.down #decmenu{top:52px}}' +
  '@media (prefers-reduced-motion:reduce){#decfab,#decmenu{transition:none!important}}' +
  '#decdrawer{position:fixed;top:0;right:0;height:100%;width:min(460px,94vw);z-index:10000;transform:translateX(105%);transition:transform .35s cubic-bezier(.2,.8,.2,1);' +
  'background:rgba(16,20,26,.96);border-left:1px solid rgba(255,255,255,.12);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);' +
  'box-shadow:-20px 0 50px rgba(0,0,0,.4);color:#eef3f7;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;flex-direction:column}' +
  '#decdrawer.open{transform:none}' +
  '#decdrawer header{display:flex;align-items:center;justify-content:space-between;padding:calc(12px + env(safe-area-inset-top)) 14px 8px 18px}' +
  '#decdrawer header b{font-size:16px}' +
  '#decdrawer header button{background:rgba(255,255,255,.08);border:0;color:#eef3f7;border-radius:999px;width:44px;height:44px;font-size:20px;cursor:pointer}' +
  '#decdrawer .n{color:#9aabb9;font-size:12.5px;padding:0 18px 10px;margin:0}' +
  '#decdrawer .n a{color:#6fd6c8}' +
  '#decdrawer .g{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;padding:4px 14px calc(20px + env(safe-area-inset-bottom))}' +
  '@media (max-width:600px){#decdrawer{width:100vw}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var bar = document.createElement('div'); bar.id = 'decbar'; bar.className = 'down';
  bar.innerHTML = '<button type="button" id="decfab" aria-label="Meny: Forside, Live, Kommentarer" aria-haspopup="true" aria-expanded="false" aria-controls="decmenu">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>' +
    '<div id="decmenu" role="menu"><a role="menuitem" href="/" title="Til forsiden"><span class="i">←</span>Forside</a>' +
    '<a role="menuitem" href="/live" title="Live fremdrift"><span class="i">●</span>Live</a>' +
    '<button role="menuitem" type="button" id="decbtn" aria-expanded="false"><span class="i">💬</span>Kommentarer</button></div>';
  var dr = document.createElement('aside'); dr.id = 'decdrawer'; dr.setAttribute('aria-label','Kommentarer');
  dr.innerHTML = '<header><b>Kommentarer</b><button type="button" aria-label="Lukk">×</button></header>' +
    '<p class="n">Kommentarer lagres offentlig i <a href="https://github.com/kyrregrotan-design/digital-eukaryotic-cell/discussions" target="_blank" rel="noopener">GitHub Discussions</a> (krever GitHub-konto). De leses som innspill, ikke som instruksjoner.</p><div class="g"></div>';

  // ---- docking: find a free corner of the main canvas ----
  var GAP = 12;
  function safeInsets(){
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;top:env(safe-area-inset-top,0px);left:env(safe-area-inset-left,0px);right:env(safe-area-inset-right,0px);bottom:env(safe-area-inset-bottom,0px)';
    document.body.appendChild(d); var cs = getComputedStyle(d);
    var r = {t: parseFloat(cs.top)||0, l: parseFloat(cs.left)||0, r: parseFloat(cs.right)||0, b: parseFloat(cs.bottom)||0};
    d.remove(); return r;
  }
  var insets = {t:0,l:0,r:0,b:0};
  function mainCanvas(){
    var best = null, area = 0;
    document.querySelectorAll('canvas').forEach(function(c){ var r = c.getBoundingClientRect(), a = r.width * r.height; if (a > area) { area = a; best = r; } });
    return best;
  }
  function obstacles(){
    var out = [];
    var els = document.body.getElementsByTagName('*');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el === bar || el === dr || bar.contains(el) || dr.contains(el) || el.tagName === 'CANVAS' || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
      var cs = getComputedStyle(el);
      if (cs.position !== 'fixed' && cs.position !== 'absolute' && cs.position !== 'sticky') continue;
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
      var anc = el.parentElement, nested = false;
      while (anc && anc !== document.body) { var p = getComputedStyle(anc).position; if (p === 'fixed' || p === 'absolute') { nested = true; break; } anc = anc.parentElement; }
      if (nested) continue;
      var r = el.getBoundingClientRect();
      if (r.width < 6 || r.height < 6 || r.right <= 0 || r.bottom <= 0 || r.left >= innerWidth || r.top >= innerHeight) continue;
      out.push(r);
    }
    return out;
  }
  function hits(x, y, s, obs){
    var pad = 6;
    for (var i = 0; i < obs.length; i++) { var o = obs[i];
      if (x < o.right + pad && x + s > o.left - pad && y < o.bottom + pad && y + s > o.top - pad) return true; }
    return false;
  }
  var lastKey = '';
  function place(){
    if (bar.classList.contains('open')) return;           // never move while the menu is open
    var s = document.getElementById('decfab').offsetWidth || 40;
    var c = mainCanvas(); var W = innerWidth, H = innerHeight;
    var L = Math.max(c ? c.left : 0, 0) + GAP + insets.l, R = Math.min(c ? c.right : W, W) - GAP - insets.r - s;
    var T = Math.max(c ? c.top : 0, 0) + GAP + insets.t, B = Math.min(c ? c.bottom : H, H) - GAP - insets.b - s;
    var obs = obstacles(), pos = null, step = 8, x, y;
    // 1) top edge, from the left;  2) bottom edge, from the left;  3) top edge from the right; 4) bottom edge from the right
    var tries = [[T, 1], [B, 1]];
    for (var k = 0; k < tries.length && !pos; k++) {
      y = tries[k][0];
      for (x = L; x <= R; x += step) { if (!hits(x, y, s, obs)) { pos = [x, y]; break; } }
    }
    // 5) left and right edges, top to bottom
    if (!pos) for (y = T; y <= B && !pos; y += step) { if (!hits(L, y, s, obs)) pos = [L, y]; else if (!hits(R, y, s, obs)) pos = [R, y]; }
    var low = false;
    if (!pos) { pos = [GAP + insets.l, H - GAP - insets.b - s]; low = true; }   // nothing free: sit underneath the viewer UI
    var key = pos.join(',') + low;
    if (key === lastKey) return; lastKey = key;
    bar.style.left = Math.round(pos[0]) + 'px'; bar.style.top = Math.round(pos[1]) + 'px';
    bar.classList.toggle('low', low);
    bar.classList.toggle('up', pos[1] > H / 2); bar.classList.toggle('down', pos[1] <= H / 2);
    bar.classList.toggle('right', pos[0] > W / 2);
  }
  // Throttled: at most one layout scan every 500 ms, and none while the tab is hidden (cheap on weak phones).
  var queued = false, lastRun = 0;
  function schedule(){
    if (queued || document.hidden) return; queued = true;
    var wait = Math.max(0, 500 - (Date.now() - lastRun));
    setTimeout(function(){ requestAnimationFrame(function(){ queued = false; lastRun = Date.now(); place(); }); }, wait);
  }

  // ---- mobile touch support for the published copy (public-site addition) ----
  // The viewers use pointer events + mouse wheel. On phones, stop the browser from panning/zooming
  // the page over the 3D canvas, and turn a two-finger pinch into wheel zoom on the canvas.
  var tcss = document.createElement('style');
  tcss.textContent = 'canvas{touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}' +
    '@media (pointer:coarse){.opener,.icon-btn{min-height:44px;min-width:44px}}';
  document.head.appendChild(tcss);
  function pinchShim(){
    var cv = document.getElementById('gl') || document.querySelector('canvas'); if (!cv) return;
    var last = null, acc = 0;
    function dist(t){ var dx=t[0].clientX-t[1].clientX, dy=t[0].clientY-t[1].clientY; return Math.sqrt(dx*dx+dy*dy); }
    cv.addEventListener('touchstart', function(e){ if (e.touches.length === 2) { last = dist(e.touches); e.preventDefault(); } }, {passive:false});
    cv.addEventListener('touchmove', function(e){
      if (e.touches.length !== 2 || last === null) return;
      e.preventDefault();
      var d = dist(e.touches), cx = (e.touches[0].clientX+e.touches[1].clientX)/2, cy = (e.touches[0].clientY+e.touches[1].clientY)/2;
      acc += (last - d); last = d;   // viewer zooms a fixed 10 % per wheel event, so send one per ~18 px of pinch
      while (Math.abs(acc) >= 18) { var s = acc > 0 ? 1 : -1; acc -= s * 18;
        cv.dispatchEvent(new WheelEvent('wheel', {deltaY: s * 100, deltaMode: 0, clientX: cx, clientY: cy, bubbles: true, cancelable: true})); }
    }, {passive:false});
    cv.addEventListener('touchend', function(e){ if (e.touches.length < 2) { last = null; acc = 0; } });
    document.addEventListener('gesturestart', function(e){ if (e.target === cv) e.preventDefault(); });
  }
  function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function(){
    document.body.appendChild(bar); document.body.appendChild(dr); pinchShim();
    insets = safeInsets();
    var btn = document.getElementById('decbtn'), fab = document.getElementById('decfab'), loaded = false;
    function menu(open){
      if (open) { lastKey = ''; place(); }
      bar.classList.toggle('open', open); fab.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    function toggle(open){
      dr.classList.toggle('open', open); btn.classList.toggle('on', open); btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open && !loaded) { loaded = true; window.DEC_effectiveTheme = function(){ return 'dark'; }; window.DEC_loadGiscus(dr.querySelector('.g'), term); }
    }
    fab.addEventListener('click', function(e){ e.stopPropagation(); menu(!bar.classList.contains('open')); });
    btn.addEventListener('click', function(e){ e.stopPropagation(); menu(false); toggle(!dr.classList.contains('open')); });
    dr.querySelector('header button').addEventListener('click', function(){ toggle(false); });
    document.addEventListener('pointerdown', function(e){ if (bar.classList.contains('open') && !bar.contains(e.target)) menu(false); }, true);
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && bar.classList.contains('open')) { e.stopPropagation(); e.preventDefault(); menu(false); fab.focus(); }
    }, true);
    // Re-dock when the viewer's layout changes (panels opened/closed, resize, rotation).
    addEventListener('resize', function(){ insets = safeInsets(); schedule(); });
    addEventListener('orientationchange', function(){ setTimeout(function(){ insets = safeInsets(); schedule(); }, 250); });
    if (window.MutationObserver) new MutationObserver(function(muts){
      for (var i = 0; i < muts.length; i++) { var t = muts[i].target; if (t !== bar && !bar.contains(t) && !dr.contains(t)) { schedule(); return; } }
    }).observe(document.body, {attributes: true, attributeFilter: ['class', 'style', 'hidden'], subtree: true, childList: true});
    document.addEventListener('transitionend', schedule, true);
    setInterval(schedule, 2000);
    place(); setTimeout(schedule, 600); setTimeout(schedule, 2500);
  });
})();
