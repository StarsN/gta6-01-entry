// Keyboard and mouse input: held keys, one-shot presses, aim position.
export function createInput(canvas) {
  const held = new Set(), pressed = new Set();
  const mouse = { x: 0, y: 0, down: false };
  const code = (e) => e.code;
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    if (!e.repeat) pressed.add(code(e));
    held.add(code(e));
  });
  window.addEventListener('keyup', (e) => held.delete(code(e)));
  window.addEventListener('blur', () => { held.clear(); mouse.down = false; });
  canvas.addEventListener('mousemove', (e) => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
  canvas.addEventListener('mousedown', (e) => { if (e.button === 0) { mouse.down = true; pressed.add('Mouse0'); } });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) mouse.down = false; });
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); }, { passive: false });
  return {
    held, mouse,
    isDown(...codes) { return codes.some(c => held.has(c)); },
    wasPressed(...codes) { return codes.some(c => pressed.has(c)); },
    endFrame() { pressed.clear(); },
    moveAxis() {
      let x = 0, y = 0;
      if (this.isDown('KeyA', 'ArrowLeft')) x -= 1;
      if (this.isDown('KeyD', 'ArrowRight')) x += 1;
      if (this.isDown('KeyW', 'ArrowUp')) y -= 1;
      if (this.isDown('KeyS', 'ArrowDown')) y += 1;
      const len = Math.hypot(x, y) || 1;
      return { x: x / len, y: y / len, active: x !== 0 || y !== 0 };
    },
  };
}
