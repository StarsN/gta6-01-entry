// Deterministic screenshot scenes via ?shot=<name>&seed=<n>.
// Each scene builds the real game, stages it by simulating play, then freezes on a composed frame.
export function parseShot() {
  const q = new URLSearchParams(location.search);
  const shot = q.get('shot');
  if (!shot) return null;
  return { name: shot, seed: Number(q.get('seed') || 7) || 7 };
}

// Called by main.js after the game exists: arrange actors for the requested scene.
export function stageShot(game, shot) {
  const p = game.player;
  game.state = 'playing';
  if (shot.name === 'cover') {
    p.x = 1060; p.y = 640; game.camera.x = p.x - 640; game.camera.y = p.y - 360;
    game.setMissionIndex(0);
    return;
  }
  if (shot.name === 'drive') {
    // Player driving east through traffic on the central avenue.
    game.setMissionIndex(1);
    const car = game.cars.find(c => c.driver !== 'police');
    car.x = 760; car.y = 722; car.angle = 0; car.speed = 150; car.driver = 'player';
    p.inCar = car; p.x = car.x; p.y = car.y;
    let i = 0;
    for (const c of game.cars) { if (c !== car && c.driver === 'traffic') { c.x = 860 + i * 130; c.y = i % 2 ? 678 : 724; c.angle = i % 2 ? Math.PI : 0; c.speed = 90; i++; } }
    game.toast('Downtown traffic — watch the lights!', '#fff');
    return;
  }
  if (shot.name === 'chase') {
    // Police chase: wanted 3 stars, mission objective visible.
    game.setMissionIndex(3);
    game.mission.phase = 'active'; game.mission.stage = 'hide';
    game.wanted.heat = 260; game.wanted.level = 3;
    const car = game.cars.find(c => c.driver !== 'police');
    car.x = 1080; car.y = 700; car.angle = 0.3; car.speed = 190; car.driver = 'player';
    p.inCar = car; p.x = car.x; p.y = car.y; p.money = 470;
    game.ensurePolice();
    let i = 0;
    for (const c of game.cars) if (c.driver === 'police') { c.x = 950 - i * 90; c.y = 640 + i * 55; c.angle = 0.2; c.speed = 170; i++; }
    game.toast('The PD is on you — break line of sight!', '#ff8fa3');
    return;
  }
  if (shot.name === 'mission') {
    // On-foot mission moment with dialogue open.
    game.setMissionIndex(0);
    p.x = 470; p.y = 455; p.weapon = 'pistol'; p.ammo = 9; p.money = 270;
    game.startDialogue(0);
    return;
  }
  // Fallback: treat unknown names like the cover scene.
  p.x = 1060; p.y = 640;
}
