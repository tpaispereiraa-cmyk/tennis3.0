import assert from 'node:assert/strict';
import { initSponsorPool } from '../src/systems/sponsors/SponsorPool.js';
import { ensureSponsorPoolFoundation, getSponsorCompanyProfile } from '../src/systems/sponsors/SponsorCompanySystem.js';
import { signContract } from '../src/systems/sponsors/SponsorPool.js';

let pool = initSponsorPool({ year: 2025 });
const firstId = Object.keys(pool.states)[0];
const company = getSponsorCompanyProfile(pool, firstId);
assert.ok(company?.executives?.ceo?.name);
assert.equal(company.monthlyMarketingEnvelope, Math.round(company.annualMarketingBudget / 12));
assert.ok(company.strategy?.id);
pool.states[firstId].contracts.push({ annualFee: 100_000 });
pool = ensureSponsorPoolFoundation(pool, 2025);
assert.equal(pool.states[firstId].company.budgetCommitted, 100_000);
assert.equal(pool.states[firstId].company.budgetAvailable, Math.max(0, pool.states[firstId].company.annualMarketingBudget - 100_000));
pool = signContract(pool, { id:'audit-contract', sponsorId:firstId, playerId:'p', annualFee:50_000, seasonSigned:2025 });
assert.equal(pool.states[firstId].company.budgetCommitted, 150_000);
console.log('Sponsor company foundation checks passed.');
