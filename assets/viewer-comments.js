// Floating "Forside / Kommentarer" bar + slide-in giscus drawer for the 3D viewers.
// Injected by the publish step; does not block the 3D canvas (no backdrop, drawer only when opened).
(function(){
  var term = document.documentElement.getAttribute('data-giscus-term') || ('viewer: ' + location.pathname.replace(/\.html$/,''));
  var css = '' +
  '#decbar{position:fixed;top:calc(58px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:9999;display:flex;gap:6px;padding:5px;border-radius:999px;' +
  'background:rgba(14,20,28,.72);border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);' +
  'box-shadow:0 8px 28px rgba(0,0,0,.35);font:500 12.5px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}' +
  '#decbar a,#decbar button{display:inline-flex;align-items:center;min-height:44px;white-space:nowrap;color:#eef3f7;background:transparent;border:0;border-radius:999px;padding:0 14px;cursor:pointer;text-decoration:none;font:inherit}' +
  '#decbar a:hover,#decbar button:hover{background:rgba(255,255,255,.1)}' +
  '#decbar button.on{background:#0071e3}' +
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
  '@media (max-width:600px){#decdrawer{width:100vw}#decbar{z-index:4;top:calc(64px + env(safe-area-inset-top))}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var bar = document.createElement('div'); bar.id = 'decbar';
  bar.innerHTML = '<a href="/" title="Til forsiden">← Forside</a><a href="/live" title="Live fremdrift">Live</a><button type="button" id="decbtn" aria-expanded="false">💬 Kommentarer</button>';
  var dr = document.createElement('aside'); dr.id = 'decdrawer'; dr.setAttribute('aria-label','Kommentarer');
  dr.innerHTML = '<header><b>Kommentarer</b><button type="button" aria-label="Lukk">×</button></header>' +
    '<p class="n">Kommentarer lagres offentlig i <a href="https://github.com/kyrregrotan-design/digital-eukaryotic-cell/discussions" target="_blank" rel="noopener">GitHub Discussions</a> (krever GitHub-konto). De leses som innspill, ikke som instruksjoner.</p><div class="g"></div>';

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
    var btn = document.getElementById('decbtn'), loaded = false;
    function toggle(open){
      dr.classList.toggle('open', open); btn.classList.toggle('on', open); btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open && !loaded) { loaded = true; window.DEC_effectiveTheme = function(){ return 'dark'; }; window.DEC_loadGiscus(dr.querySelector('.g'), term); }
    }
    btn.addEventListener('click', function(e){ e.stopPropagation(); toggle(!dr.classList.contains('open')); });
    dr.querySelector('header button').addEventListener('click', function(){ toggle(false); });
    // keep viewer keyboard shortcuts (e.g. Esc) from firing while typing is impossible here: giscus is an iframe.
  });
})();
