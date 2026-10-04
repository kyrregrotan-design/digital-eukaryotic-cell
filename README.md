# Digital Eukaryotic Cell – public site

Public, read-only website for **Digital Eukaryotic Cell**, Kyrre Grøtan's project to build a literature-based, evidence-weighted model of a *Caenorhabditis elegans* intestinal cell, with an interactive WebGL viewer.

**Live site:** https://digital-eukaryotic-cell.vercel.app

**Honest status:** a qualitative teaching model with a source-based WormJam metabolism engine; *not* a complete simulation. Arrows in the viewer show the direction of influence (up/down), not measured rates or concentrations. Placement of genes/proteins in the cell is illustrative.

## What is in this repository

This repository holds a **published copy** of the site only. The model, data, tests and engine live in a private working folder and are not mirrored here.

| Path | What |
|---|---|
| `index.html`, `fremdrift.html`, `kilder.html` | Landing page, progress page, sources/credits (Norwegian) |
| `viewer/cell_webgl.html` | The 3D (WebGL, three.js) cell viewer, self-contained with its model data embedded |
| `viewer/cell_3d.html` | The classic, lighter canvas viewer |
| `viewer/vendor/three.min.js` | three.js 0.158.0 (MIT, see `viewer/vendor/three.LICENSE.txt`) |
| `assets/` | Site styles, theme toggle, giscus comment configuration, viewer comment drawer |
| `data/status.json` | Model counts extracted from the viewer at publish time |

Deliberately **not** published: the WormJam SBML file and other downloaded third-party data, the project's internal agent logs and notes, scripts, environments and anything with private paths.

## Comments

Comments on every page use [giscus](https://giscus.app), stored in this repository's [Discussions](https://github.com/kyrregrotan-design/digital-eukaryotic-cell/discussions) (category *Announcements*, one thread per page). See [CONTRIBUTING.md](CONTRIBUTING.md).

## Deployment

Hosted on Vercel as a static site (no build step). Currently deployed explicitly with the Vercel CLI after each push; once Vercel's Git integration is connected to this repository, pushes to `main` will redeploy production automatically. Updates are prepared from the working folder by a publish script that copies the current viewer files, scrubs local paths and re-injects the comment drawer.

## Licence

See [LICENSE.md](LICENSE.md). In short: Kyrre Grøtan's own code and text are *All rights reserved*; third-party components keep their own licences.
