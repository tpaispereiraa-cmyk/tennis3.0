import { createCircuitShockState, SHOCK_MODES } from '../src/systems/press/circuitShock/ShockTypes.js';
import { runCircuitShockPulse } from '../src/systems/press/circuitShock/CircuitShockSystem.js';
import { auditShockWorld, verifyFameSeparation, verifyShockDeterminism } from '../src/systems/press/circuitShock/ShockAudit.js';

const players = Array.from({ length: 80 }, (_, index) => ({
  id: `audit-${index}`, name: `Jogador ${index}`, age: 18 + index % 20, rank: index + 1,
  marketability: 10 + index, physicalCondition: 55 + index % 40, potential: 45 + index % 50,
  personality: { currentState: { pressureLevel: 15 + index % 55 }, competitiveArchetype: { id: index % 2 ? 'TACTICIAN' : 'REBEL' } },
  coaching: { trust: 35 + index % 55 }, finance: { balance: index % 6 ? 120000 : -20000 }, careerStats: {},
}));

if (!verifyShockDeterminism(players)) throw new Error('Circuit Shock deixou de ser determinístico.');
const fame = verifyFameSeparation(players[12]);
if (!fame.causalRiskStable || !fame.coverageChanges) throw new Error(`Fama contaminou risco causal: ${JSON.stringify(fame)}`);

let state = createCircuitShockState(2025, { mode: SHOCK_MODES.DRAMATIC, seed: 'long-audit' });
let roster = players;
for (let slot = 0; slot < 120; slot += 1) {
  const result = runCircuitShockPulse(roster, 2025, state, { phase: 'TOURNAMENT', slot });
  roster = result.players; state = result.directorState;
}
const audit = auditShockWorld(state, roster);
if (!audit.ok) throw new Error(audit.issues.join('\n'));
console.log(JSON.stringify({ ok: true, fame, metrics: state.metrics, cases: state.history.length }, null, 2));
