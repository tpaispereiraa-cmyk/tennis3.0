import assert from 'node:assert/strict';
import { getOpponentRead, observeOpponentShot } from '../src/systems/shotengine/OpponentObservation.js';
const attacker = { id: 'attacker' };
const high = { attrs: { leitura: 92 }, ctx: {} };
const low = { attrs: { leitura: 35 }, ctx: {} };
const deep = { family: 'TOPSPIN', direction: 'CROSS', targetY: -9.5, quality: 0.75 };
const drop = { family: 'DROP', direction: 'CROSS', targetY: -5, quality: 0.75 };
for (let i = 0; i < 12; i++) for (const defender of [high, low]) { observeOpponentShot(defender, attacker, deep); observeOpponentShot(defender, attacker, drop); }
assert.ok(getOpponentRead(high, attacker).dropAwareness > getOpponentRead(low, attacker).dropAwareness);
assert.ok(getOpponentRead(high, attacker).dropAwareness > 0.25);
assert.equal(getOpponentRead(low, { id: 'other' }), null);
console.log('opponent adaptation ok');
