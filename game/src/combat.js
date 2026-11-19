// Combat: punches, pistol fire with ammo and reload, bullets, particles and screen shake.
import { dist } from './config.js';
import { hasLineOfSight } from './world.js';

export function createCombat() {
  return { bullets: [], particles: [], floaters: [] };
}
export function spawnParticles(c, x, y, color, n = 8, speed = 130) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.7);
    c.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35 + Math.random() * 0.3, color, size: 2 + Math.random() * 3 });
  }
}
export function tryAttack(game, audio) {
  const p = game.player;
  if (p.inCar || p.fireCooldown > 0 || p.reloading > 0) return;
  if (p.weapon === 'pistol') {
    if (p.ammo <= 0) { startReload(game, audio); return; }
    p.ammo--; p.fireCooldown = 0.22;
    const spread = (Math.random() - 0.5) * 0.06;
    game.combat.bullets.push({ x: p.x + Math.cos(p.angle) * 18, y: p.y + Math.sin(p.angle) * 18, vx: Math.cos(p.angle + spread) * 780, vy: Math.sin(p.angle + spread) * 780, life: 0.55, fromPlayer: true });
    spawnParticles(game.combat, p.x + Math.cos(p.angle) * 22, p.y + Math.sin(p.angle) * 22, '#ffd166', 4, 90);
    audio.shot();
    game.onShotFired?.();
    if (p.ammo === 0) startReload(game, audio);
  } else {
    p.fireCooldown = 0.34; audio.punch();
    // Punch hits whatever is close in front.
    for (const ped of game.peds) {
      if (ped.health > 0 && dist(p.x, p.y, ped.x, ped.y) < 34) {
        ped.health -= 16; spawnParticles(game.combat, ped.x, ped.y, '#ff8fa3', 6, 90);
        game.onCrime?.('punch'); ped.state = 'flee'; ped.fleeFrom = { x: p.x, y: p.y }; ped.timer = 2;
      }
    }
    for (const car of game.cars) {
      if (dist(p.x, p.y, car.x, car.y) < 40) { car.health -= 3; spawnParticles(game.combat, car.x, car.y, '#ced4da', 4, 80); }
    }
  }
}
export function startReload(game, audio) {
  const p = game.player;
  if (p.reloading > 0 || p.reserve <= 0 || p.ammo >= 12) return;
  p.reloading = 1.1; audio.reload();
}
export function finishReload(game) {
  const p = game.player;
  const need = 12 - p.ammo, take = Math.min(need, p.reserve);
  p.ammo += take; p.reserve -= take;
}
export function updateCombat(game, dt) {
  const c = game.combat;
  for (const b of c.bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.fromPlayer) {
      for (const ped of game.peds) {
        if (ped.health > 0 && dist(b.x, b.y, ped.x, ped.y) < 12) {
          ped.health -= 30; b.life = 0; spawnParticles(c, ped.x, ped.y, '#e63946', 8, 120);
          game.onCrime?.('shootout');
        }
      }
      for (const car of game.cars) {
        if (dist(b.x, b.y, car.x, car.y) < 26) { car.health -= 9; b.life = 0; spawnParticles(c, b.x, b.y, '#ffd166', 6, 140); }
      }
    }
  }
  c.bullets = c.bullets.filter(b => b.life > 0 && hasLineOfSight(b.x, b.y, b.x + 1, b.y + 1, game.world) !== false && b.x > 0 && b.y > 0);
  for (const pt of c.particles) { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vx *= 0.9; pt.vy *= 0.9; pt.life -= dt; }
  c.particles = c.particles.filter(pt => pt.life > 0);
  for (const f of c.floaters) { f.y -= 30 * dt; f.life -= dt; }
  c.floaters = c.floaters.filter(f => f.life > 0);
}
