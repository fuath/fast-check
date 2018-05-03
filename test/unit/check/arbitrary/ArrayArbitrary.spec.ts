import * as assert from 'assert';
import * as fc from '../../../../lib/fast-check';

import Arbitrary from '../../../../src/check/arbitrary/definition/Arbitrary';
import Shrinkable from '../../../../src/check/arbitrary/definition/Shrinkable';
import { array } from '../../../../src/check/arbitrary/ArrayArbitrary';
import { integer } from '../../../../src/check/arbitrary/IntegerArbitrary';
import Random from '../../../../src/random/generator/Random';

import * as genericHelper from './generic/GenericArbitraryHelper';

import * as stubRng from '../../stubs/generators';

class DummyArbitrary extends Arbitrary<{ key: number }> {
  constructor(public value: () => number) {
    super();
  }
  generate(mrng: Random): Shrinkable<{ key: number }> {
    return new Shrinkable({ key: this.value() });
  }
}

describe('ArrayArbitrary', () => {
  describe('array', () => {
    it('Should generate an array using specified arbitrary', () =>
      fc.assert(
        fc.property(fc.integer(), seed => {
          const mrng = stubRng.mutable.fastincrease(seed);
          const g = array(new DummyArbitrary(() => 42)).generate(mrng).value;
          assert.deepEqual(g, [...Array(g.length)].map(() => new Object({ key: 42 })));
          return true;
        })
      ));
    it('Should generate an array calling multiple times arbitrary generator', () =>
      fc.assert(
        fc.property(fc.integer(), seed => {
          const mrng = stubRng.mutable.fastincrease(seed);
          let num = 0;
          const g = array(new DummyArbitrary(() => ++num)).generate(mrng).value;
          let numBis = 0;
          assert.deepEqual(g, [...Array(g.length)].map(() => new Object({ key: ++numBis })));
          return true;
        })
      ));
    it('Should not suggest input in shrinked values', () =>
      fc.assert(
        fc.property(fc.integer(), fc.integer(), fc.nat(), (seed, min, num) => {
          const mrng = stubRng.mutable.fastincrease(seed);
          const arb = array(integer(min, min + num));
          const shrinkable = arb.generate(mrng);
          const tab = shrinkable.value;
          return shrinkable
            .shrink()
            .every(s => s.value.length !== tab.length || !s.value.every((vv, idx) => vv === tab[idx]));
        })
      ));
    describe('Given no length constraints', () => {
      genericHelper.isValidArbitrary(() => array(integer()), {
        isValidValue: (g: number[]) => Array.isArray(g) && g.every(v => typeof v === 'number')
      });
    });
    describe('Given maximal length only', () => {
      genericHelper.isValidArbitrary((maxLength: number) => array(integer(), maxLength), {
        seedGenerator: fc.nat(100),
        isValidValue: (g: number[], maxLength: number) =>
          Array.isArray(g) && g.length <= maxLength && g.every(v => typeof v === 'number')
      });
    });
    describe('Given minimal and maximal lengths', () => {
      genericHelper.isValidArbitrary(
        (constraints: { min: number; max: number }) => array(integer(), constraints.min, constraints.max),
        {
          seedGenerator: genericHelper.minMax(fc.nat(100)),
          isValidValue: (g: number[], constraints: { min: number; max: number }) =>
            Array.isArray(g) &&
            g.length >= constraints.min &&
            g.length <= constraints.max &&
            g.every(v => typeof v === 'number')
        }
      );
    });
  });
});
