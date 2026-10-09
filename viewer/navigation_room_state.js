/* © Kyrre Grøtan. All rights reserved. Value-only room hooks, no navigation authority. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./navigation_controller.js'));
  else root.DigitalCellRoomState = factory(root.DigitalCellNavigation);
})(typeof globalThis === 'object' ? globalThis : this, function (navigation) {
  'use strict';
  const object = x => !!x && typeof x === 'object' && !Array.isArray(x);
  function map(x, keys, check) {
    return object(x) && Object.keys(x).every(k => keys.includes(k) && check(x[k]));
  }
  const boolean = x => typeof x === 'boolean';
  const sign = x => [-1, 0, 1].includes(x);
  function qualitative(x, ids) {
    return object(x) && map(x.v, ids, sign) && map(x.mixed, ids, boolean);
  }
  function playback(s, ids, stepCount) {
    return object(s) && ['tour', 'flow'].includes(s.mode) &&
      (s.tourId === null || ids.includes(s.tourId)) &&
      Number.isInteger(s.step) && s.step >= 0 && s.step < Math.max(1, stepCount) &&
      Number.isFinite(s.progress) && s.progress >= 0 &&
      [0.5, 1, 2].includes(s.speed) && boolean(s.playing);
  }
  function createCodec({id, kind, capture, validate, apply}) {
    function read(input) {
      const r = navigation.valueCopy(input);
      if (!object(r) || r.version !== 1 || r.id !== id || r.kind !== kind || validate(r.state) !== true)
        throw new TypeError('Invalid semantic room state: ' + id);
      return r;
    }
    return Object.freeze({
      capture: () => read({version: 1, id, kind, state: capture()}),
      validate: input => {try {read(input); return true;} catch (_) {return false;}},
      restore: input => {
        const r = read(input); // Validate every field before touching a closure.
        apply(structuredClone(r.state)); // Closure maps remain mutable; record stays frozen.
        return {status: 'restored', playing: false};
      }
    });
  }
  function replaceMap(target, source) {
    Object.keys(target).forEach(k => delete target[k]); Object.assign(target, source);
  }
  // Prepared tours can contain computed qualitative results. Retain only tours
  // actually produced in this document; restore never reruns a propagation
  // factory and altered semantic refs, camera hints or source text are rejected.
  function createTourRegistry() {
    const signatures = new Set();
    return Object.freeze({
      capture: (tour, tourId = null) => { const value = navigation.valueCopy(tour);
        signatures.add(JSON.stringify([tourId, value])); return value; },
      validate: (tour, tourId = null) => signatures.has(JSON.stringify([tourId, tour]))
    });
  }
  return Object.freeze({createCodec, createTourRegistry, map, boolean, sign, qualitative, playback, replaceMap});
});
