// Pedestrians: stroll along sidewalks, flee gunfire and danger, react when hurt.
import { V_ROADS, H_ROADS, clamp } from './config.js';
import { collideBuildings } from './world.js';

const SHIRTS = ['#ffbe0b','#fb5607','#ff006e','#8338ec','#3a86ff','#06d6a0','#ef476f','#ffd6a5'];
export function spawnPeds(count = 22) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    const vertical = Math.random() < 0.5;
    let x, y;
    if (vertical) { const rx = V_ROADS[i % V_ROADS.length]; x = rx + (Math.random() < 0.5 ? -78 : 78); y = 80 + Math.random() * 1600; }
    else { const ry = H_ROADS[i % H_ROADS.length]; y = ry + (Math.random() < 0.5 ? -78 : 78); x = 80 + Math.random() * 1850; }
    peds.push({ x, y, r: 10, angle: Math.random() * Math.PI * 2, speed: 34 + Math.random() * 26, state: 'stroll', timer: Math.random() * 3, health: 30, shirt: SHIRTS[i % SHIRTS.length], fleeFrom: null });
  }
  return peds;
}
export function scarePeds(peds, x, y, radius = 260) {
  for (const p of peds) if (Math.hypot(p.x - x, p.y - y) < radius) { p.state = 'flee'; p.fleeFrom = { x, y }; p.timer = 2.2; }
}
export function updatePeds(peds, dt, world, danger) {
  for (const p of peds) {
    if (p.health <= 0) continue;
    p.timer -= dt;
    if (danger && Math.hypot(p.x - danger.x, p.y - danger.y) < 150) { p.state = 'flee'; p.fleeFrom = danger; p.timer = Math.max(p.timer, 0.6); }
    if (p.state === 'flee' && p.fleeFrom) {
      p.angle = Math.atan2(p.y - p.fleeFrom.y, p.x - p.fleeFrom.x);
      const sp = 150;
      p.x += Math.cos(p.angle) * sp * dt; p.y += Math.sin(p.angle) * sp * dt;
      if (p.timer <= 0) { p.state = 'stroll'; p.timer = 1 + Math.random() * 3; }
    } else {
      if (p.timer <= 0) { p.timer = 2 + Math.random() * 4; p.angle = Math.random() * Math.PI * 2; }
      p.x += Math.cos(p.angle) * p.speed * dt; p.y += Math.sin(p.angle) * p.speed * dt;
    }
    const pos = { x: p.x, y: p.y }; collideBuildings(pos, p.r, world); p.x = clamp(pos.x, 24, 2060); p.y = clamp(pos.y, 24, 1776);
  }
}
