// Traffic AI: cars follow the road grid, pick new headings at intersections, avoid collisions.
import { V_ROADS, H_ROADS } from './config.js';
import { makeCar, driveStep } from './vehicles.js';

export function spawnTraffic(count = 10) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const vertical = Math.random() < 0.5;
    if (vertical) {
      const rx = V_ROADS[i % V_ROADS.length];
      const dir = Math.random() < 0.5 ? 1 : -1;
      const lane = dir > 0 ? 22 : -22;
      const c = makeCar(rx + lane, 150 + Math.random() * 1500, dir > 0 ? Math.PI / 2 : -Math.PI / 2, { driver: 'traffic' });
      c.aiDir = dir; c.aiAxis = 'v'; c.aiRoad = rx; cars.push(c);
    } else {
      const ry = H_ROADS[i % H_ROADS.length];
      const dir = Math.random() < 0.5 ? 1 : -1;
      const lane = dir > 0 ? 22 : -22;
      const c = makeCar(150 + Math.random() * 1700, ry + lane, dir > 0 ? 0 : Math.PI, { driver: 'traffic' });
      c.aiDir = dir; c.aiAxis = 'h'; c.aiRoad = ry; cars.push(c);
    }
  }
  return cars;
}

function nearIntersection(car) {
  if (car.aiAxis === 'v') return H_ROADS.some(ry => Math.abs(car.y - ry) < 26);
  return V_ROADS.some(rx => Math.abs(car.x - rx) < 26);
}

export function updateTraffic(cars, dt, world, allCars) {
  for (const car of cars) {
    if (car.driver !== 'traffic') continue;
    // Choose a turn at intersections (cooldown prevents jitter).
    car.turnCd = (car.turnCd || 0) - dt;
    if (nearIntersection(car) && car.turnCd <= 0 && Math.random() < 0.45) {
      car.turnCd = 2.5;
      if (car.aiAxis === 'v') {
        const ry = H_ROADS.reduce((a, b) => Math.abs(b - car.y) < Math.abs(a - car.y) ? b : a);
        car.aiAxis = 'h'; car.aiRoad = ry; car.aiDir = Math.random() < 0.5 ? 1 : -1;
      } else {
        const rx = V_ROADS.reduce((a, b) => Math.abs(b - car.x) < Math.abs(a - car.x) ? b : a);
        car.aiAxis = 'v'; car.aiRoad = rx; car.aiDir = Math.random() < 0.5 ? 1 : -1;
      }
    }
    // Desired heading: along axis with right-hand lane offset.
    let targetAngle, tx, ty;
    if (car.aiAxis === 'v') { targetAngle = car.aiDir > 0 ? Math.PI / 2 : -Math.PI / 2; tx = car.aiRoad + (car.aiDir > 0 ? 22 : -22); ty = car.y; }
    else { targetAngle = car.aiDir > 0 ? 0 : Math.PI; tx = car.x; ty = car.aiRoad + (car.aiDir > 0 ? 22 : -22); }
    // Slow for a car ahead.
    let blocked = false;
    for (const o of allCars) {
      if (o === car) continue;
      const dx = o.x - car.x, dy = o.y - car.y, d = Math.hypot(dx, dy);
      if (d < 62 && Math.abs(Math.atan2(dy, dx) - car.angle) < 0.6) blocked = true;
    }
    const laneErr = car.aiAxis === 'v' ? (tx - car.x) : (ty - car.y);
    let steer = 0;
    let angDiff = targetAngle - car.angle;
    while (angDiff > Math.PI) angDiff -= Math.PI * 2; while (angDiff < -Math.PI) angDiff += Math.PI * 2;
    steer = Math.max(-1, Math.min(1, angDiff * 2.2 + (car.aiAxis === 'v' ? laneErr * 0.004 * car.aiDir : -laneErr * 0.004 * car.aiDir)));
    const throttle = blocked ? -0.6 : (Math.abs(car.speed) < 120 ? 0.8 : 0.1);
    driveStep(car, throttle, steer, dt, world);
    // Keep traffic inside the world: respawn at an edge if it leaves.
    if (car.x < 30 || car.x > 2050 || car.y < 30 || car.y > 1770) {
      const fresh = spawnTraffic(1)[0]; car.x = fresh.x; car.y = fresh.y; car.angle = fresh.angle; car.aiAxis = fresh.aiAxis; car.aiRoad = fresh.aiRoad; car.aiDir = fresh.aiDir; car.speed = 0;
    }
  }
}
