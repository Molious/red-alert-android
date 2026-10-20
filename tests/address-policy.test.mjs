// Issue #5: flag destination pins that aren't the house number the driver typed.
import test from 'node:test';
import assert from 'node:assert/strict';
import {isApproximatePin, typedHouseNumber} from '../src/addressPolicy.ts';

test('reads the house number the driver typed', () => {
  assert.equal(typedHouseNumber('34 Smith St, Chermside QLD'), '34');
  assert.equal(typedHouseNumber('12/34 Smith St'), '34', 'unit 12, house 34');
  assert.equal(typedHouseNumber('Unit 3, 34a Smith St'), '34a');
  assert.equal(typedHouseNumber('32-36 Smith St'), '32');
  assert.equal(typedHouseNumber('Westfield Chermside'), null);
  assert.equal(typedHouseNumber(''), null);
});

test('a pin with the typed number, or no number typed, is exact', () => {
  assert.equal(isApproximatePin('34 Smith St', '34'), false);
  assert.equal(isApproximatePin('34a Smith St', '34A'), false);
  assert.equal(isApproximatePin('12/34 Smith St', '12/34'), false);
  assert.equal(isApproximatePin('34 Smith St', '32-36'), false, 'inside a number range');
  assert.equal(isApproximatePin('Westfield Chermside', null), false);
});

test('a pin without the typed number, or a different one, is approximate', () => {
  assert.equal(isApproximatePin('34 Smith St', null), true, 'middle of the street');
  assert.equal(isApproximatePin('34 Smith St', ''), true);
  assert.equal(isApproximatePin('34 Smith St', '36'), true);
  assert.equal(isApproximatePin('34 Smith St', '40-48'), true);
});
