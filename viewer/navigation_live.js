/* © Kyrre Grøtan. All rights reserved. Opt-in Stage 2 integration slice. */
(function (root) {
  'use strict';
  root.DigitalCellLiveNavigation = function (h) {
    const nav = root.DigitalCellNavigationHistory.createNativeNavigation({
      browser: root, adapter: h.adapter, sessionId: root.crypto.randomUUID(),
      viewerRevision: 'stage2-live-2026-10-09-v1',
      variant: root.DigitalCellNavigationHistory.bodyVariant(root.location.href)
    });
    let command = 0;
    const bar = document.createElement('nav');
    bar.id = 'navigation-levels'; bar.setAttribute('aria-label', 'Visited views');
    bar.className = 'panel';
    bar.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:16px;z-index:5;max-width:calc(100vw - 32px);padding:8px;font-size:.72rem';
    bar.innerHTML = '<div id="navigation-heading" tabindex="-1">Cell</div><div class="row">' +
      '<button class="b" id="navigation-back">Back</button><button class="b" id="navigation-closeup">Close-up</button>' +
      '<button class="b" id="navigation-enter">Enter</button><button class="b" id="navigation-home">Whole cell (reset)</button></div>' +
      '<div id="navigation-context"></div><div id="navigation-status" role="status" aria-live="polite"></div>';
    document.body.appendChild(bar);
    document.getElementById('navigation-heading').style.cssText='white-space:nowrap;overflow-x:auto';
    document.getElementById('navigation-status').style.cssText='height:2.8em;overflow:auto';
    function label(v) { return v.kind === 'cell' ? 'Cell' : h.label(v.id) +
      (v.kind === 'closeup' ? ' close-up' : v.kind === 'molecule' ? ' molecular source view' : ' interior'); }
    function render(message) {
      const route = nav.read(), views = [...route.ancestors, route.current];
      const heading = document.getElementById('navigation-heading'); heading.replaceChildren();
      views.forEach((r, i) => {
        if (i) heading.append(' / ');
        const b = document.createElement('button'); b.className = 'b';
        b.textContent = (i > 0 && i < views.length - 1 ? 'Return view: ' : i === views.length - 1 && i ? 'Viewing: ' : '') + label(r.view);
        if (i === views.length - 1) { b.setAttribute('aria-current', 'page'); b.disabled = true; }
        else b.onclick = () => dispatch('ancestor', i);
        heading.appendChild(b);
      });
      document.getElementById('navigation-back').disabled = !route.ancestors.length && !nav.inspect().pending;
      const selected = h.selectedComp();
      document.getElementById('navigation-closeup').disabled = route.current.view.kind !== 'cell' || selected !== 'golgi';
      document.getElementById('navigation-closeup').title = 'Only the existing Golgi close-up is available. Other organelles use their schematic interior.';
      document.getElementById('navigation-enter').disabled = !h.inwardTarget();
      const returnView=route.ancestors.find(r=>r.view.kind==='closeup');
      document.getElementById('navigation-context').textContent=returnView && route.current.view.kind==='interior' && returnView.view.id!==route.current.view.id ?
        'Switched to another organelle. Back returns to '+label(returnView.view)+'. These are visited views, not anatomical containment.' : '';
      if (message) document.getElementById('navigation-status').textContent = message;
      document.getElementById('crumb').textContent = views.map(r => label(r.view)).join(' / ');
      h.layout();
    }
    async function dispatch(method, target, after) {
      const ticket = ++command;
      let result;
      try { const pending=nav[method](target); render(); result = await pending; }
      catch (error) { h.adapter.onError(error, method); return {status:'failed'}; }
      if (result.status === 'committed' && ticket === command && after) after();
      render(result.status === 'committed' ? 'Viewing ' + label(nav.read().current.view) + '. Playback is paused on return.' :
        result.status === 'failed' ? 'View unavailable. Your current view was retained. Try again.' : '');
      return result;
    }
    function enter(id, after) {
      const current = nav.read().current.view;
      const view = h.view(id);
      if (current.id === id && current.kind === view.kind) { if (after) after(); return Promise.resolve({status:'unchanged'}); }
      if (current.kind === 'molecule') return Promise.resolve({status:'unavailable'});
      return dispatch(current.kind === 'interior' && view.kind === 'interior' ? 'lateral' : 'enter', view, after);
    }
    document.getElementById('navigation-back').onclick = () => dispatch('back');
    document.getElementById('navigation-closeup').onclick = () => dispatch('enter', {kind:'closeup',rank:1,id:'golgi'});
    document.getElementById('navigation-enter').onclick = () => { const id=h.inwardTarget(); if(id) enter(id); };
    document.getElementById('navigation-home').onclick = () => dispatch('home', h.homeState());
    const oldCommit=h.adapter.onCommit;
    h.adapter.onCommit = e => { if(oldCommit) oldCommit(e); render('Viewing ' + label(e.route.current.view) + '.'); };
    root.addEventListener('popstate', () => setTimeout(() => render(), 0));
    render();
    return Object.freeze({nav, enter, back: after => dispatch('back', undefined, after),
      home: after => dispatch('home', h.homeState(), after), render,
      closeup: () => dispatch('enter',{kind:'closeup',rank:1,id:'golgi'})});
  };
})(globalThis);
