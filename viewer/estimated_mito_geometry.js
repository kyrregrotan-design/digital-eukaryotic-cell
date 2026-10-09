/* Local opt-in pilot. Geometry support never changes mechanism evidence.
 * Original presentation code: All rights reserved, Copyright Kyrre Grøtan.
 * Source-coordinate reference: human PDB 8H9S (wwPDB CC0), existing MOL-0001.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DigitalCellEstimatedMito = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const properties = Object.freeze([
    ['shape', 'Shape', 'Procedural slabs, volumes and protein symbols; no segmented worm intestinal surface.'],
    ['topology', 'Topology', 'A flat teaching section represents compartments; crista connectivity is not reconstructed.'],
    ['dimensions', 'Dimensions', 'Thickness, spacing and sizes use arbitrary display units; no physical calibration.'],
    ['count', 'Displayed count', 'Symbols, membrane beads and particles are teaching choices, not abundance measurements.'],
    ['placement', 'Placement', 'Ordered symbols aid reading; no measured intestinal coordinates, contacts or docking.'],
    ['dynamics', 'Dynamics', 'Animation paths and timing are teaching choices, not measured kinetics, flux or pH.']
  ].map(row => Object.freeze({property:row[0], label:row[1], support:'estimated', note:row[2]})));
  function inventory(room, sourceReady) {
    if (room === 'mitochondria') return properties.map(row => ({...row}));
    if (room !== 'molecule_atp') return [];
    return properties.map(row => ({...row,
      support: sourceReady && ['shape','topology'].includes(row.property) ? 'derived from source' : 'estimated',
      note: row.property === 'shape' ? (sourceReady ?
        'Human 8H9S monomer: heavy-atom Gaussian surface, marching cubes and LOD decimation; a species proxy, not worm organelle anatomy.' :
        'The loading/error fallback is procedural; it is not a source-derived surface.') :
      row.property === 'topology' ? (sourceReady ?
        'Connectivity belongs to the reconstructed and simplified display mesh; biological topology is not validated.' : row.note) :
      row.property === 'dimensions' ? 'Source-coordinate bounds are in nm; this view fits them to arbitrary scene units. Displayed size is estimated and not comparable across levels.' :
      row.property === 'count' ? 'One displayed monomer is a presentation choice; no worm copy number or dimer organization is inferred.' :
      row.property === 'placement' ? 'Centred independent source view; no physical docking into the teaching membrane.' :
      'A static structural state; teaching motion is not measured molecular kinetics.'}));
  }
  function notice(room, sourceReady) {
    if (room === 'mitochondria') return '/// Estimated geometry pilot: membrane edge lines mark schematic boundaries. All room geometry is illustrative; not to scale.';
    if (room === 'molecule_atp') return sourceReady ?
      'Geometry pilot: surface derived from human 8H9S; displayed size, count and placement estimated. Not measured worm anatomy.' :
      '/// Geometry pilot: estimated fallback; source-derived surface is not displayed.';
    return '';
  }
  // Only the two existing slab core boundaries: 24 segments, no added picks,
  // source surface, biological geometry, shader pass or runtime dependency.
  function mark(THREE, ctx) {
    if (ctx.id !== 'mitochondria' || ctx.estimatedBoundaryLines) return;
    const material = new THREE.LineDashedMaterial({color:0xffefbc, dashSize:0.12, gapSize:0.08,
      depthWrite:false, clippingPlanes:[ctx.cut]});
    const lines = [];
    for (const id of ['outer_membrane','inner_membrane']) {
      const core = ctx.picks.find(o => o.isMesh && !o.isInstancedMesh && o.geometry.type === 'BoxGeometry' &&
        o.userData.ip && o.userData.ip.t === 'ac' && o.userData.ip.id === id);
      if (!core) throw new Error('Pilot membrane boundary missing: '+id);
      const line = new THREE.LineSegments(new THREE.EdgesGeometry(core.geometry), material);
      line.position.copy(core.position); line.quaternion.copy(core.quaternion); line.scale.copy(core.scale);
      line.computeLineDistances(); line.userData.estimatedBoundary = id;
      ctx.s.add(line); lines.push(line);
    }
    ctx.estimatedBoundaryLines = lines;
  }
  return Object.freeze({inventory, notice, mark});
});
