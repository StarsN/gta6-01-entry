// HUD drawing: health, money, wanted stars, weapon and ammo, objective, toasts and dialogue.
export function createHud() { return { toasts: [], dialogue: null, dialogueName: '', dialogueColor: '#fff' }; }
export function toast(hud, text, color = '#ffd166') {
  hud.toasts.push({ text, color, life: 3.2 });
  if (hud.toasts.length > 4) hud.toasts.shift();
}
export function updateHud(hud, dt) {
  for (const t of hud.toasts) t.life -= dt;
  hud.toasts = hud.toasts.filter(t => t.life > 0);
}
export function drawHud(ctx, W, H, game) {
  const p = game.player, hud = game.hud;
  ctx.save();
  // Top-left: health bar + money.
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(14, 14, 236, 64);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'left';
  ctx.fillText('HEALTH', 24, 34);
  ctx.fillStyle = '#3a0d12'; ctx.fillRect(24, 40, 180, 13);
  ctx.fillStyle = p.health > 30 ? '#06d6a0' : '#e63946'; ctx.fillRect(24, 40, 180 * Math.max(0, p.health / p.maxHealth), 13);
  ctx.fillStyle = '#ffd166'; ctx.font = 'bold 17px system-ui';
  ctx.fillText('$' + p.money, 24, 72);
  if (p.inCar) { ctx.fillStyle = '#fff'; ctx.font = '13px system-ui'; ctx.fillText(Math.round(Math.abs(p.inCar.speed) * 0.36) + ' km/h', 110, 72); }
  // Top-right: wanted stars.
  ctx.font = '26px system-ui'; ctx.textAlign = 'right';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < game.wanted.level ? '#ffd166' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', W - 18 - (4 - i) * 30, 40);
  }
  ctx.fillStyle = '#fff'; ctx.font = '13px system-ui';
  ctx.fillText(p.weapon === 'pistol' ? `PISTOL  ${p.ammo} / ${p.reserve}${p.reloading > 0 ? '  RELOADING' : ''}` : 'FISTS', W - 18, 64);
  // Busted meter.
  if (p.bustedTimer > 0.15 && !p.inCar) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(W / 2 - 110, 66, 220, 20);
    ctx.fillStyle = '#e63946'; ctx.fillRect(W / 2 - 106, 70, 212 * Math.min(1, p.bustedTimer / 2.2), 12);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.fillText('BUSTED?', W / 2, 80);
  }
  // Objective banner.
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  const obj = game.objective || '';
  ctx.font = 'bold 15px system-ui';
  const ow = Math.min(W - 40, ctx.measureText(obj).width + 36);
  ctx.fillRect(W / 2 - ow / 2, H - 118, ow, 30);
  ctx.fillStyle = '#ffe8a3'; ctx.fillText(obj, W / 2, H - 97);
  // Toasts.
  ctx.font = 'bold 15px system-ui';
  hud.toasts.forEach((t, i) => {
    ctx.globalAlpha = Math.min(1, t.life);
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; const tw = ctx.measureText(t.text).width + 28;
    ctx.fillRect(W / 2 - tw / 2, 96 + i * 32, tw, 26);
    ctx.fillStyle = t.color; ctx.fillText(t.text, W / 2, 114 + i * 32);
    ctx.globalAlpha = 1;
  });
  // Dialogue box.
  if (hud.dialogue) {
    ctx.fillStyle = 'rgba(10,10,18,0.88)'; ctx.fillRect(60, H - 210, W - 120, 78);
    ctx.strokeStyle = hud.dialogueColor; ctx.lineWidth = 2; ctx.strokeRect(60, H - 210, W - 120, 78);
    ctx.fillStyle = hud.dialogueColor; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(hud.dialogueName, 80, H - 184);
    ctx.fillStyle = '#fff'; ctx.font = '16px system-ui';
    wrapText(ctx, hud.dialogue, 80, H - 160, W - 160, 21);
    ctx.fillStyle = '#aaa'; ctx.font = '12px system-ui'; ctx.textAlign = 'right';
    ctx.fillText('Click / Space to continue', W - 80, H - 142);
  }
  // Interact prompt.
  if (game.prompt) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center';
    const pw = ctx.measureText(game.prompt).width + 30;
    ctx.fillRect(W / 2 - pw / 2, H - 168, pw, 28);
    ctx.fillStyle = '#fff'; ctx.fillText(game.prompt, W / 2, H - 148);
  }
  ctx.restore();
}
export function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '', yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; }
    else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}
