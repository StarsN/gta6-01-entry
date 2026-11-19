// Palmera Heat — boot, game state, the main loop, missions glue, camera and screens.
import { WORLD_W, WORLD_H, clamp, dist } from './config.js';
import { createWorld, collideBuildings } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { loadSave, writeSave } from './save.js';
import { createPlayer, updatePlayerOnFoot, respawnPlayer } from './player.js';
import { spawnParkedCars, makeCar, driveStep } from './vehicles.js';
import { spawnTraffic, updateTraffic } from './traffic.js';
import { spawnPeds, updatePeds, scarePeds } from './pedestrians.js';
import { createWanted, reportCrime, updateWanted, wantedCarCount, spawnPolice, updatePolice } from './police.js';
import { createCombat, tryAttack, startReload, finishReload, updateCombat, spawnParticles } from './combat.js';
import { MISSIONS, CHARACTERS, createMissionState, currentMission, objectiveText, markerFor, giverSpot, ENDING_TEXT } from './missions.js';
import { createHud, toast, updateHud, drawHud } from './hud.js';
import { drawMinimap } from './minimap.js';
import { drawWorld } from './render.js';
import { parseShot, stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
let W = 1280, H = 720;
function resize() {
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W; canvas.height = H;
}
window.addEventListener('resize', resize); resize();

const shot = parseShot();
const seed = shot ? shot.seed : 7;
const input = createInput(canvas);
const audio = createAudio();

const game = {
  state: 'title', // title | playing | paused | busted | wasted | ending
  time: 0, world: createWorld(seed), player: createPlayer(),
  cars: [], peds: spawnPeds(22), wanted: createWanted(), combat: createCombat(),
  mission: createMissionState(), hud: createHud(),
  camera: { x: 0, y: 0 }, shake: 0, endTimer: 0, objective: '', marker: null, prompt: '',
  hasContinue: !!loadSave(), muted: false,
};
game.cars = [...spawnTraffic(10), ...spawnParkedCars(14)];
// The gold target coupe for mission 2, parked near Calle Sol.
const gold = makeCar(1560, 760, 0.4, { kind: 'sport', color: '#ffd700', name: 'Gold Solstice Coupe' });
gold.gold = true; game.cars.push(gold); game.mission.targetCarId = gold.id;

game.toast = (t, c) => toast(game.hud, t, c);
game.setMissionIndex = (i) => { game.mission.index = i; game.mission.phase = 'offer'; game.mission.stage = null; };
game.ensurePolice = () => {
  const want = wantedCarCount(game.wanted.level);
  const have = game.cars.filter(c => c.driver === 'police').length;
  for (let i = have; i < want; i++) game.cars.push(spawnPolice(game.player, game.cars.length));
  if (have > want) {
    let extra = have - want;
    game.cars = game.cars.filter(c => { if (c.driver === 'police' && extra > 0) { extra--; return false; } return true; });
  }
};
game.onCrime = (kind) => {
  // A crime counts when a ped or a police cruiser can see the player.
  const p = game.player;
  const witnessed = game.peds.some(pd => pd.health > 0 && dist(p.x, p.y, pd.x, pd.y) < 240)
    || game.cars.some(c => c.driver === 'police' && dist(p.x, p.y, c.x, c.y) < 420) || game.wanted.level > 0;
  if (witnessed) reportCrime(game.wanted, kind, true);
};
game.onShotFired = () => { scarePeds(game.peds, game.player.x, game.player.y, 300); game.onCrime('shot'); };

let dialogueQueue = [];
game.startDialogue = (missionIdx) => {
  const m = MISSIONS[missionIdx]; if (!m) return;
  dialogueQueue = m.intro.map(([who, line]) => ({ who, line }));
  nextDialogue();
};
function nextDialogue() {
  const d = dialogueQueue.shift();
  if (!d) { game.hud.dialogue = null; return; }
  game.hud.dialogue = d.line; game.hud.dialogueName = CHARACTERS[d.who].name; game.hud.dialogueColor = CHARACTERS[d.who].color;
}
function saveGame() {
  writeSave({ money: game.player.money, missionIndex: game.mission.index, phase: game.mission.phase, x: game.player.x, y: game.player.y, complete: game.mission.complete });
}
function applySave() {
  const s = loadSave(); if (!s) return;
  game.player.money = s.money ?? game.player.money;
  game.mission.index = s.missionIndex ?? 0; game.mission.complete = !!s.complete;
  game.mission.phase = game.mission.complete ? 'done' : 'offer';
  if (s.x) { game.player.x = s.x; game.player.y = s.y; }
}

function startGame(continued) {
  audio.unlock(); audio.click();
  if (continued) applySave();
  game.state = 'playing';
  statusEl.textContent = 'Palmera Heat started.';
}

// ---------- Missions ----------
function missionTick(dt) {
  const ms = game.mission, m = currentMission(ms), p = game.player;
  game.objective = ms.complete ? 'Free roam — explore Palmera. The city is yours.' : objectiveText(ms);
  game.marker = markerFor(ms);
  if (!m || ms.complete) return;
  if (ms.phase === 'offer') {
    const spot = giverSpot(m);
    if (dist(p.x, p.y, spot.x, spot.y) < 46 && !p.inCar) {
      game.prompt = `Press E — Talk to ${CHARACTERS[m.giver].name}`;
      if (input.wasPressed('KeyE')) { ms.phase = 'active'; ms.stage = null; beginMission(m); game.startDialogue(ms.index); audio.mission(); }
    }
    return;
  }
  if (ms.phase !== 'active') return;
  if (m.type === 'goto' && dist(p.x, p.y, m.target.x, m.target.y) < 52) completeMission();
  else if (m.type === 'steal') {
    if (!ms.stage) {
      const target = game.cars.find(c => c.id === ms.targetCarId);
      if (target && p.inCar === target) { ms.stage = 'deliver'; game.toast('Got the coupe! Deliver it to the garage.', '#ffd166'); }
      else if (target) game.marker = { x: target.x, y: target.y, label: m.target.label };
    } else if (dist(p.x, p.y, m.deliver.x, m.deliver.y) < 70 && p.inCar && p.inCar.id === ms.targetCarId) completeMission();
  } else if (m.type === 'timed') {
    ms.timer -= dt;
    if (dist(p.x, p.y, m.target.x, m.target.y) < 70) completeMission();
    else if (ms.timer <= 0) { game.toast('Too slow — the mangoes melted. Try again!', '#ff8fa3'); ms.timer = m.timeLimit; }
  } else if (m.type === 'escape') {
    if (!ms.stage) {
      if (game.wanted.level >= m.wantedNeeded) { ms.stage = 'hide'; game.toast('Now lose them — break line of sight!', '#ffd166'); }
    } else if (game.wanted.level === 0) completeMission();
  } else if (m.type === 'checkpoints') {
    ms.timer -= dt;
    const cp = m.checkpoints[ms.checkpointIdx];
    if (cp && dist(p.x, p.y, cp.x, cp.y) < 74) {
      ms.checkpointIdx++; audio.cash();
      if (ms.checkpointIdx >= m.checkpoints.length) completeMission();
      else game.toast(`Gate ${ms.checkpointIdx}/${m.checkpoints.length} — keep going!`, '#06d6a0');
    } else if (ms.timer <= 0) { game.toast('Out of time — the run resets.', '#ff8fa3'); ms.checkpointIdx = 0; ms.timer = m.timeLimit; }
  } else if (m.type === 'shootout') {
    for (const e of ms.enemies) {
      if (e.health <= 0) continue;
      const d = dist(e.x, e.y, p.x, p.y);
      e.angle = Math.atan2(p.y - e.y, p.x - e.x);
      if (d > 130) { e.x += Math.cos(e.angle) * 62 * dt; e.y += Math.sin(e.angle) * 62 * dt; }
      e.fireCd = (e.fireCd || 0) - dt;
      if (d < 320 && e.fireCd <= 0) {
        e.fireCd = 1.1 + Math.random() * 0.7;
        if (Math.random() < 0.55) { p.health -= 6; audio.hurt(); spawnParticles(game.combat, p.x, p.y, '#e63946', 4, 80); }
      }
      // Player bullets already damage peds/cars; enemies take punch/bullet damage via proximity check here:
      for (const b of game.combat.bullets) if (b.fromPlayer && dist(b.x, b.y, e.x, e.y) < 13) { e.health -= 30; b.life = 0; }
      if (!p.inCar && dist(e.x, e.y, p.x, p.y) < 30 && input.wasPressed('Space', 'Mouse0')) e.health -= 20;
    }
    if (ms.enemies.length && ms.enemies.every(e => e.health <= 0)) completeMission();
  }
}
function beginMission(m) {
  const ms = game.mission;
  if (m.type === 'timed' || m.type === 'checkpoints') ms.timer = m.timeLimit;
  if (m.type === 'checkpoints') ms.checkpointIdx = 0;
  if (m.type === 'shootout') {
    game.player.weapon = 'pistol'; game.player.ammo = 12; game.player.reserve = Math.max(game.player.reserve, 36);
    ms.enemies = [];
    for (let i = 0; i < m.waves; i++) ms.enemies.push({ x: m.target.x + (Math.random() - 0.5) * 220, y: m.target.y + (Math.random() - 0.5) * 220, angle: 0, health: 60, fireCd: 1 + i * 0.3 });
    game.toast('Pistol equipped — clear the overlook!', '#ffd166');
  }
  if (m.type === 'steal') { const t = game.cars.find(c => c.id === ms.targetCarId); if (t && t.health <= 0) { t.health = 100; t.x = 1560; t.y = 760; } }
}
function completeMission() {
  const ms = game.mission, m = currentMission(ms); if (!m) return;
  game.player.money += m.reward; audio.cash();
  game.toast(`Mission complete: ${m.title}  +$${m.reward}`, '#06d6a0');
  game.hud.dialogue = m.done; game.hud.dialogueName = CHARACTERS[m.giver].name; game.hud.dialogueColor = CHARACTERS[m.giver].color;
  dialogueQueue = [];
  ms.index++; ms.phase = 'offer'; ms.stage = null;
  if (ms.index >= MISSIONS.length) { ms.complete = true; game.state = 'ending'; game.endTimer = 6; game.toast(ENDING_TEXT, '#ffd166'); }
  saveGame();
}

// ---------- Core update ----------
function nearestCar(maxD = 52) {
  let best = null, bd = maxD;
  for (const c of game.cars) { const d = dist(game.player.x, game.player.y, c.x, c.y); if (d < bd) { bd = d; best = c; } }
  return best;
}
function update(dt) {
  const p = game.player;
  game.time += dt;
  updateHud(game.hud, dt);
  if (game.state === 'ending') { game.endTimer -= dt; if (game.endTimer <= 0) game.state = 'playing'; }
  if (game.state !== 'playing' && game.state !== 'ending') return;
  if (game.hud.dialogue) {
    if (input.wasPressed('Space', 'Mouse0', 'KeyE', 'Enter')) { audio.click(); nextDialogue(); }
    return; // world pauses during dialogue
  }
  // Enter / exit cars.
  game.prompt = '';
  if (!p.inCar) {
    const near = nearestCar();
    if (near) game.prompt = `Press E — ${near.driver === 'traffic' ? 'Steal' : 'Drive'} the ${near.name}`;
    if (near && input.wasPressed('KeyE')) {
      const wasDriven = near.driver === 'traffic';
      near.driver = 'player'; p.inCar = near;
      if (wasDriven || near.stolen === false && wasDriven) { /* stealing a driven car */ }
      if (wasDriven) { near.stolen = true; game.onCrime('steal'); game.toast('Vehicle stolen!', '#ff8fa3'); scarePeds(game.peds, p.x, p.y, 170); }
      audio.click();
    }
  } else if (input.wasPressed('KeyE')) {
    const car = p.inCar; car.driver = null; if (Math.abs(car.speed) < 30) { p.x = car.x + 30; p.y = car.y + 10; p.inCar = null; const pos = { x: p.x, y: p.y }; collideBuildings(pos, p.r, game.world); p.x = pos.x; p.y = pos.y; }
  }
  // Movement.
  const aimWorld = { x: p.x + (input.mouse.x - W / 2), y: p.y + (input.mouse.y - H / 2) };
  if (p.inCar) {
    const car = p.inCar;
    const throttle = input.isDown('KeyW', 'ArrowUp') ? 1 : input.isDown('KeyS', 'ArrowDown') ? -1 : 0;
    const steer = (input.isDown('KeyA', 'ArrowLeft') ? -1 : 0) + (input.isDown('KeyD', 'ArrowRight') ? 1 : 0);
    const spdBefore = Math.abs(car.speed);
    const crashed = driveStep(car, throttle, steer, dt, game.world);
    p.x = car.x; p.y = car.y;
    if (input.isDown('Space')) driveStep(car, -1, 0, dt * 0.6, game.world); // handbrake feel
    if (crashed && spdBefore > 120) { game.shake = 9; car.health -= 8; audio.crash(); spawnParticles(game.combat, car.x, car.y, '#ced4da', 12, 160); if (spdBefore > 200) p.health -= 4; }
    if (Math.abs(car.speed) > 60 && Math.abs(steer) > 0 && throttle !== 0 && Math.random() < 0.3) spawnParticles(game.combat, car.x, car.y, '#e9ecef', 1, 30); // tire smoke
    // Running into peds / cars while driving.
    for (const ped of game.peds) if (ped.health > 0 && Math.abs(car.speed) > 70 && dist(car.x, car.y, ped.x, ped.y) < 26) { ped.health = 0; game.onCrime('hitPed'); spawnParticles(game.combat, ped.x, ped.y, '#e63946', 10, 130); audio.crash(); }
    audio.setEngine(car.speed / 300, true);
  } else {
    updatePlayerOnFoot(p, input, dt, game.world, aimWorld);
    audio.setEngine(0, false);
    if (input.wasPressed('Space', 'Mouse0') || input.mouse.down && p.weapon === 'pistol' && p.fireCooldown <= 0) tryAttack(game, audio);
    if (input.wasPressed('KeyR')) startReload(game, audio);
    if (input.wasPressed('Digit1')) p.weapon = 'fists';
    if (input.wasPressed('Digit2') && (p.reserve > 0 || p.ammo > 0 || game.mission.index >= 5)) p.weapon = 'pistol';
  }
  if (p.reloading <= 0 && game._wasReloading) finishReload(game);
  game._wasReloading = p.reloading > 0;
  // World actors.
  updateTraffic(game.cars, dt, game.world, game.cars);
  const danger = p.inCar ? null : (game.wanted.level > 0 ? p : null);
  updatePeds(game.peds, dt, game.world, danger);
  game.ensurePolice();
  const seen = updatePolice(game.cars, p, dt, game.world);
  // Player car collisions with other cars.
  if (p.inCar) for (const o of game.cars) {
    if (o === p.inCar) continue;
    if (dist(p.inCar.x, p.inCar.y, o.x, o.y) < 40 && Math.abs(p.inCar.speed) > 90) {
      o.health -= 6; p.inCar.speed *= 0.55; game.shake = Math.max(game.shake, 6); audio.crash(); game.onCrime('hitCar');
      spawnParticles(game.combat, o.x, o.y, '#ffd166', 8, 140);
    }
  }
  updateCombat(game, dt);
  updateWanted(game.wanted, dt, seen);
  audio.setSiren(game.wanted.level > 0 && game.cars.some(c => c.driver === 'police'));
  audio.updateMusic(dt, true);
  missionTick(dt);
  // Busted / wasted.
  if (!p.inCar && p.bustedTimer > 2.2 && game.wanted.level > 0) endRun('busted');
  else if (!seen) p.bustedTimer = Math.max(0, p.bustedTimer - dt * 1.4);
  if (p.health <= 0) endRun('wasted');
  // Camera follows player (or car), clamped to the world.
  const focus = p.inCar || p;
  game.camera.x = clamp(focus.x - W / 2, 0, Math.max(0, WORLD_W - W));
  game.camera.y = clamp(focus.y - H / 2, 0, Math.max(0, WORLD_H - H));
  if (p.shake) game.shake = Math.max(game.shake, p.shake); // police rams feed the same shake
  game.shake = Math.max(0, game.shake - dt * 22);
  p.shake = game.shake;
}
function endRun(kind) {
  game.state = kind; game.endTimer = 2.6;
  if (kind === 'busted') audio.busted(); else audio.crash();
  audio.setSiren(false); audio.setEngine(0, false);
}
function resolveEndRun() {
  const fine = respawnPlayer(game.player, 0.12);
  game.wanted.level = 0; game.wanted.heat = 0;
  game.cars = game.cars.filter(c => c.driver !== 'police');
  game.toast(game.state === 'busted' ? `Busted! Fine: $${fine}` : `Wasted! Hospital bill: $${fine}`, '#ff8fa3');
  game.state = 'playing'; saveGame();
}

// ---------- Rendering ----------
function draw() {
  ctx.fillStyle = '#1a120b'; ctx.fillRect(0, 0, W, H);
  if (game.state === 'title') { drawTitle(); return; }
  const shX = game.shake ? (Math.random() - 0.5) * game.shake : 0;
  const shY = game.shake ? (Math.random() - 0.5) * game.shake : 0;
  ctx.save(); ctx.translate(shX, shY);
  drawWorld(ctx, game, game.camera, W, H);
  ctx.restore();
  drawHud(ctx, W, H, game);
  drawMinimap(ctx, W - 176, H - 158, 160, game);
  if (game.state === 'paused') overlay('PAUSED', 'P or Esc to resume — M mute, your progress is saved.', '#ffd166');
  if (game.state === 'busted') overlay('BUSTED', 'The Palmera PD got you. Paying the fine…', '#ff8fa3');
  if (game.state === 'wasted') overlay('WASTED', 'You wake up at Palmera General. Paying the bill…', '#ff8fa3');
  if (game.state === 'ending') overlay('PALMERA IS YOURS', ENDING_TEXT, '#06d6a0');
  if (game.muted) { ctx.fillStyle = '#fff'; ctx.font = '13px system-ui'; ctx.textAlign = 'right'; ctx.fillText('MUTED (M)', W - 16, H - 14); }
}
function overlay(title, sub, color) {
  ctx.fillStyle = 'rgba(5,5,12,0.62)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = color; ctx.font = 'bold 54px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(title, W / 2, H / 2 - 12);
  ctx.fillStyle = '#fff'; ctx.font = '17px system-ui'; ctx.fillText(sub, W / 2, H / 2 + 26);
}
function drawTitle() {
  // Hero view of the city behind the title.
  game.camera.x = clamp(1060 - W / 2, 0, WORLD_W - W); game.camera.y = clamp(640 - H / 2, 0, WORLD_H - H);
  drawWorld(ctx, game, game.camera, W, H);
  ctx.fillStyle = 'rgba(20,8,0,0.45)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166'; ctx.font = 'bold 76px system-ui';
  ctx.shadowColor = '#e63946'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 5;
  ctx.fillText('PALMERA HEAT', W / 2, 150);
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#ffe8a3'; ctx.font = '19px system-ui';
  ctx.fillText('An original top-down open-world crime story in the sun-soaked city of Palmera.', W / 2, 192);
  ctx.fillStyle = '#fff'; ctx.font = '16px system-ui';
  const lines = [
    'You are Nico Reyes, a wheelman fresh off the ferry with $120 and a borrowed name.',
    'Rosa, Marcos and Ines have work. The Palmera PD has other plans.',
    'Six story missions: deliveries, a stolen coupe, a checkpoint run and a last stand.',
    '',
    'Controls: WASD / arrows move & drive · E enter or leave a car · Shift sprint',
    'Mouse aim · Click or Space punch / shoot · R reload · 1 fists · 2 pistol',
    'P or Esc pause · M mute · Hide from police to let wanted stars fade',
  ];
  lines.forEach((l, i) => ctx.fillText(l, W / 2, 246 + i * 25));
  // Buttons.
  drawButton(W / 2 - 220, H - 190, 200, 56, '▶  START', true);
  drawButton(W / 2 + 20, H - 190, 200, 56, game.hasContinue ? '↻  CONTINUE' : 'CONTINUE (no save)', game.hasContinue);
  ctx.fillStyle = '#ddd'; ctx.font = '13px system-ui';
  ctx.fillText('Click START or press Enter · CONTINUE loads your saved money, missions and position', W / 2, H - 108);
}
const buttons = [];
function drawButton(x, y, w, h, label, enabled) {
  buttons.push({ x, y, w, h, label, enabled });
  ctx.fillStyle = enabled ? '#e63946' : 'rgba(90,90,90,0.7)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 20px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + 36);
}
canvas.addEventListener('click', (e) => {
  audio.unlock();
  if (game.state !== 'title') return;
  const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
  for (const b of buttons) {
    if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
      if (b.label.includes('START')) startGame(false);
      else if (b.enabled) startGame(true);
    }
  }
});

// ---------- Loop ----------
if (shot) stageShot(game, shot);
let last = performance.now(), titleButtonsTimer = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  buttons.length = 0;
  if (game.state === 'title') {
    game.time += dt;
    if (input.wasPressed('Enter')) startGame(false);
    if (input.wasPressed('KeyC') && game.hasContinue) startGame(true);
  } else if (game.state === 'busted' || game.state === 'wasted') {
    game.endTimer -= dt; if (game.endTimer <= 0) resolveEndRun();
  } else {
    if (input.wasPressed('KeyP', 'Escape')) {
      if (game.state === 'playing') { game.state = 'paused'; saveGame(); }
      else if (game.state === 'paused') game.state = 'playing';
    }
    if (input.wasPressed('KeyM')) { game.muted = audio.toggleMute(); }
    if (game.state === 'playing' || game.state === 'ending') update(dt);
  }
  void titleButtonsTimer;
  draw();
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// Expose a tiny handle for screenshot staging and debugging.
window.__palmera = game;
