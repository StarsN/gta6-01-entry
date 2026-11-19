// Vehicles: spawning, car physics (acceleration, brake, steering), damage and drawing data.
import { CAR_COLORS, clamp } from './config.js';
import { V_ROADS, H_ROADS } from './config.js';
import { collideBuildings } from './world.js';

let nextId = 1;
export function makeCar(x, y, angle, opts = {}) {
  return {
    id: nextId++, x, y, angle, speed: 0, w: 44, h: 22,
    color: opts.color || CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
    kind: opts.kind || 'sedan', // sedan | sport | taxi | police | target
    health: 100, driver: opts.driver || null, // 'traffic' | 'police' | 'player' | null
    stolen: false, name: opts.name || 'Palmera Sedan',
  };
}
export function spawnParkedCars(count = 16) {
  const cars = [];
  const spots = [[478,436],[860,640],[1240,260],[1620,640],[420,1040],[860,1440],[1240,1040],[1620,1440],[620,420],[1020,860],[1420,420],[1820,860],[520,1260],[1120,1260],[1720,1260],[760,180]];
  for (let i = 0; i < Math.min(count, spots.length); i++) {
    const [x, y] = spots[i];
    const kinds = ['sedan','sport','taxi'];
    cars.push(makeCar(x, y, Math.random() < 0.5 ? 0 : Math.PI, { kind: kinds[i % 3], name: ['Palmera Sedan','Solstice Coupe','Sol Cab'][i % 3] }));
  }
  return cars;
}
export function roadSpawnPoints() {
  const pts = [];
  for (const rx of V_ROADS) for (const ry of H_ROADS) pts.push({ x: rx, y: ry });
  return pts;
}
// One physics step for any car. throttle: -1 brake/reverse .. 1 accelerate. steer: -1..1.
export function driveStep(car, throttle, steer, dt, world) {
  const before = { x: car.x, y: car.y };
  const accel = car.kind === 'sport' ? 300 : 220, maxF = car.kind === 'sport' ? 340 : 265, maxR = 115;
  if (throttle > 0) car.speed = Math.min(maxF, car.speed + accel * dt);
  else if (throttle < 0) {
    if (car.speed > 8) car.speed = Math.max(0, car.speed - 380 * dt);
    else car.speed = Math.max(-maxR, car.speed - 150 * dt);
  }
  car.speed -= car.speed * 0.5 * dt;
  if (Math.abs(car.speed) > 2) {
    const sp = clamp(Math.abs(car.speed) / 55, 0, 1) * 2.0;
    car.angle += steer * sp * dt * (car.speed >= 0 ? 1 : -1);
  }
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  const hitPos = { x: car.x, y: car.y };
  collideBuildings(hitPos, 20, world);
  const crashed = Math.hypot(hitPos.x - car.x, hitPos.y - car.y) > 2;
  car.x = hitPos.x; car.y = hitPos.y;
  void before;
  return crashed;
}
export function carCorners(car) {
  const c = Math.cos(car.angle), s = Math.sin(car.angle), hw = car.w / 2, hh = car.h / 2;
  return [[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]].map(([lx, ly]) => ({ x: car.x + lx * c - ly * s, y: car.y + lx * s + ly * c }));
}
