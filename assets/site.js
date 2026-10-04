// Theme toggle (light/dark/auto) + giscus loader. No tracking.
(function(){
  var KEY='dec-site-theme', root=document.documentElement;
  function apply(t){ if(t==='light'||t==='dark'){root.setAttribute('data-theme',t);} else {root.removeAttribute('data-theme');} }
  apply(localStorage.getItem(KEY));
  function effective(){ var t=root.getAttribute('data-theme'); if(t) return t; return matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'; }
  window.DEC_effectiveTheme=effective;
  document.addEventListener('DOMContentLoaded',function(){
    var b=document.querySelector('.theme');
    if(b){ var lab=function(){b.textContent=effective()==='dark'?'Lys':'Mørk';}; lab();
      b.addEventListener('click',function(){ var n=effective()==='dark'?'light':'dark'; localStorage.setItem(KEY,n); apply(n); lab();
        var f=document.querySelector('iframe.giscus-frame'); if(f){ f.contentWindow.postMessage({giscus:{setConfig:{theme:n==='dark'?'dark':'light'}}},'https://giscus.app'); } }); }
    document.querySelectorAll('[data-giscus-term]').forEach(function(el){ window.DEC_loadGiscus(el, el.getAttribute('data-giscus-term')); });
  });
})();
