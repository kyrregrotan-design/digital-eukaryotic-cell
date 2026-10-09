/* © Kyrre Grøtan. All rights reserved. Inactive until the viewer adapter lands. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports)
    module.exports = factory(require('./navigation_controller.js'));
  else root.DigitalCellNavigationHistory = factory(root.DigitalCellNavigation);
})(typeof globalThis === 'object' ? globalThis : this, function (navigation) {
  'use strict';
  const NAMESPACE = '__digitalCellNavigation';
  const VERSION = 1;
  // Match the viewer's bootstrap regex, including duplicate/unknown body values.
  function bodyVariant(href) {
    const search = new URL(href).search;
    return /(?:^|[?&])body=shape2(?:&|$)/.test(search) ? 'shape2' :
      /(?:^|[?&])body=shape1(?:&|$)/.test(search) ? 'shape1' : 'default';
  }
  function createNativeNavigation(options) {
    const {browser, adapter, sessionId, viewerRevision, variant} = options;
    const history = browser.history;
    if (typeof adapter.recoverRoot !== 'function') throw new TypeError('Missing recoverRoot adapter');
    if (bodyVariant(browser.location.href) !== variant) throw new TypeError('Bootstrap variant mismatch');
    let controller, position = 0, chain = 0, recovery = 0, popGeneration = 0;
    let flight = null, wanted = null, restoring = false, queued = null, closed = false;
    let reloadRequired = false, reconciliationTarget = null, recovering = false;
    let suspended = false, authorityGeneration = 0;
    const slots = new Map();
    const departures = new Map();
    const waiters = [];
    const href = () => browser.location.href;
    function sync(value, name) {
      if (value && typeof value.then === 'function') {
        Promise.resolve(value).catch(() => {});
        throw new TypeError(name + ' must be synchronous');
      }
      return value;
    }
    function report(error, operation) {
      try { if (adapter.onError) adapter.onError(error, operation); } catch (_) {}
      return {status: 'failed', error};
    }
    function envelope(route, index) {
      const r = route.current;
      return {version: VERSION, chainId: sessionId + ':chain:' + chain,
        sessionId: r.sessionId, viewerRevision, variant, index,
        slotId: r.slotId, route};
    }
    function merged(route, index) {
      // Unrelated structured-clone fields are opaque; never pass them through our codec.
      const old = history.state;
      return {...(old && typeof old === 'object' ? old : {}),
        [NAMESPACE]: envelope(route, index)};
    }
    function replace(route, index = position) {
      history.replaceState(merged(route, index), '', href());
    }
    function owned(input) {
      const n = navigation.valueCopy(input && input[NAMESPACE]);
      const identity = controller.read().current;
      if (n.version !== VERSION || n.chainId !== sessionId + ':chain:' + chain ||
          n.sessionId !== identity.sessionId || n.viewerRevision !== viewerRevision ||
          n.variant !== variant || !Number.isSafeInteger(n.index) || n.index < 0 ||
          slots.get(n.index) !== n.slotId) throw new TypeError('Unowned history boundary');
      const route = controller.importRoute(n.route);
      if (route.current.slotId !== n.slotId) throw new TypeError('History slot mismatch');
      // Every retained ancestor must refer to the contiguous native chain.
      if (route.ancestors.length !== n.index || route.ancestors.some((r, i) => slots.get(i) !== r.slotId))
        throw new TypeError('Noncontiguous history route');
      return {index: n.index, route};
    }
    function assertCurrent() {
      if (reloadRequired || bodyVariant(href()) !== variant) throw new TypeError('Viewer reload required');
      const n = owned(history.state);
      if (n.index !== position || n.route.current.slotId !== controller.read().current.slotId)
        throw new TypeError('Browser entry changed before commit');
    }
    function commitRoute(event) {
      if (closed) throw new TypeError('History authority closed');
      if (event.operation === 'native' || (restoring && event.operation === 'home')) {
        // Browser already moved. Never push or traverse during reconciliation.
        if (bodyVariant(href()) !== variant) throw new TypeError('Viewer URL changed during restore');
        const active = owned(history.state);
        if (active.index !== position || active.route.current.slotId !== event.route.current.slotId)
          throw new TypeError('Native destination changed during restore');
        replace(event.route);
        // The browser already left the origin slot, so it cannot be replaceState'd.
        // Retain its actual-leave value in-session for a subsequent Forward visit.
        if ([...slots.values()].includes(event.previous.current.slotId))
          departures.set(event.previous.current.slotId, event.previous);
        departures.set(event.route.current.slotId, event.route);
        return;
      }
      assertCurrent();
      if (event.operation === 'enter') {
        replace(event.previous);
        if (closed) throw new TypeError('History authority closed during replace');
        const next = position + 1;
        history.pushState(merged(event.route, next), '', href());
        // Nothing fallible follows a successful push.
        for (const index of slots.keys()) if (index >= next) {
          departures.delete(slots.get(index)); slots.delete(index);
        }
        position = next;
        slots.set(position, event.route.current.slotId);
        departures.set(event.previous.current.slotId, event.previous);
        departures.set(event.route.current.slotId, event.route);
      } else {
        replace(event.route);
        departures.set(event.route.current.slotId, event.route);
      }
    }
    function makeController() {
      return navigation.createController({adapter, sessionId: recovery ?
        sessionId + ':recovery:' + recovery : sessionId, viewerRevision, variant, commitRoute});
    }
    controller = makeController();
    slots.set(0, controller.read().current.slotId);
    replace(controller.read()); // Initialization never pushes a sentinel.
    function settle(result) {
      for (const resolve of waiters.splice(0)) resolve(result);
    }
    function dropQueued(result) {
      if (queued) queued.resolve(result);
      queued = null;
    }
    function busy() { return !!flight || restoring; }
    function guard() {
      if (recovering || controller.inspect().committing)
        throw new TypeError('History cannot re-enter activation/recovery');
    }
    function queueCommand(method, target) {
      dropQueued({status: 'cancelled'});
      return new Promise(resolve => { queued = {method, target, resolve}; });
    }
    function enterOrLateral(method, target) {
      guard();
      if (closed) return Promise.resolve({status: 'closed'});
      let copy;
      try { copy = controller.validateTarget(target); }
      catch (error) { return Promise.resolve(report(error, method)); }
      if (busy()) return queueCommand(method, copy);
      if (reloadRequired) return Promise.resolve({status: 'reload-required'});
      try { assertCurrent(); } catch (error) { return Promise.resolve(recover(error)); }
      const currentView = controller.read().current.view;
      if (method === 'navigate' && currentView.kind === copy.kind && currentView.id === copy.id) {
        controller.cancel();
        return Promise.resolve({status: 'unchanged', route: controller.read()});
      }
      // Semantic room actions queued behind native traversal resolve their rank
      // against the reconciled destination, never the departing room.
      const action = method === 'navigate' ?
        currentView.kind === 'interior' && copy.kind === 'interior' ? 'lateral' : 'enter' : method;
      const authority = authorityGeneration;
      return controller[action](copy).then(result => {
        if (authority !== authorityGeneration) return result;
        if (!busy() && !closed) {
          try { assertCurrent(); } catch (error) { return recover(error); }
        }
        return result;
      });
    }
    function drain() {
      if (closed || busy() || wanted || !queued) return;
      const command = queued; queued = null;
      enterOrLateral(command.method, command.target).then(command.resolve);
    }
    function routeAt(route, index) {
      return navigation.valueCopy({current: route.ancestors[index], ancestors: route.ancestors.slice(0, index)});
    }
    function canTraverse(target) {
      if (target.index < 0 || target.index > position) return false;
      for (let i = target.index; i <= position; i++) if (!slots.has(i)) return false;
      return slots.get(target.index) === target.route.current.slotId;
    }
    function issue() {
      if (closed || busy() || !wanted) return;
      if (wanted.index === position) {
        const target = wanted; wanted = null;
        if (target.homeState) {
          const ticket = ++popGeneration;
          restoring = true;
          controller.home(target.homeState).then(result => {
            if (ticket !== popGeneration || closed) return;
            restoring = false;
            if (wanted) issue(); else { settle(result); drain(); }
          });
        } else { settle({status: 'committed', route: controller.read()}); drain(); }
        return;
      }
      try { assertCurrent(); } catch (error) { recover(error); return; }
      if (!canTraverse(wanted)) {
        wanted = null; settle({status: 'unavailable'}); drain(); return;
      }
      const delta = wanted.index - position;
      flight = {index: wanted.index};
      try { history.go(delta); }
      catch (error) { flight = null; wanted = null; settle(report(error, 'traverse')); drain(); }
    }
    function request(target) {
      wanted = target;
      const promise = new Promise(resolve => waiters.push(resolve));
      issue();
      return promise;
    }
    function back() {
      guard();
      if (closed) return Promise.resolve({status: 'closed'});
      if (!busy() && controller.inspect().pending) {
        controller.cancel(); return Promise.resolve({status: 'cancelled'});
      }
      dropQueued({status: 'cancelled'});
      const route = wanted ? wanted.route : reconciliationTarget || controller.read();
      if (!route.ancestors.length) return Promise.resolve({status: 'root'});
      const index = route.ancestors.length - 1;
      return request({index, route: routeAt(route, index)});
    }
    function ancestor(index) {
      guard();
      if (closed) return Promise.resolve({status: 'closed'});
      if (!busy() && controller.inspect().pending) {
        controller.cancel(); return Promise.resolve({status: 'cancelled'});
      }
      dropQueued({status: 'cancelled'});
      const route = wanted ? wanted.route : reconciliationTarget || controller.read();
      if (!Number.isInteger(index) || index < 0 || index >= route.ancestors.length)
        return Promise.resolve({status: 'unavailable'});
      return request({index, route: routeAt(route, index)});
    }
    function home(state) {
      guard();
      if (closed) return Promise.resolve({status: 'closed'});
      if (reloadRequired) return Promise.resolve({status: 'reload-required'});
      let saved;
      try { saved = navigation.stateCopy(state); }
      catch (error) { return Promise.resolve(report(error, 'home')); }
      if (!busy()) controller.cancel();
      dropQueued({status: 'cancelled'});
      const route = controller.read();
      return request({index: 0, route: route.ancestors.length ? routeAt(route, 0) : route,
        homeState: saved});
    }
    function recover(error, reason) {
      if (closed) return {status: 'closed'};
      recovering = true;
      controller.close(); chain++; recovery++; slots.clear(); departures.clear(); position = 0;
      wanted = null; flight = null;
      reloadRequired = bodyVariant(href()) !== variant;
      try {
        if (closed) return {status: 'closed'};
        sync(adapter.recoverRoot({error, reloadRequired, url: href(), variant, reason}), 'recoverRoot');
        if (closed) return {status: 'closed'};
        const replacement = makeController();
        if (closed) { replacement.close(); return {status: 'closed'}; }
        controller = replacement; slots.set(0, controller.read().current.slotId);
        replace(controller.read());
        if (closed) return {status: 'closed'};
        const result = {status: reloadRequired ? 'reload-required' : 'recovered', route: controller.read()};
        settle(result); dropQueued({status: 'cancelled'});
        return result;
      } catch (failure) {
        const result = report(failure, 'recovery');
        close(); settle(result); dropQueued({status: 'closed'});
        return {status: 'closed', error: failure};
      } finally { recovering = false; }
    }
    async function pop(event) {
      if (closed) return {status: 'closed'};
      const ticket = ++popGeneration;
      const expected = flight; flight = null;
      restoring = true; controller.cancel();
      const outgoing = controller.read();
      let result, appliedHome = null;
      try {
        if (bodyVariant(href()) !== variant) throw new TypeError('Foreign viewer URL requires reload');
        const destination = owned(event.state);
        if (!expected || destination.index !== expected.index) {
          wanted = null; settle({status: 'cancelled'}); dropQueued({status: 'cancelled'});
        }
        position = destination.index;
        let target = destination.route;
        const ancestorIndex = outgoing.ancestors.findIndex(r => r.slotId === target.current.slotId);
        if (wanted && wanted.homeState && wanted.index === position) {
          appliedHome = wanted;
          // home() uses the outgoing original root slot, which is this destination.
          result = await controller.home(wanted.homeState);
        } else {
          if (ancestorIndex >= 0) target = routeAt(outgoing, ancestorIndex);
          else if (departures.has(target.current.slotId)) target = departures.get(target.current.slotId);
          reconciliationTarget = target;
          result = await controller.restore(target, 'native');
        }
        if (ticket !== popGeneration) return {status: 'cancelled'};
        if (result.status !== 'committed') throw result.error || new Error('Native restore failed');
      } catch (error) {
        if (ticket !== popGeneration) return {status: 'cancelled'};
        result = recover(error);
      }
      if (ticket !== popGeneration) return {status: 'cancelled'};
      restoring = false;
      reconciliationTarget = null;
      if (wanted && wanted.index === position && (!wanted.homeState || wanted === appliedHome)) {
        wanted = null; settle(result);
      }
      if (wanted) issue(); else drain();
      return result;
    }
    const listener = event => { pop(event).catch(error => {
      if (!closed) { restoring = false; recover(error); }
    }); };
    browser.addEventListener('popstate', listener);
    function stopAuthority() {
      // pagehide must always win over activation, restoration and recovery.
      // It is not a navigation command and must never hit a reentry guard.
      browser.removeEventListener('popstate', listener);
      browser.removeEventListener('pagehide', hide);
      if (closed) return;
      closed = true; popGeneration++; authorityGeneration++;
      wanted = flight = reconciliationTarget = null; restoring = false;
      controller.close();
      settle({status: 'closed'}); dropQueued({status: 'closed'});
    }
    function close() {
      suspended = false;
      browser.removeEventListener('pageshow', show);
      stopAuthority();
    }
    function hide(event) {
      // A persisted document may return, but the old authority is terminal.
      // Its transactions and native waiters cannot survive the cache boundary.
      if (!event.persisted) { close(); return; }
      suspended = true;
      stopAuthority();
    }
    function show(event) {
      if (!event.persisted || !suspended) return;
      suspended = false;
      closed = false;
      browser.addEventListener('popstate', listener);
      browser.addEventListener('pagehide', hide);
      // The controller captures a root at construction. Recover the real scene
      // first, invalidate the old chain and replace this browser entry only.
      recover(new Error('Browser cache return requires a fresh navigation authority'), 'browser-cache');
    }
    browser.addEventListener('pagehide', hide);
    browser.addEventListener('pageshow', show);
    function checkpoint() {
      guard();
      if (closed) return {status: 'closed'};
      if (reloadRequired) return {status: 'reload-required'};
      if (busy()) return {status: 'unavailable'};
      try { assertCurrent(); } catch (error) { return recover(error); }
      return controller.checkpoint();
    }
    return Object.freeze({navigate: target => enterOrLateral('navigate', target),
      enter: target => enterOrLateral('enter', target),
      lateral: target => enterOrLateral('lateral', target), back, ancestor, home, checkpoint, close,
      read: () => controller.read(),
      inspect: () => Object.freeze({...controller.inspect(), position, chain,
        traversal: !!flight, restoring, queued: !!queued, targetIndex: wanted ? wanted.index : null,
        closed, suspended, reloadRequired})});
  }
  return Object.freeze({NAMESPACE, VERSION, bodyVariant, createNativeNavigation});
});
