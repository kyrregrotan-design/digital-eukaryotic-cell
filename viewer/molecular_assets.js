// © Kyrre Grøtan. All rights reserved. Source geometry attributions below.
// Display-only molecular detail adapter; no simulation or whole-cell unit mapping.
(function () {
  "use strict";
  const definitions = {
    molecule_atp: { id: "MOL-0001", title: "ATP synthase · human stand-in", source: "8H9S", anchor: false,
      displayBounds: [[-6.822, -11.857, -6.176], [6.824, 11.857, 6.163]],
      note: "Human 8H9S ATP synthase monomer, used as a structural stand-in for C. elegans. This is a simplified source-derived surface, not worm intestinal geometry or a dimer. +Y points towards the mitochondrial matrix.",
      files: { L1: [107712, "8c843f953ad7540a8af1f3cd19aedaa17d4cb4251f08a773a1b76f73875094d3"], L2: [522292, "2787c65e7a5da26c519f9636c6ae3428eb6db540a2fc4a8db4e31d686e4083dd"] } },
    molecule_ribosome: { id: "MOL-0014", title: "80S ribosome · C. elegans", source: "9BH5", anchor: true,
      displayBounds: [[-11.462, 0.14, -11.663], [14.948, 25.883, 12.671]],
      note: "C. elegans 9BH5 80S ribosome. The corrected anchor uses a pig 3J7R Sec61 alignment: origin at the Sec61 pore axis and cytosolic boundary; +Y points into cytosol. Boundary is descriptive [VERIFY], not measured bilayer thickness. No Sec61 mesh or physical ER seam is shown. tRNA, mRNA, ligands and ions are excluded.",
      files: { L1: [171040, "1e08e8eed00cbfe64f44d4c268664489f8bfcb42007cf89bb3c1575fbbc3f5a2"], L2: [1475340, "ffcd305fb890ae339ce7f3a955d8bb39a9a518d8df70fe80e51c18790f9cd1e7"] } }
  };
  const transfers = new Map(), telemetry = [];
  let bridgePromise;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function bridge() {
    if (!bridgePromise) bridgePromise = new Promise((resolve, reject) => {
      const s = document.createElement("script"); s.src = "vendor/GLTFLoader.r158.js";
      s.onload = () => window.DCGLTFLoader ? resolve() : reject(new Error("Loader unavailable"));
      s.onerror = () => reject(new Error("Loader unavailable")); document.head.appendChild(s);
    }).catch((err) => { bridgePromise = null; throw err; });
    return bridgePromise;
  }
  function bytes(url, expected) {
    if (!transfers.has(url)) transfers.set(url, (async () => {
      const start = performance.now(), res = await fetch(url);
      if (!res.ok) throw new Error("Asset unavailable (" + res.status + ")");
      const data = await res.arrayBuffer();
      if (data.byteLength !== expected[0]) throw new Error("Asset size mismatch");
      if (!window.crypto || !crypto.subtle) throw new Error("Asset verification unavailable");
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", data))).map((x) => x.toString(16).padStart(2, "0")).join("");
      if (hash !== expected[1]) throw new Error("Asset checksum mismatch");
      telemetry.push({ url, bytes: data.byteLength, fetch_verify_ms: performance.now() - start });
      return data;
    })().catch((err) => { transfers.delete(url); throw err; }));
    return transfers.get(url);
  }
  function dispose(root) {
    const geometries = new Set(), materials = new Set();
    root.traverse((o) => { if (o.geometry) geometries.add(o.geometry); (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach((m) => materials.add(m)); });
    geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose());
  }
  function build(ctx, room, tier, changed) {
    const d = definitions[room], T = window.THREE;
    ctx.custom = true; ctx.hw = 3; ctx.hh = 2.6;
    ctx.home = { yaw: 0.2, pitch: 0.15, target: new T.Vector3(), dist: 8 };
    const ip = { t: "comp", id: d.id === "MOL-0001" ? "mitochondria" : "ribosomes" };
    const hostName = d.anchor ? "ribosome" : "mitochondrial";
    const adoptionHtml = '<p class="note" data-molecule-adoption="' + d.id + '">Included here as a display-only close-up. The <a href="assets/molecules/' + d.id + '/manifest.json" target="_blank" rel="noopener">original source manifest and attributions</a> retain historical CANDIDATE / not swapped wording.</p>';
    ctx.pickContextHtml = () => '<p class="note" style="padding-right:28px" data-molecule-host-context="' + d.id + '">Host-compartment context: ' + hostName + ' compartment. Open Overview for this molecule\'s source and organism details.</p>';
    const fallback = new T.Group();
    const a = new T.Mesh(new T.SphereGeometry(1, 16, 12), ctx.m(d.anchor ? 0xd8506a : 0xe9b949));
    a.scale.set(1, 1.3, 0.8); a.userData.molecule = d.id; fallback.add(a); ctx.s.add(fallback); ctx.pick(fallback, ip);
    let current = null, generation = 0, active = false;
    const state = { id: d.id, status: "schematic", lod: null, bytes: 0, parse_ms: null, display_scale: null, anchor: d.anchor, error: null };
    ctx.moleculeIdentity = () => ({ id: d.id, title: d.title, source: d.source, status: state.status, ip: { ...ip } });
    const remove = (obj) => {
      if (!obj) return;
      const owned = new Set(); obj.traverse((o) => owned.add(o));
      ctx.picks = ctx.picks.filter((o) => !owned.has(o));
      Object.keys(ctx.mats).forEach((key) => { ctx.mats[key] = ctx.mats[key].filter((m) => ![...owned].some((o) => o.material === m)); });
      ctx.s.remove(obj); dispose(obj);
    };
    function fallbackPick(show) {
      fallback.visible = show;
      const owned = new Set(); fallback.traverse((o) => owned.add(o));
      ctx.picks = ctx.picks.filter((o) => !owned.has(o));
      if (show) fallback.traverse((o) => { if (o.isMesh) ctx.picks.push(o); });
    }
    async function refresh() {
      if (!active) return;
      const lod = tier() === "light" || window.innerWidth <= 600 ? "L1" : "L2";
      if (state.lod === lod && current) return;
      const ticket = ++generation;
      // A downgrade must never keep the higher-detail mesh on screen while loading.
      remove(current); current = null; fallbackPick(true);
      state.status = "loading"; state.lod = null; state.error = null; changed();
      let object;
      try {
        const url = "assets/molecules/" + d.id + "/" + d.id + "." + lod + (d.anchor ? ".anchor" : "") + ".glb";
        const [data] = await Promise.all([bytes(url, d.files[lod]), bridge()]);
        if (!active || ticket !== generation) return;
        const start = performance.now(), gltf = await new window.DCGLTFLoader().parseAsync(data, "");
        object = gltf.scene;
        if (!active || ticket !== generation) { dispose(object); return; }
        // Verified manifest bounds give ONE display transform per asset, stable across LODs.
        const box = new T.Box3(new T.Vector3(...d.displayBounds[0]), new T.Vector3(...d.displayBounds[1])), size = box.getSize(new T.Vector3()), center = box.getCenter(new T.Vector3());
        const scale = 4 / Math.max(size.x, size.y, size.z);
        // Preserve source anchor coordinates. Only the parent display transform centres the camera view.
        object.scale.setScalar(scale); object.position.copy(center).multiplyScalar(-scale);
        const old = new Set(), slots = {};
        object.traverse((o) => {
          if (!o.isMesh) return;
          old.add(o.material); const slot = o.material.name || "protein";
          if (!slots[slot]) slots[slot] = ctx.m(slot === "rRNA" ? 0xf29ab0 : d.anchor ? 0xd8506a : 0xe9b949, { roughness: 0.45, clearcoat: 0.4 });
          o.material = slots[slot]; o.userData.molecule = d.id;
        });
        old.forEach((m) => m.dispose());
        current = object; ctx.s.add(object); ctx.pick(object, ip); fallbackPick(false);
        Object.assign(state, { status: "ready", lod, bytes: data.byteLength, parse_ms: performance.now() - start, display_scale: scale, anchor_scene: object.position.toArray(), error: null });
        changed();
      } catch (err) {
        if (object && object !== current) dispose(object);
        if (!active || ticket !== generation) return;
        state.status = "fallback"; state.error = err.message; state.lod = null; fallbackPick(true); changed();
      }
    }
    ctx.onEnter = () => { active = true; refresh(); };
    ctx.onExit = () => { active = false; ++generation; remove(current); current = null; state.status = "schematic"; state.lod = null; fallbackPick(true); };
    ctx.moleculeRefresh = refresh;
    ctx.moleculeState = () => ({ ...state, meshes: current ? ctx.picks.filter((o) => o.userData.molecule).length : 0, picks: ctx.picks.length,
      clearcoat: current ? ctx.picks.filter((o) => o.userData.molecule).map((o) => o.material.clearcoat) : [] });
    ctx.overviewHtml = () => '<h2>' + esc(d.title) + '</h2><p>' + esc(d.note) + '</p><p class="note">Display-only close-up. Source coordinates are in nm; display fit is illustrative and does not calibrate the cell. Surface detail is simplified; evidence confidence remains unscored [VERIFY].</p><p>' +
      (state.status === "ready" ? 'Source-derived surface · ' + (state.lod === "L1" ? 'simplified detail' : 'higher detail') : state.status === "loading" ? 'Loading source-derived surface; schematic shown meanwhile.' : 'Schematic fallback. ' + esc(state.error || 'Source surface has not loaded.')) +
      '</p><p class="src"><a href="https://www.rcsb.org/structure/' + d.source + '" target="_blank" rel="noopener">PDB ' + d.source + '</a> · PDB/EMDB data CC0; UniProt annotations CC BY 4.0 (UniProt Consortium). Derived asset © Kyrre Grøtan, All rights reserved.</p>' + adoptionHtml + '<button class="chip" data-enter="' + (d.anchor ? 'ribosomes' : 'mitochondria') + '">Back to schematic interior</button>';
    ctx.sideHtml = () => '<button class="chip" data-ioverview="1" data-molecule-identity="' + d.id + '" aria-describedby="identity-' + d.id + '">' + esc(d.id + ' · ' + d.title + ' · PDB ' + d.source) + '</button><p class="note" id="identity-' + d.id + '">' + esc(d.note) + '</p><p class="note">Display-only source surface; sizes do not calibrate the cell. Click the surface for ' + hostName + ' host-compartment context.</p>' + adoptionHtml + (state.status === "fallback" ? '<button class="chip" data-molecule-retry="1">Retry source surface</button>' : '') + '<button class="chip" data-enter="' + (d.anchor ? 'ribosomes' : 'mitochondria') + '">Back to schematic interior</button>';
  }
  window.DCMolecules = { definitions, build, telemetry: () => telemetry.map((x) => ({ ...x })) };
})();
