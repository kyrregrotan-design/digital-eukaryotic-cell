/* © Kyrre Grøtan. All rights reserved. Opt-in Stage 2 integration slice. */
(function (root) {
  'use strict';
  root.DigitalCellLiveNavigation = function (h) {
    let recoveryNotice = null, retry = null, capabilityNotice = null;
    const oldRecovery = h.adapter.recoverRoot;
    h.adapter.recoverRoot = info => {
      const result = oldRecovery(info);
      retry = null; capabilityNotice = null;
      recoveryNotice = info.reloadRequired ?
        'View unavailable: this URL selects another cell body. Reload this URL to display it.' :
        info.reason === 'browser-cache' ?
        'Cell recovery view after browser cache return. Playback is paused; the previous visit was not restored.' :
        'Cell recovery view. Exact restoration failed; the saved visit is unavailable.';
      // Recovery establishes a new authority synchronously before this renders.
      root.queueMicrotask(() => render());
      return result;
    };
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
      '<div id="navigation-context"></div><div id="navigation-status" role="status" aria-live="polite"></div>' +
      '<button class="b" id="navigation-retry" hidden>Retry</button><button class="b" id="navigation-reload" hidden>Reload this URL</button>';
    document.body.appendChild(bar);
    document.getElementById('navigation-heading').style.cssText='white-space:nowrap;overflow-x:auto';
    document.getElementById('navigation-status').style.cssText='height:2.8em;overflow:auto';
    function label(v) { return v.kind === 'cell' ? 'Cell' : h.label(v.id) +
      (v.kind === 'closeup' ? ' close-up' : v.kind === 'molecule' ? ' molecular source view' : ' interior'); }
    // Failed entry/recovery instructions outrank incidental viewport announcements.
    // All layout callers use this owner, including resize outside render().
    function status(message) {
      const reason = retry && retry.reason && h.restriction && !h.restriction() ?
        'Ready to change views. Retry the view change.' : retry && retry.reason;
      const notice = reason ? [recoveryNotice,reason].filter(Boolean).join(' ') :
        recoveryNotice || (retry && 'View unavailable. Your current view was retained. Try again.');
      if (notice || capabilityNotice || message !== undefined)
        document.getElementById('navigation-status').textContent = [notice,capabilityNotice].filter(Boolean).join(' ') || message;
    }
    function render(message) {
      const route = nav.read(), views = [...route.ancestors, route.current], state = nav.inspect();
      const heading = document.getElementById('navigation-heading'); heading.replaceChildren();
      views.forEach((r, i) => {
        if (i) heading.append(' / ');
        const b = document.createElement('button'); b.className = 'b';
        b.textContent = recoveryNotice && i === views.length - 1 ?
          state.reloadRequired ? 'View unavailable — reload required' : 'Cell recovery view' :
          (i > 0 && i < views.length - 1 ? 'Return view: ' : i === views.length - 1 && i ? 'Viewing: ' : '') + label(r.view);
        if (i === views.length - 1) { b.setAttribute('aria-current', 'page'); b.disabled = true; }
        else b.onclick = () => dispatch('ancestor', i);
        heading.appendChild(b);
      });
      document.getElementById('navigation-back').disabled = !route.ancestors.length && !nav.inspect().pending;
      const selected = h.selectedComp();
      const closeupAvailable = route.current.view.kind === 'cell' && selected === 'golgi';
      const closeupButton = document.getElementById('navigation-closeup');
      closeupButton.disabled = state.reloadRequired;
      closeupButton.textContent = closeupAvailable ? 'Close-up' : 'Close-up information';
      closeupButton.title = closeupAvailable ? 'Open the existing Golgi close-up.' :
        'Close-up is available for selected Golgi. Other organelles use their schematic interior. Activate for information.';
      document.getElementById('navigation-enter').disabled = state.reloadRequired || !h.inwardTarget();
      document.getElementById('navigation-home').disabled = state.reloadRequired;
      document.getElementById('navigation-retry').hidden = !retry || state.reloadRequired;
      document.getElementById('navigation-reload').hidden = !state.reloadRequired;
      const returnView=route.ancestors.find(r=>r.view.kind==='closeup');
      document.getElementById('navigation-context').textContent=returnView && route.current.view.kind==='interior' && returnView.view.id!==route.current.view.id ?
        'Switched to another organelle. Back returns to '+label(returnView.view)+'. These are visited views, not anatomical containment.' : '';
      document.getElementById('crumb').textContent = recoveryNotice ?
        state.reloadRequired ? 'View unavailable — reload required' : 'Cell recovery view' : views.map(r => label(r.view)).join(' / ');
      status(message);
      h.layout();
    }
    async function dispatch(method, target, after) {
      const ticket = ++command;
      retry = null; capabilityNotice = null;
      // Application traversal must be rejected before history.go(), not after
      // its uncancellable popstate. Pending-entry Back remains a cancellation.
      const restriction = h.restriction && h.restriction();
      if (restriction && !(method === 'back' && nav.inspect().pending)) {
        retry = {method,target,after,reason:restriction};
        render();
        return {status:'failed',error:new TypeError(restriction)};
      }
      let result;
      try { const pending=nav[method](target); render('Changing view…'); result = await pending; }
      catch (error) { h.adapter.onError(error, method); result = {status:'failed'}; }
      if (ticket !== command) return result;
      if (result.status === 'failed') retry = {method, target, after,
        reason:result.error && /^(Close the narrated tour|Reset the signal cascade)/.test(result.error.message) ? result.error.message : null};
      if (result.status === 'committed') recoveryNotice = null;
      if (['committed','unchanged'].includes(result.status) && after) after();
      render(result.status === 'committed' ? 'Viewing ' + label(nav.read().current.view) + '. Playback is paused on return.' :
        result.status === 'failed' ? 'View unavailable. Your current view was retained. Try again.' : '');
      return result;
    }
    function enter(id, after) {
      const current = nav.read().current.view;
      const view = h.view(id);
      const state = nav.inspect(), moving = state.traversal || state.restoring;
      if (!moving && current.id === id && current.kind === view.kind) return dispatch('navigate',view,after);
      if (!moving && current.kind === 'molecule') return Promise.resolve({status:'unavailable'});
      return dispatch('navigate', view, after);
    }
    document.getElementById('navigation-back').onclick = () => dispatch('back');
    document.getElementById('navigation-closeup').onclick = () => {
      if (nav.read().current.view.kind !== 'cell' || h.selectedComp() !== 'golgi') {
        capabilityNotice='Close-up is available for selected Golgi. Other organelles use their schematic interior. No view was changed.';
        render();
        return;
      }
      dispatch('enter', {kind:'closeup',rank:1,id:'golgi'});
    };
    document.getElementById('navigation-enter').onclick = () => { const id=h.inwardTarget(); if(id) enter(id); };
    document.getElementById('navigation-home').onclick = () => dispatch('home', h.homeState());
    document.getElementById('navigation-retry').onclick = () => { if (retry) dispatch(retry.method, retry.target, retry.after); };
    document.getElementById('navigation-reload').onclick = () => root.location.reload();
    const oldCommit=h.adapter.onCommit;
    h.adapter.onCommit = e => { recoveryNotice = null; retry = null; if(oldCommit) oldCommit(e); render('Viewing ' + label(e.route.current.view) + '.'); };
    root.addEventListener('popstate', () => setTimeout(() => render(), 0));
    // Retire presentation tickets before settled old commands can render a
    // stale Retry/callback after the browser revives this document.
    root.addEventListener('pagehide', () => { command++; retry = null; capabilityNotice = null; });
    render();
    return Object.freeze({nav, enter, back: after => dispatch('back', undefined, after),
      home: after => dispatch('home', h.homeState(), after), render, status,
      closeup: after => dispatch('enter',{kind:'closeup',rank:1,id:'golgi'},after)});
  };
})(globalThis);
