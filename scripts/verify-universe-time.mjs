import assert from 'node:assert/strict';
import {
  addMonths,
  ensurePlayerBirthDate,
  getAgeAtDate,
  normalizeUniverseDate,
} from '../src/systems/season/UniverseTimeSystem.js';

const legacy = ensurePlayerBirthDate(
  { id: 'legacy-rafael', name: 'Rafael', age: 19, birthYear: 2006 },
  { year: 2025, month: 1 },
);

assert.equal(getAgeAtDate(legacy, { year: 2025, month: 1 }), 19, 'migração não pode alterar idade legada');
assert.equal(getAgeAtDate(legacy, { year: 2026, month: 1 }), 20, 'um ano civil precisa envelhecer o atleta');
const februaryBirthday = { birthDate: { year: 2006, month: 2 } };
assert.equal(getAgeAtDate(februaryBirthday, { year: 2025, month: 1 }), 18, 'não pode envelhecer antes do aniversário');
assert.equal(getAgeAtDate(februaryBirthday, { year: 2025, month: 2 }), 19, 'idade deve mudar no mês de aniversário');
assert.deepEqual(addMonths({ year: 2025, month: 12 }, 1), { year: 2026, month: 1 });
assert.deepEqual(normalizeUniverseDate(2025.5), { year: 2025, month: 7 });

console.log('Universe time checks passed.');
