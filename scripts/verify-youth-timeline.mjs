import assert from 'node:assert/strict';
import { buildPlayerMomentEvents } from '../src/systems/history/PlayerTimelineEvents.js';

const player = {
  id: 'timeline-junior', birthYear: 2008,
  youthProfile: {
    birthYear: 2008,
    origin: { label: 'projeto público', discoveryAge: 7 },
    childhood: { firstCourt: 'quadra escolar', firstMotivation: 'conquistar independência' },
    academy: { status: 'AFFILIATED', academyName: 'Open Court Network', lens: 'OPEN_FORMATION', alignment: 'ADAPTED', joinedAge: 11 },
    junior: { circuitEntryYear: 2022, peakTier: 'JUNIOR_ELITE', seasonLedger: [{ year: 2024, titles: 1, finals: 1, events: 6, bestRound: 'F' }] },
    transition: { status: 'PRO_DEBUT', route: 'JUNIOR_GRADUATE', proDebutYear: 2025 },
  },
};
const events = buildPlayerMomentEvents(player);
assert.ok(events.some(event => event.type === 'YOUTH_ORIGIN'));
assert.ok(events.some(event => event.type === 'YOUTH_ACADEMY'));
assert.ok(events.some(event => event.type === 'JUNIOR_CIRCUIT'));
assert.ok(events.some(event => event.type === 'YOUTH_TRANSITION'));
assert.ok(events.every(event => Number.isFinite(event.year)));
console.log('Youth timeline verification passed.');
