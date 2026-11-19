// Story missions: a chain of six jobs from original Palmera characters, with dialogue and rewards.
// Types used: goto, steal-deliver, timed delivery, escape, checkpoints, shootout.
export const CHARACTERS = {
  rosa: { name: 'Rosa Delgado', color: '#ff006e' },
  marcos: { name: 'Marcos Vale', color: '#3a86ff' },
  ines: { name: 'Ines Park', color: '#06d6a0' },
};
export const MISSIONS = [
  {
    id: 'm1', title: 'Welcome to Palmera', giver: 'rosa', type: 'goto', reward: 150,
    target: { x: 1120, y: 420, label: 'Cafe Brisa' },
    intro: [
      ['rosa', 'You must be the new driver everyone is whispering about. I am Rosa.'],
      ['rosa', 'First rule of Palmera: show up on time. Meet me at Cafe Brisa, east side.'],
    ],
    done: 'You found it. The city already likes you.',
  },
  {
    id: 'm2', title: 'Borrowed Wheels', giver: 'marcos', type: 'steal', reward: 300,
    target: { x: 1560, y: 760, label: 'the gold Solstice Coupe' }, deliver: { x: 480, y: 1180, label: 'Rosa\'s garage' },
    intro: [
      ['marcos', 'Marcos Vale. A gold coupe near Calle Sol owes Rosa money.'],
      ['marcos', 'Take it — any way you like — and bring it to her garage. Expect heat.'],
    ],
    done: 'Clean delivery. Rosa sends her thanks — and your cut.',
  },
  {
    id: 'm3', title: 'Hot Mangoes', giver: 'ines', type: 'timed', reward: 350, timeLimit: 75,
    target: { x: 1900, y: 1180, label: 'the South Docks' },
    intro: [
      ['ines', 'Ines Park, South Docks. A crate of festival mangoes melts by the minute.'],
      ['ines', 'Grab any fast car and get to the docks before the timer dies. Go!'],
    ],
    done: 'Ice cold and right on time. The festival is saved.',
  },
  {
    id: 'm4', title: 'Lose the Blue', giver: 'rosa', type: 'escape', reward: 400, wantedNeeded: 2,
    target: { x: 700, y: 700, label: 'downtown' },
    intro: [
      ['rosa', 'The PD is watching my block tonight. Draw their attention downtown,'],
      ['rosa', 'get two stars, then lose them — hide until the heat cools. Do not get caught.'],
    ],
    done: 'Gone like sea mist. Rosa can breathe again.',
  },
  {
    id: 'm5', title: 'Palm Row Run', giver: 'marcos', type: 'checkpoints', reward: 500, timeLimit: 110,
    checkpoints: [
      { x: 300, y: 1100, label: 'Palm Row gate' }, { x: 1100, y: 1500, label: 'South arch' },
      { x: 1900, y: 1100, label: 'Beach turn' }, { x: 1500, y: 300, label: 'Calle Sol lights' },
      { x: 700, y: 300, label: 'Finish — Old Palmera' },
    ],
    intro: [
      ['marcos', 'One run, five gates, whole city watching. Hit every checkpoint in order.'],
      ['marcos', 'Beat the clock and Palmera is yours.'],
    ],
    done: 'Every gate, no excuses. That was beautiful driving.',
  },
  {
    id: 'm6', title: 'Last Night in Palmera', giver: 'ines', type: 'shootout', reward: 800, waves: 4,
    target: { x: 1300, y: 880, label: 'Palmera Heights overlook' },
    intro: [
      ['ines', 'Rival crew — the Coral Jackals — are holding the Heights overlook.'],
      ['ines', 'Clear them out. Take the pistol from the crate by the fountain first.'],
    ],
    done: 'The overlook is quiet. Palmera sleeps safe — because of you.',
  },
];
export const ENDING_TEXT = 'Story complete. Rosa, Marcos and Ines raise a toast at Cafe Brisa: Palmera is yours now. Free roam — the city never sleeps.';

export function createMissionState() {
  return { index: 0, phase: 'offer', /* offer | active | done */ dialogue: [], dialogueIdx: 0, timer: 0, checkpointIdx: 0, enemies: [], complete: false, targetCarId: null };
}
export function currentMission(state) { return state.index < MISSIONS.length ? MISSIONS[state.index] : null; }
export function objectiveText(state) {
  const m = currentMission(state); if (!m) return 'Free roam — explore Palmera.';
  if (state.phase === 'offer') return `Meet ${CHARACTERS[m.giver].name} — start: ${m.title}`;
  if (state.phase !== 'active') return m.title;
  switch (m.type) {
    case 'goto': return `Go to ${m.target.label}`;
    case 'steal': return state.stage === 'deliver' ? `Deliver the coupe to ${m.deliver.label}` : `Steal ${m.target.label}`;
    case 'timed': return `Reach ${m.target.label} — ${Math.max(0, Math.ceil(state.timer))}s left`;
    case 'escape': return state.stage === 'hide' ? 'Hide from the police until the stars fade' : `Get ${m.wantedNeeded} wanted stars downtown`;
    case 'checkpoints': return `Checkpoint ${state.checkpointIdx + 1}/${m.checkpoints.length} — ${m.checkpoints[state.checkpointIdx].label} (${Math.max(0, Math.ceil(state.timer))}s)`;
    case 'shootout': return `Clear the overlook — ${state.enemies.filter(e => e.health > 0).length} Jackals left`;
    default: return m.title;
  }
}
export function markerFor(state) {
  const m = currentMission(state); if (!m) return null;
  if (state.phase === 'offer') {
    const spots = { rosa: { x: 420, y: 420 }, marcos: { x: 480, y: 1180 }, ines: { x: 1900, y: 1240 } };
    return { ...spots[m.giver], label: CHARACTERS[m.giver].name };
  }
  if (state.phase !== 'active') return null;
  if (m.type === 'steal' && state.stage === 'deliver') return { ...m.deliver };
  if (m.type === 'checkpoints') return { ...m.checkpoints[state.checkpointIdx] };
  if (m.type === 'escape' && state.stage === 'hide') return null;
  return m.target ? { ...m.target } : null;
}
export function giverSpot(m) {
  return { rosa: { x: 420, y: 420 }, marcos: { x: 480, y: 1180 }, ines: { x: 1900, y: 1240 } }[m.giver];
}
