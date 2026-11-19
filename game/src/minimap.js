// Live minimap: roads, water, player, traffic, police and the mission blip.
import { WORLD_W, WORLD_H, V_ROADS, H_ROADS, WATER_X, BEACH_X } from './config.js';
export function drawMinimap(ctx, x, y, size, game) {
  const sx = size / WORLD_W, sy = size / WORLD_H;
  ctx.save();
  ctx.fillStyle = '#8a9a5b'; ctx.fillRect(x, y, size, size * WORLD_H / WORLD_W);
  ctx.fillStyle = '#e8c98a'; ctx.fillRect(x + BEACH_X * sx, y, (WATER_X - BEACH_X) * sx, size * WORLD_H / WORLD_W);
  ctx.fillStyle = '#2e9db8'; ctx.fillRect(x + WATER_X * sx, y, (WORLD_W - WATER_X) * sx, size * WORLD_H / WORLD_W);
  ctx.strokeStyle = '#3d3a42'; ctx.lineWidth = 5;
  for (const rx of V_ROADS) { ctx.beginPath(); ctx.moveTo(x + rx * sx, y); ctx.lineTo(x + rx * sx, y + size * WORLD_H / WORLD_W); ctx.stroke(); }
  for (const ry of H_ROADS) { ctx.beginPath(); ctx.moveTo(x, y + ry * sy); ctx.lineTo(x + size, y + ry * sy); ctx.stroke(); }
  const dot = (wx, wy, color, r = 3) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x + wx * sx, y + wy * sy, r, 0, Math.PI * 2); ctx.fill(); };
  for (const c of game.cars) dot(c.x, c.y, c.driver === 'police' ? '#3a86ff' : '#ddd', 2.5);
  if (game.marker) {
    const pulse = 4 + Math.sin(game.time * 5) * 1.5;
    dot(game.marker.x, game.marker.y, '#ffd166', pulse);
    ctx.strokeStyle = '#ffd166'; ctx.beginPath(); ctx.arc(x + game.marker.x * sx, y + game.marker.y * sy, pulse + 4, 0, Math.PI * 2); ctx.stroke();
  }
  // Player arrow.
  const p = game.player, px = x + p.x * sx, py = y + p.y * sy;
  ctx.translate(px, py); ctx.rotate(p.inCar ? p.inCar.angle : p.angle);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -4.5); ctx.lineTo(-5, 4.5); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 2; ctx.strokeRect(x, y, size, size * WORLD_H / WORLD_W);
}
