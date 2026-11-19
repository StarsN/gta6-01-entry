// The player: on-foot movement, sprint, health, cash, weapon state and respawn.
import { clamp } from './config.js';
import { collideBuildings } from './world.js';

export function createPlayer(x = 420, y = 420) {
  return {
    x, y, r: 13, angle: 0, health: 100, maxHealth: 100, money: 120,
    weapon: 'fists', ammo: 24, reserve: 48, reloading: 0, fireCooldown: 0,
    inCar: null, speedNow: 0, dead: false, bustedTimer: 0,
  };
}
export function updatePlayerOnFoot(p, input, dt, world, aimWorld) {
  const mv = input.moveAxis();
  const sprint = input.isDown('ShiftLeft', 'ShiftRight');
  const speed = sprint ? 235 : 150;
  p.speedNow = mv.active ? speed : 0;
  if (mv.active) {
    p.x += mv.x * speed * dt; p.y += mv.y * speed * dt;
    const pos = { x: p.x, y: p.y }; collideBuildings(pos, p.r, world); p.x = pos.x; p.y = pos.y;
  }
  if (aimWorld) p.angle = Math.atan2(aimWorld.y - p.y, aimWorld.x - p.x);
  else if (mv.active) p.angle = Math.atan2(mv.y, mv.x);
  if (p.reloading > 0) p.reloading -= dt;
  if (p.fireCooldown > 0) p.fireCooldown -= dt;
  p.health = clamp(p.health, 0, p.maxHealth);
}
export function respawnPlayer(p, fineRate = 0.1) {
  const fine = Math.min(p.money, Math.floor(p.money * fineRate) + 10);
  p.money -= fine;
  p.health = p.maxHealth; p.x = 420; p.y = 420; p.inCar = null; p.dead = false; p.bustedTimer = 0;
  return fine;
}
