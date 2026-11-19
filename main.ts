// Palmera Heat — gta6-01 entry hand-in (Node 22, standard library only).
// The game is this directory's game/ folder: "Palmera Heat", an original top-down 2D
// open-world crime game that runs from plain static files in a desktop browser, fully
// offline (game/index.html plus its ES modules under game/src/, no library, no network
// request, all art drawn on canvas and all sound synthesized with WebAudio). This program
// copies game/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored make.fun library.
// Before writing the dossier it sanity-checks the hand-in the way the scorer will:
// exactly the screenshots named in shots.json must be present and each within the size cap.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const GAME_TITLE = 'Palmera Heat';

// Palmera Heat screenshot validation: shots.json is the manifest of staged scenes, and
// every file it names must exist in screenshots/ at a size the scorer accepts.
const shotManifest = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));
const shotFiles = existsSync(join(here, 'screenshots')) ? readdirSync(join(here, 'screenshots')) : [];
for (const shot of shotManifest) {
  const file = join(here, 'screenshots', shot.name);
  if (!existsSync(file)) throw new Error(`${GAME_TITLE}: missing screenshot ${shot.name}`);
  const bytes = statSync(file).size;
  if (bytes > 262144) throw new Error(`${GAME_TITLE}: screenshot ${shot.name} is ${bytes} bytes, over the 256 KiB cap`);
}
const unlisted = shotFiles.filter((name) => !shotManifest.some((shot) => shot.name === name));
if (unlisted.length) throw new Error(`${GAME_TITLE}: screenshots not listed in shots.json: ${unlisted.join(', ')}`);
console.log(`${GAME_TITLE}: ${shotManifest.length} screenshots validated, handing in the game.`);

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
