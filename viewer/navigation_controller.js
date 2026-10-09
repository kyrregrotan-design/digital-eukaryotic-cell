/* © Kyrre Grøtan. All rights reserved.
 * Stage 2 foundation. Viewer loads the value codec for semantic room hooks;
 * no live controller is instantiated until the dispatcher slice lands.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DigitalCellNavigation = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const SCHEMA = 1;
  const DETAIL_TYPES = new Set(['overview', 'compartment', 'process', 'gene',
    'pathway', 'complex', 'carrier', 'protein', 'atlas', 'anatomy',
    'search', 'molecular', 'host', 'interior-pick', 'report']);

  // Copy data, never serialize live objects, accessors, callbacks or nonfinite values.
  function valueCopy(input) {
    const seen = new Set();
    let count = 0;
    function copy(value, depth) {
      if (++count > 20000 || depth > 32) throw new TypeError('Snapshot too large');
      if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value !== 'object') throw new TypeError('Snapshot must contain finite plain values');
      const proto = Object.getPrototypeOf(value);
      if (!Array.isArray(value) && proto !== Object.prototype && proto !== null)
        throw new TypeError('Live objects are not snapshots');
      if (seen.has(value)) throw new TypeError('Cyclic snapshot');
      seen.add(value);
      const output = Array.isArray(value) ? [] : {};
      for (const key of Reflect.ownKeys(value)) {
        if (Array.isArray(value) && key === 'length') continue;
        if (typeof key !== 'string' || ['__proto__', 'prototype', 'constructor'].includes(key))
          throw new TypeError('Unsafe snapshot key');
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value'))
          throw new TypeError('Snapshot accessors/hidden properties are not supported');
        if (Array.isArray(value) && !/^(0|[1-9][0-9]*)$/.test(key))
          throw new TypeError('Array properties are not snapshot values');
        output[key] = copy(descriptor.value, depth + 1);
      }
      if (Array.isArray(value) && (output.length !== value.length ||
          Object.keys(output).length !== value.length)) throw new TypeError('Sparse snapshot array');
      seen.delete(value);
      return Object.freeze(output);
    }
    return copy(input, 0);
  }

  function requireObject(value, name) {
    if (!value || Array.isArray(value) || typeof value !== 'object')
      throw new TypeError('Missing snapshot ' + name);
  }
  function vector(value, length, name) {
    if (!Array.isArray(value) || value.length !== length ||
        value.some(n => typeof n !== 'number' || !Number.isFinite(n)))
      throw new TypeError('Invalid ' + name);
  }
  function pose(value) {
    requireObject(value, 'pose');
    for (const key of ['yaw', 'pitch', 'dist'])
      if (!Number.isFinite(value[key])) throw new TypeError('Invalid camera ' + key);
    if (value.dist <= 0) throw new TypeError('Invalid camera distance');
    vector(value.target, 3, 'camera target');
  }
  function stateCopy(input) {
    const state = valueCopy(input);
    requireObject(state, 'state');
    for (const name of ['camera', 'projection', 'clipping', 'visibility', 'selection',
      'detail', 'panels', 'room', 'owners', 'viewport']) requireObject(state[name], name);
    pose(state.camera.displayed);
    pose(state.camera.goal);
    if (Object.hasOwn(state.camera, 'capturedGoal')) pose(state.camera.capturedGoal);
    if (typeof state.camera.userZoomed !== 'boolean') throw new TypeError('Missing zoom flag');
    const p = state.projection;
    if (!['fov', 'near', 'far', 'zoom'].every(k => Number.isFinite(p[k])) ||
        !(p.fov > 0 && p.fov < 180 && p.near > 0 && p.far > p.near && p.zoom > 0))
      throw new TypeError('Invalid projection');
    if (p.viewOffset !== null) {
      requireObject(p.viewOffset, 'view offset');
      if (typeof p.viewOffset.enabled !== 'boolean' ||
          !['fullWidth', 'fullHeight', 'offsetX', 'offsetY', 'width', 'height']
            .every(k => Number.isFinite(p.viewOffset[k])) ||
          !['fullWidth', 'fullHeight', 'width', 'height'].every(k => p.viewOffset[k] > 0))
        throw new TypeError('Invalid view offset');
    }
    if (Object.hasOwn(state.visibility, 'types')) {
      requireObject(state.visibility.types, 'type visibility');
      if (Object.values(state.visibility.types).some(v => typeof v !== 'boolean'))
        throw new TypeError('Invalid type visibility flag');
    }
    if (typeof state.clipping.enabled !== 'boolean') throw new TypeError('Invalid clipping flag');
    vector(state.clipping.normal, 3, 'clip normal');
    if (!Number.isFinite(state.clipping.constant)) throw new TypeError('Invalid clipping constant');
    if (!DETAIL_TYPES.has(state.detail.type)) throw new TypeError('Unregistered detail destination');
    if (typeof state.returnFocus !== 'string') throw new TypeError('Missing semantic return focus');
    for (const key of ['spin', 'guidedPlaying', 'tourPlaying', 'ceaj', 'speech'])
      if (typeof state.owners[key] !== 'boolean') throw new TypeError('Missing camera owner ' + key);
    if (typeof state.room.playing !== 'boolean') throw new TypeError('Missing room playback');
    const v = state.viewport;
    if (!['width', 'height', 'dpr'].every(k => Number.isFinite(v[k]) && v[k] > 0))
      throw new TypeError('Invalid viewport');
    vector(v.renderRect, 4, 'render rectangle');
    if (v.renderRect[2] <= 0 || v.renderRect[3] <= 0) throw new TypeError('Empty render rectangle');
    // Room IDs/control IDs/detail args require the viewer adapter's own semantic validation.
    return state;
  }

  function pausedRestore(input) {
    const saved = stateCopy(input);
    return stateCopy({...saved, camera: {...saved.camera,
      capturedGoal: saved.camera.capturedGoal || saved.camera.goal, goal: saved.camera.displayed},
      owners: {...saved.owners, spin: false, guidedPlaying: false,
        tourPlaying: false, ceaj: false, speech: false},
      room: {...saved.room, playing: false}});
  }

  function createController(options) {
    const {adapter, sessionId, viewerRevision, variant} = options;
    if (![sessionId, viewerRevision, variant].every(v => typeof v === 'string' && v.length))
      throw new TypeError('Controller identity required');
    for (const method of ['capture', 'validateView', 'validateState', 'prepare',
      'activate', 'rollback', 'discard']) if (typeof adapter[method] !== 'function')
        throw new TypeError('Missing adapter ' + method);
    let sequence = 0, generation = 0, pending = null, committed = null, closed = false;
    let committing = false;
    const identity = Object.freeze({schema: SCHEMA, sessionId, viewerRevision, variant});
    const id = prefix => sessionId + ':' + prefix + ':' + (++sequence);
    function guardDispatch() {
      if (committing) throw new TypeError('Navigation cannot re-enter atomic activation/recovery');
    }
    function viewCopy(view) {
      const v = valueCopy(view);
      requireObject(v, 'view');
      const ranks = {cell: 0, closeup: 1, interior: 2, molecule: 3};
      if (!Object.hasOwn(ranks, v.kind) || v.rank !== ranks[v.kind] ||
          typeof v.id !== 'string' || adapter.validateView(v) !== true)
        throw new TypeError('Unavailable navigation view');
      return v;
    }
    function checkedState(state, view) {
      const s = stateCopy(state);
      if (adapter.validateState(s, view) !== true) throw new TypeError('Unavailable semantic state');
      return s;
    }
    function record(view, state, slotId) {
      return valueCopy({...identity, slotId: slotId || id('slot'), snapshotId: id('snapshot'),
        view: viewCopy(view), state: checkedState(state, view)});
    }
    function route(current, ancestors) {
      return valueCopy({current, ancestors});
    }
    function refreshCurrent() {
      return record(committed.current.view, adapter.capture(committed.current.view),
        committed.current.slotId);
    }
    function validateRecord(r) {
      requireObject(r, 'record');
      for (const key of Object.keys(identity)) if (r[key] !== identity[key])
        throw new TypeError('Foreign snapshot identity');
      for (const key of ['slotId', 'snapshotId'])
        if (typeof r[key] !== 'string' || !r[key].startsWith(sessionId + ':'))
          throw new TypeError('Invalid snapshot identity');
      const view = viewCopy(r.view);
      checkedState(r.state, view);
      return r;
    }
    function importRoute(input) {
      const r = valueCopy(input);
      requireObject(r, 'route');
      if (!Array.isArray(r.ancestors) || r.ancestors.length > 16)
        throw new TypeError('Invalid ancestors');
      const records = [...r.ancestors, r.current].map(validateRecord);
      if (records[0].view.kind !== 'cell' ||
          new Set(records.map(v => v.slotId)).size !== records.length)
        throw new TypeError('Invalid route root/slots');
      if (records.some((v, i) => i && v.view.rank <= records[i - 1].view.rank))
        throw new TypeError('Invalid visited rank order');
      return r;
    }
    function cancel() {
      generation++;
      if (!pending) return false;
      const ticket = pending;
      pending = null;
      ticket.abort.abort();
      return true;
    }
    function report(error, operation) {
      if (adapter.onError) {
        try { adapter.onError(error, operation); } catch (_) { /* Notifications cannot navigate. */ }
      }
      return {status: 'failed', error};
    }
    function synchronous(value, name) {
      if (value && typeof value.then === 'function') {
        Promise.resolve(value).catch(() => {});
        throw new TypeError(name + ' must be synchronous');
      }
      return value;
    }
    function discard(prepared) {
      try { synchronous(adapter.discard(prepared), 'discard'); }
      catch (error) { report(error, 'discard'); }
    }
    async function transaction(operation, view, restoreRoute) {
      if (closed) return {status: 'closed'};
      const intendedGeneration = generation + 1;
      cancel();
      // abort() is synchronous: an old preparation's listener may dispatch a
      // newer command. Never overwrite that command's ticket or share its token.
      if (closed || generation !== intendedGeneration) return {status: 'cancelled'};
      const ticket = {generation, abort: new AbortController(), operation, restoreRoute};
      pending = ticket;
      const isCurrent = () => !closed && generation === ticket.generation;
      const context = Object.freeze({generation, signal: ticket.abort.signal, isCurrent,
        operation, restore: !!restoreRoute});
      let prepared, previous, activationStarted = false;
      try {
        prepared = await adapter.prepare(view, context);
        if (!isCurrent()) {
          discard(prepared);
          return {status: 'cancelled'};
        }
        committing = true;
        // Capture at actual leave, after preparation but before releasing any owner.
        const outgoing = refreshCurrent();
        if (!isCurrent()) { committing = false; discard(prepared); return {status: 'cancelled'}; }
        previous = route(outgoing, committed.ancestors);
        const restoreState = restoreRoute ? pausedRestore(restoreRoute.current.state) : null;
        // activate MUST be synchronous, atomic and must not re-enter the dispatcher.
        // Viewer release/layout/resize precedes final displayed-pose restoration.
        activationStarted = true;
        synchronous(adapter.activate(prepared, {view, state: restoreState, context}), 'activate');
        if (!isCurrent()) { committing = false; discard(prepared); return {status: 'cancelled'}; }
        const state = checkedState(adapter.capture(view), view);
        if (!isCurrent()) { committing = false; discard(prepared); return {status: 'cancelled'}; }
        const current = record(view, state, restoreRoute ? restoreRoute.current.slotId :
          operation === 'lateral' || operation === 'home' ? outgoing.slotId : undefined);
        const ancestors = restoreRoute ? restoreRoute.ancestors :
          operation === 'enter' ? [...committed.ancestors, outgoing] : committed.ancestors;
        const candidate = route(current, ancestors);
        // Fallible native history work belongs inside the atomic transaction.
        // The notification below is deliberately not a history authority.
        if (options.commitRoute) synchronous(options.commitRoute({operation,
          route: candidate, previous, generation}), 'commitRoute');
        if (!isCurrent()) { committing = false; return {status: 'cancelled'}; }
        committed = candidate;
        pending = null;
        committing = false;
        // Notification is downstream of the one authoritative commit.
        if (adapter.onCommit) {
          try { adapter.onCommit({operation, route: committed, previous, generation}); }
          catch (error) { report(error, 'notification'); }
        }
        return {status: 'committed', route: committed};
      } catch (error) {
        committing = false;
        if (!isCurrent()) return {status: 'cancelled'};
        cancel();
        if (activationStarted) {
          try {
            committing = true;
            // Forced recovery uses the aborted ticket for diagnostics only.
            // It MUST restore origin even though context.isCurrent() is now false.
            synchronous(adapter.rollback(previous.current, context), 'rollback');
            if (!closed) committed = previous;
          } catch (rollbackError) {
            // No successful commit or exact-restore claim on recovery failure.
            closed = true;
            cancel();
            report(rollbackError, 'rollback');
          } finally {
            committing = false;
          }
        }
        if (prepared !== undefined) discard(prepared);
        return report(error, operation);
      }
    }
    const rootView = viewCopy({kind: 'cell', id: 'cell', rank: 0});
    committed = route(record(rootView, adapter.capture(rootView)), []);

    function enter(target) {
      guardDispatch();
      if (closed) return Promise.resolve({status: 'closed'});
      let view;
      try { view = viewCopy(target); }
      catch (error) { return Promise.resolve(report(error, 'enter')); }
      if (view.rank <= committed.current.view.rank)
        return Promise.resolve({status: 'unavailable'});
      return transaction('enter', view);
    }
    function lateral(target) {
      guardDispatch();
      if (closed) return Promise.resolve({status: 'closed'});
      let view;
      try { view = viewCopy(target); }
      catch (error) { return Promise.resolve(report(error, 'lateral')); }
      if (view.kind !== 'interior' || committed.current.view.kind !== 'interior' ||
          view.id === committed.current.view.id) return Promise.resolve({status: 'unavailable'});
      return transaction('lateral', view);
    }
    function ancestor(index) {
      guardDispatch();
      if (closed) return Promise.resolve({status: 'closed'});
      if (pending && !pending.restoreRoute) {
        cancel();
        return Promise.resolve({status: 'cancelled'});
      }
      if (!Number.isInteger(index) || index < 0 || index >= committed.ancestors.length)
        return Promise.resolve({status: 'root'});
      const target = route(committed.ancestors[index], committed.ancestors.slice(0, index));
      return transaction('back', target.current.view, target);
    }
    function back() {
      guardDispatch();
      if (closed) return Promise.resolve({status: 'closed'});
      if (pending && !pending.restoreRoute) {
        cancel();
        return Promise.resolve({status: 'cancelled'});
      }
      const origin = pending && pending.restoreRoute || committed;
      if (!origin.ancestors.length) return Promise.resolve({status: 'root'});
      const index = origin.ancestors.length - 1;
      const target = route(origin.ancestors[index], origin.ancestors.slice(0, index));
      return transaction('back', target.current.view, target);
    }
    function restore(input, operation = 'restore') {
      guardDispatch();
      if (closed) return Promise.resolve({status: 'closed'});
      let target;
      try { target = importRoute(input); }
      catch (error) { return Promise.resolve(report(error, operation)); }
      return transaction(operation, target.current.view, target);
    }
    function checkpoint() {
      guardDispatch();
      if (closed) return {status: 'closed'};
      try {
        committing = true;
        const candidate = route(refreshCurrent(), committed.ancestors);
        if (closed) return {status: 'closed'};
        if (options.commitRoute) synchronous(options.commitRoute({operation: 'update',
          route: candidate, previous: committed, generation}), 'commitRoute');
        if (closed) return {status: 'closed'};
        committed = candidate;
        return {status: 'committed', route: committed};
      } catch (error) { return report(error, 'update'); }
      finally { committing = false; }
    }
    return Object.freeze({enter, lateral, ancestor, back,
      home: state => {
        guardDispatch();
        if (closed) return Promise.resolve({status: 'closed'});
        const root = committed.ancestors[0] || committed.current;
        return restore(route(record(rootView, state, root.slotId), []), 'home');
      },
      restore, importRoute, validateTarget: viewCopy, checkpoint,
      cancel: () => {guardDispatch(); return cancel();},
      read: () => committed,
      inspect: () => Object.freeze({generation, pending: !!pending, closed, committing}),
      // Unload is terminal, including inside an external atomic hook. Mark first
      // so abort listeners cannot re-enter a live authority.
      close: () => {if (closed) return; closed = true; cancel();}
    });
  }
  return Object.freeze({SCHEMA, valueCopy, stateCopy, pausedRestore, createController});
});
