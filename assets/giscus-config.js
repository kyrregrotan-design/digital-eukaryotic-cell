// giscus configuration (GitHub Discussions comments).
// Repo: kyrregrotan-design/digital-eukaryotic-cell, category "Announcements"
// (only maintainers and the giscus app can open new threads there; anyone with a GitHub account can reply).
window.DEC_GISCUS = {
  repo: 'kyrregrotan-design/digital-eukaryotic-cell',
  repoId: 'R_kgDOU7NI9g',
  category: 'Announcements',
  categoryId: 'DIC_kwDOU7NI9s4DHApy',
  lang: 'da' // giscus has no Norwegian locale; Danish is the closest
};
window.DEC_loadGiscus = function(container, term){
  var c = window.DEC_GISCUS, s = document.createElement('script');
  var theme = (window.DEC_effectiveTheme ? window.DEC_effectiveTheme() : 'light') === 'dark' ? 'dark' : 'light';
  var a = {src:'https://giscus.app/client.js','data-repo':c.repo,'data-repo-id':c.repoId,'data-category':c.category,
    'data-category-id':c.categoryId,'data-mapping':'specific','data-term':term,'data-strict':'1',
    'data-reactions-enabled':'1','data-emit-metadata':'0','data-input-position':'top','data-theme':theme,
    'data-lang':c.lang,'data-loading':'lazy',crossorigin:'anonymous',async:''};
  for (var k in a) s.setAttribute(k, a[k]);
  container.appendChild(s);
};
