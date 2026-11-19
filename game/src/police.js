// Wanted system and police AI: crimes raise stars, cruisers chase and ram, hiding decays heat.
import { clamp, dist } from './config.js';
import { makeCar, driveStep } from './vehicles.js';
import { hasLineOfSight } from './world.js';

export function createWanted() {
  return { level: 0, heat: 0, hideTimer: 0, seenTimer: 0 };
}
// Witnessed crimes add heat; thresholds convert heat into stars.
export function reportCrime(w, kind, witnessed = true) {
  if (!witnessed) return;
  const gain = { steal: 34, shot: 22, punch: 16, hitPed: 45, hitCar: 12, shootout: 30 }[kind] || 10;
  w.heat = clamp(w.heat + gain, 0, 520);
  w.level = Math.min(5, Math.floor(w.heat / 100) + (w.heat > 0 ? 1 : 0));
  if (w.heat >= 500) w.level = 5;
  w.hideTimer = 0;
}
export function updateWanted(w, dt, playerVisible) {
  if (playerVisible) { w.hideTimer = 0; w.seenTimer += dt; }
  else if (w.level > 0) {
    w.hideTimer += dt;
    if (w.hideTimer > 4) { w.heat = Math.max(0, w.heat - 26 * dt); }
    if (w.heat <= 0) { w.level = 0; }
    else w.level = Math.max(1, Math.min(5, Math.ceil(w.heat / 100)));
  }
}
export function wantedCarCount(level) { return [0, 1, 2, 3, 4, 6][level] || 0; }

export function spawnPolice(player, existing) {
  const angle = Math.random() * Math.PI * 2, d = 520 + Math.random() * 160;
  const x = clamp(player.x + Math.cos(angle) * d, 120, 2000), y = clamp(player.y + Math.sin(angle) * d, 120, 1680);
  const car = makeCar(x, y, angle + Math.PI, { kind: 'police', color: '#f8f9fa', driver: 'police', name: 'Palmera PD Cruiser' });
  car.id = 9000 + existing + Math.floor(Math.random() * 90);
  return car;
}

export function updatePolice(cars, player, dt, world) {
  let anyVisible = false;
  for (const car of cars) {
    if (car.driver !== 'police') continue;
    const target = player.inCar ? player.inCar : player;
    const d = dist(car.x, car.y, target.x, target.y);
    const los = d < 700 && hasLineOfSight(car.x, car.y, target.x, target.y, world);
    if (los) { anyVisible = true; car.lastSeen = { x: target.x, y: target.y }; car.loseTimer = 0; }
    else car.loseTimer = (car.loseTimer || 0) + dt;
    const goal = car.lastSeen || { x: target.x, y: target.y };
    let angDiff = Math.atan2(goal.y - car.y, goal.x - car.x) - car.angle;
    while (angDiff > Math.PI) angDiff -= Math.PI * 2; while (angDiff < -Math.PI) angDiff += Math.PI * 2;
    const steer = clamp(angDiff * 2.4, -1, 1);
    const wantSpeed = d > 90 ? 1 : 0.25;
    const crashed = driveStep(car, wantSpeed, steer, dt, world);
    if (crashed) car.health -= 4;
    // Ram damage to the player's car.
    if (player.inCar && d < 46 && Math.abs(car.speed) > 60) {
      player.inCar.health -= 14 * dt * 4; player.shake = Math.max(player.shake || 0, 5);
    }
    // Busted pressure: a cruiser stopped beside an on-foot player builds the bust meter.
    if (!player.inCar && d < 52 && Math.abs(car.speed) < 40) player.bustedTimer += dt;
  }
  return anyVisible;
}
