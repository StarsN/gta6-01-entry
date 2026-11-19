// World rendering: sun-soaked Palmera with soft shadows, roads, buildings, palms, cars and people.
import { WORLD_W, WORLD_H, V_ROADS, H_ROADS, ROAD_W, BEACH_X, WATER_X, DISTRICTS } from './config.js';

export function drawWorld(ctx, game, cam, W, H) {
  const { world, player } = game;
  ctx.save();
  ctx.translate(-cam.x, -cam.y);
  // Ground: grass / city blocks base.
  ctx.fillStyle = '#93b874'; ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.fillStyle = '#d9c9a3'; ctx.fillRect(0, 0, BEACH_X, WORLD_H); // block base tint
  ctx.fillStyle = '#93b874'; ctx.fillRect(0, 0, BEACH_X, WORLD_H);
  // Sidewalk slabs under roads.
  ctx.fillStyle = '#c9bda6';
  for (const rx of V_ROADS) ctx.fillRect(rx - ROAD_W / 2 - 16, 0, ROAD_W + 32, WORLD_H);
  for (const ry of H_ROADS) ctx.fillRect(0, ry - ROAD_W / 2 - 16, BEACH_X, ROAD_W + 32);
  // Blocks (lawns / plazas).
  ctx.fillStyle = '#a8c686';
  for (const b of world.buildings) ctx.fillRect(b.x - 14, b.y - 14, b.w + 28, b.h + 28);
  // Beach + water.
  ctx.fillStyle = '#f0d492'; ctx.fillRect(BEACH_X, 0, WATER_X - BEACH_X, WORLD_H);
  const grad = ctx.createLinearGradient(WATER_X, 0, WORLD_W, 0);
  grad.addColorStop(0, '#3fb3cf'); grad.addColorStop(1, '#16697a');
  ctx.fillStyle = grad; ctx.fillRect(WATER_X, 0, WORLD_W - WATER_X, WORLD_H);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
  for (let y = 30; y < WORLD_H; y += 70) { ctx.beginPath(); ctx.moveTo(WATER_X + 8, y + Math.sin(game.time + y) * 4); ctx.lineTo(WATER_X + 60, y + Math.sin(game.time + y) * 4); ctx.stroke(); }
  // Roads.
  ctx.fillStyle = '#3d3a42';
  for (const rx of V_ROADS) ctx.fillRect(rx - ROAD_W / 2, 0, ROAD_W, WORLD_H);
  for (const ry of H_ROADS) ctx.fillRect(0, ry - ROAD_W / 2, BEACH_X + 40, ROAD_W);
  ctx.strokeStyle = '#f5d76e'; ctx.lineWidth = 3; ctx.setLineDash([26, 22]);
  for (const rx of V_ROADS) { ctx.beginPath(); ctx.moveTo(rx, 0); ctx.lineTo(rx, WORLD_H); ctx.stroke(); }
  for (const ry of H_ROADS) { ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(BEACH_X + 40, ry); ctx.stroke(); }
  ctx.setLineDash([]);
  // District labels.
  ctx.fillStyle = 'rgba(60,40,20,0.55)'; ctx.font = 'bold 22px system-ui'; ctx.textAlign = 'left';
  for (const d of DISTRICTS) ctx.fillText(d.name.toUpperCase(), d.x, d.y);
  // Props and palms (shadow first).
  for (const pr of world.props) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(pr.x + 4, pr.y + 6, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pr.kind === 'lamp' ? '#495057' : '#8d6e63'; ctx.fillRect(pr.x - 3, pr.y - 8, 6, 14);
  }
  for (const pm of world.palms) drawPalm(ctx, pm.x, pm.y, pm.s);
  // Buildings with soft shadow + warm roofs.
  for (const b of world.buildings) {
    ctx.fillStyle = 'rgba(40,25,10,0.28)'; ctx.fillRect(b.x + 10, b.y + 12, b.w, b.h);
    ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(b.x, b.y, b.w, 10);
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    const cols = Math.floor(b.w / 34), rows = Math.floor(b.h / 34);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) ctx.fillRect(b.x + 10 + i * 34, b.y + 12 + j * 34, 14, 12);
  }
  // Mission marker beam.
  if (game.marker) {
    const m = game.marker, pulse = 0.6 + Math.sin(game.time * 5) * 0.25;
    ctx.fillStyle = `rgba(255,209,102,${0.25 * pulse})`; ctx.fillRect(m.x - 14, m.y - 900, 28, 900);
    ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(m.x, m.y, 16 + Math.sin(game.time * 5) * 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a5200'; ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center'; ctx.fillText('★', m.x, m.y + 6);
  }
  // Cars.
  for (const car of game.cars) drawCar(ctx, car, game.time);
  // Enemies (shootout).
  for (const e of game.mission.enemies || []) if (e.health > 0) drawPerson(ctx, e.x, e.y, e.angle, '#9d0208', true);
  // Peds.
  for (const ped of game.peds) if (ped.health > 0) drawPerson(ctx, ped.x, ped.y, ped.angle, ped.shirt, false);
  // Player (hidden inside car — car drawn with driver tint).
  if (!player.inCar) drawPerson(ctx, player.x, player.y, player.angle, '#ffd166', false, true);
  // Bullets + particles.
  ctx.fillStyle = '#ffe066';
  for (const b of game.combat.bullets) { ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill(); }
  for (const pt of game.combat.particles) { ctx.globalAlpha = Math.max(0, pt.life * 2); ctx.fillStyle = pt.color; ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size); }
  ctx.globalAlpha = 1;
  ctx.restore();
  // Warm sunlight vignette.
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.95);
  vg.addColorStop(0, 'rgba(255,180,80,0.05)'); vg.addColorStop(1, 'rgba(80,30,0,0.22)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}
function drawPalm(ctx, x, y, s) {
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(x + 8, y + 8, 16 * s, 7 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 5 * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3, y - 12 * s); ctx.stroke();
  ctx.strokeStyle = '#2a9d8f'; ctx.lineWidth = 4 * s;
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.4; ctx.beginPath(); ctx.moveTo(x + 3, y - 12 * s); ctx.quadraticCurveTo(x + 3 + Math.cos(a) * 14 * s, y - 12 * s + Math.sin(a) * 8 * s - 4, x + 3 + Math.cos(a) * 22 * s, y - 12 * s + Math.sin(a) * 13 * s + 3); ctx.stroke(); }
}
export function drawCar(ctx, car, time) {
  ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-car.w / 2 + 4, -car.h / 2 + 5, car.w, car.h);
  ctx.fillStyle = car.color; roundRect(ctx, -car.w / 2, -car.h / 2, car.w, car.h, 6); ctx.fill();
  ctx.fillStyle = 'rgba(20,30,45,0.85)'; roundRect(ctx, -6, -car.h / 2 + 3, 16, car.h - 6, 3); ctx.fill();
  ctx.fillStyle = '#212529'; ctx.fillRect(-car.w / 2 + 3, -car.h / 2 - 2, 9, 5); ctx.fillRect(-car.w / 2 + 3, car.h / 2 - 3, 9, 5);
  ctx.fillRect(car.w / 2 - 12, -car.h / 2 - 2, 9, 5); ctx.fillRect(car.w / 2 - 12, car.h / 2 - 3, 9, 5);
  if (car.kind === 'police') {
    ctx.fillStyle = '#212529'; ctx.fillRect(-car.w / 2, -car.h / 2, 13, car.h); ctx.fillRect(car.w / 2 - 13, -car.h / 2, 13, car.h);
    const flash = Math.sin(time * 10) > 0;
    ctx.fillStyle = flash ? '#e63946' : '#3a86ff'; ctx.fillRect(-4, -5, 8, 10);
    ctx.fillStyle = '#212529'; ctx.font = 'bold 7px system-ui'; ctx.textAlign = 'center'; ctx.fillText('PD', 2, 2.5);
  }
  if (car.kind === 'taxi') { ctx.fillStyle = '#212529'; ctx.font = 'bold 8px system-ui'; ctx.textAlign = 'center'; ctx.fillText('TAXI', 0, 3); }
  if (car.kind === 'target' || car.gold) { ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2.5; roundRect(ctx, -car.w / 2 - 2, -car.h / 2 - 2, car.w + 4, car.h + 4, 7); ctx.stroke(); }
  if (car.health < 45) { ctx.fillStyle = 'rgba(60,60,60,0.5)'; ctx.beginPath(); ctx.arc(car.w / 2 - 4, 0, 7 + Math.sin(time * 7) * 2, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
export function drawPerson(ctx, x, y, angle, shirt, hostile = false, isPlayer = false) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(2, 4, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(angle);
  ctx.fillStyle = shirt; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f1c27d'; ctx.beginPath(); ctx.arc(2, 0, 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#343a40'; ctx.fillRect(6, -2, hostile || isPlayer ? 9 : 4, 3.5);
  if (isPlayer) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, 12.5, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
