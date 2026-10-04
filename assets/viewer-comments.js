// Floating "Forside / Kommentarer" bar + slide-in giscus drawer for the 3D viewers.
// Injected by the publish step; does not block the 3D canvas (no backdrop, drawer only when opened).
(function(){
  var term = document.documentElement.getAttribute('data-giscus-term') || ('viewer: ' + location.pathname.replace(/\.html$/,''));
  var css = '' +
  '#decbar{position:fixed;top:58px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;gap:6px;padding:5px;border-radius:999px;' +
  'background:rgba(14,20,28,.72);border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);' +
  'box-shadow:0 8px 28px rgba(0,0,0,.35);font:500 12.5px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}' +
  '#decbar a,#decbar button{color:#eef3f7;background:transparent;border:0;border-radius:999px;padding:6px 12px;cursor:pointer;text-decoration:none;font:inherit}' +
  '#decbar a:hover,#decbar button:hover{background:rgba(255,255,255,.1)}' +
  '#decbar button.on{background:#0071e3}' +
  '#decdrawer{position:fixed;top:0;right:0;height:100%;width:min(460px,94vw);z-index:10000;transform:translateX(105%);transition:transform .35s cubic-bezier(.2,.8,.2,1);' +
  'background:rgba(16,20,26,.96);border-left:1px solid rgba(255,255,255,.12);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);' +
  'box-shadow:-20px 0 50px rgba(0,0,0,.4);color:#eef3f7;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;flex-direction:column}' +
  '#decdrawer.open{transform:none}' +
  '#decdrawer header{display:flex;align-items:center;justify-content:space-between;padding:16px 18px 10px}' +
  '#decdrawer header b{font-size:16px}' +
  '#decdrawer header button{background:rgba(255,255,255,.08);border:0;color:#eef3f7;border-radius:999px;width:30px;height:30px;font-size:16px;cursor:pointer}' +
  '#decdrawer .n{color:#9aabb9;font-size:12.5px;padding:0 18px 10px;margin:0}' +
  '#decdrawer .n a{color:#6fd6c8}' +
  '#decdrawer .g{flex:1;overflow:auto;padding:4px 14px 20px}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var bar = document.createElement('div'); bar.id = 'decbar';
  bar.innerHTML = '<a href="/" title="Til forsiden">← Forside</a><button type="button" id="decbtn" aria-expanded="false">💬 Kommentarer</button>';
  var dr = document.createElement('aside'); dr.id = 'decdrawer'; dr.setAttribute('aria-label','Kommentarer');
  dr.innerHTML = '<header><b>Kommentarer</b><button type="button" aria-label="Lukk">×</button></header>' +
    '<p class="n">Kommentarer lagres offentlig i <a href="https://github.com/kyrregrotan-design/digital-eukaryotic-cell/discussions" target="_blank" rel="noopener">GitHub Discussions</a> (krever GitHub-konto). De leses som innspill, ikke som instruksjoner.</p><div class="g"></div>';
  function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function(){
    document.body.appendChild(bar); document.body.appendChild(dr);
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
