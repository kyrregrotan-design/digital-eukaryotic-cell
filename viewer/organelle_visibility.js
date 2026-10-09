/* © Kyrre Grøtan. All rights reserved. Display-only canonical type mask. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DigitalCellTypeVisibility = api;
})(globalThis, function () {
  'use strict';
  function create(ids) {
    if (!Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length ||
        ids.some(id => typeof id !== 'string' || !id || ['__proto__','constructor','prototype'].includes(id)))
      throw new TypeError('Canonical type IDs required');
    const keys = Object.freeze(ids.slice());
    let mask = Object.fromEntries(keys.map(id => [id, true]));
    function valid(value) {
      if (!value || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype ||
          Reflect.ownKeys(value).length !== keys.length) return false;
      return keys.every(id => {
        const d = Object.getOwnPropertyDescriptor(value, id);
        return d && d.enumerable && Object.hasOwn(d, 'value') && typeof d.value === 'boolean';
      });
    }
    function restore(value) {
      if (!valid(value)) throw new TypeError('Invalid canonical type mask');
      mask = Object.fromEntries(keys.map(id => [id, value[id]]));
    }
    function snapshot() { return Object.freeze({...mask}); }
    function set(id, shown) {
      if (!Object.hasOwn(mask, id) || typeof shown !== 'boolean') throw new TypeError('Unknown type or flag');
      mask[id] = shown;
    }
    function isolate(id) {
      if (!Object.hasOwn(mask, id)) throw new TypeError('Unknown type');
      keys.forEach(key => { mask[key] = key === id; });
    }
    return Object.freeze({keys, valid, restore, snapshot, set, isolate,
      shown:id => Object.hasOwn(mask,id) && mask[id],
      allShown:() => keys.every(id => mask[id]),
      all:() => keys.forEach(id => { mask[id] = true; })});
  }
  return Object.freeze({create});
});
