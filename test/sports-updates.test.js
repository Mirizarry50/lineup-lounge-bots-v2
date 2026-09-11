import test from 'node:test';
import assert from 'node:assert/strict';
import { updateCategory } from '../src/sports-updates.js';
test('feed selects injury and numeric statistical reporting and skips general news', () => {
  assert.equal(updateCategory('Quarterback questionable with hamstring injury'), 'Injury / availability');
  assert.equal(updateCategory('Pitcher update', 'Placed on the injured list'), 'Injury / availability');
  assert.equal(updateCategory('Season recap', 'Threw for 350 yards'), 'Published stats');
  assert.equal(updateCategory('Pitcher carries a 2.31 ERA', 'ERA 2.31'), 'Published stats');
  for (const title of ['Latest power rankings', 'Team unveils new uniforms', 'Coach discusses upcoming season', 'Trade rumors: stars on the move']) assert.equal(updateCategory(title), null);
});
