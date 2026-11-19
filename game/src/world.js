// City generation for Palmera: road grid, buildings with collision, palms, props, beach and water.
import { WORLD_W, WORLD_H, V_ROADS, H_ROADS, ROAD_W, BEACH_X, WATER_X, ROOF_COLORS } from './config.js';

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function isOnRoad(x, y) {
  for (const rx of V_ROADS) if (Math.abs(x - rx) < ROAD_W / 2) return true;
  for (const ry of H_ROADS) if (Math.abs(y - ry) < ROAD_W / 2) return true;
  return false;
}
export function nearestRoadPoint(x, y) {
  let best = { x, y }, bd = 1e9;
  for (const rx of V_ROADS) { const d = Math.abs(x - rx); if (d < bd) { bd = d; best = { x: rx, y }; } }
  for (const ry of H_ROADS) { const d = Math.abs(y - ry); if (d < bd) { bd = d; best = { x, y: ry }; } }
  return best;
}
// Snap a point to the road network: returns {x,y,axis} where axis is 'v' or 'h'.
export function snapToRoad(x, y) {
  let bd = 1e9, out = { x, y, axis: 'v' };
  for (const rx of V_ROADS) { const d = Math.abs(x - rx); if (d < bd) { bd = d; out = { x: rx, y, axis: 'v' }; } }
  for (const ry of H_ROADS) { const d = Math.abs(y - ry); if (d < bd) { bd = d; out = { x, y: ry, axis: 'h' }; } }
  return out;
}

export function createWorld(seed = 7) {
  const rand = rng(seed * 7919 + 13);
  const buildings = [];
  // Blocks sit between roads; fill each block with 1-4 buildings leaving sidewalk margins.
  const xs = [40, ...V_ROADS.flatMap(r => [r + ROAD_W / 2 + 14, r - ROAD_W / 2 - 14]), WORLD_W - 40];
  const blocksX = [];
  const edgesX = [20, ...V_ROADS.flatMap(r => [r - ROAD_W / 2, r + ROAD_W / 2]), BEACH_X];
  const edgesY = [20, ...H_ROADS.flatMap(r => [r - ROAD_W / 2, r + ROAD_W / 2]), WORLD_H - 20];
  for (let i = 0; i + 1 < edgesX.length; i += 2) blocksX.push([edgesX[i], edgesX[i + 1]]);
  const blocksY = [];
  for (let i = 0; i + 1 < edgesY.length; i += 2) blocksY.push([edgesY[i], edgesY[i + 1]]);
  void xs;
  for (const [x0, x1] of blocksX) for (const [y0, y1] of blocksY) {
    const w = x1 - x0, h = y1 - y0; if (w < 90 || h < 90) continue;
    const cols = w > 300 ? 2 : 1, rows = h > 300 ? 2 : 1;
    for (let cx = 0; cx < cols; cx++) for (let cy = 0; cy < rows; cy++) {
      const bw = (w / cols) - 36, bh = (h / rows) - 36;
      const bx = x0 + (w / cols) * cx + 18, by = y0 + (h / rows) * cy + 18;
      buildings.push({ x: bx, y: by, w: bw, h: bh, color: ROOF_COLORS[Math.floor(rand() * ROOF_COLORS.length)], floors: 1 + Math.floor(rand() * 5) });
    }
  }
  const palms = [], props = [];
  for (let i = 0; i < 130; i++) {
    const x = 30 + rand() * (WORLD_W - 60), y = 30 + rand() * (WORLD_H - 60);
    if (isOnRoad(x, y) || x > WATER_X) continue;
    if (buildings.some(b => x > b.x - 8 && x < b.x + b.w + 8 && y > b.y - 8 && y < b.y + b.h + 8)) continue;
    (rand() < 0.7 ? palms : props).push({ x, y, s: 0.8 + rand() * 0.5, kind: rand() < 0.5 ? 'bench' : 'lamp' });
  }
  // Beach palms line
  for (let y = 60; y < WORLD_H - 40; y += 90) palms.push({ x: BEACH_X + 30 + rand() * 60, y, s: 1, kind: 'palm' });
  return { buildings, palms, props, seed };
}

export function collideBuildings(pos, r, world) {
  for (const b of world.buildings) {
    const nx = Math.max(b.x, Math.min(pos.x, b.x + b.w)), ny = Math.max(b.y, Math.min(pos.y, b.y + b.h));
    const dx = pos.x - nx, dy = pos.y - ny, d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      if (d2 === 0) { pos.x = b.x - r; continue; }
      const d = Math.sqrt(d2); pos.x = nx + (dx / d) * r; pos.y = ny + (dy / d) * r;
    }
  }
  pos.x = Math.max(16, Math.min(WORLD_W - 16, pos.x));
  pos.y = Math.max(16, Math.min(WORLD_H - 16, pos.y));
  if (pos.x > WATER_X + 30) pos.x = WATER_X + 30;
}
export function pointInBuilding(x, y, world) {
  return world.buildings.some(b => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h);
}
export function hasLineOfSight(ax, ay, bx, by, world) {
  const steps = 14;
  for (let i = 1; i < steps; i++) {
    const t = i / steps, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
    if (pointInBuilding(x, y, world)) return false;
  }
  return true;
}
