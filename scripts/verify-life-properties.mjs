import assert from 'node:assert/strict';
import { ensurePropertyPortfolio, getPropertyLifeEffects } from '../src/systems/life/LifePropertySystem.js';

const player = ensurePropertyPortfolio({
  id: 'property-test', nationality: 'BRA',
  lifeData: { home: { city: 'Bento Gonçalves', country: 'BRA', properties: [{ type: 'casa', label: 'Casa de família', main: true }] } },
});

const home = player.lifeData.home.properties[0];
assert.equal(home.city, 'Bento Gonçalves');
assert.equal(home.ownership, 'OWNED');
assert.ok(home.setting);
assert.ok(Object.keys(getPropertyLifeEffects(player)).length > 0);
console.log('Life property checks passed.');
