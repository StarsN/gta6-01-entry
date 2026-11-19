// Palmera Heat — tuning constants shared by every system.
export const WORLD_W = 2400, WORLD_H = 1800;
export const ROAD_W = 120;
export const V_ROADS = [300, 700, 1100, 1500, 1900];
export const H_ROADS = [300, 700, 1100, 1500];
export const BEACH_X = 2080, WATER_X = 2240;
export const SAVE_KEY = 'palmera-heat-save-v1';
export const DISTRICTS = [
  { name: 'Old Palmera', x: 120, y: 110 }, { name: 'Marina Flats', x: 900, y: 110 },
  { name: 'Calle Sol', x: 1650, y: 110 }, { name: 'Turtle Beach', x: 2110, y: 420 },
  { name: 'Mercado District', x: 430, y: 880 }, { name: 'Palmera Heights', x: 1240, y: 880 },
  { name: 'South Docks', x: 900, y: 1600 }, { name: 'Palm Row', x: 200, y: 1600 },
];
export const CAR_COLORS = ['#ef476f','#ffd166','#06d6a0','#118ab2','#f78c6b','#9b5de5','#fee440','#00bbf9','#e07a5f','#ffffff'];
export const ROOF_COLORS = ['#e07a5f','#f2cc8f','#81b29a','#f4a261','#e9c46a','#bc6c25','#d4a373','#a7c957'];
export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
export function angleLerp(a, b, t) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * t; }
