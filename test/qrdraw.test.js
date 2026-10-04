// test/qrdraw.test.js — Layout geometry tests across plans, viewports, and display scalings (prompt P5)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PLANS } from '../src/lib/plans.js';
import { calculateGridLayout } from '../src/lib/qrdraw.js';

describe('P5 Layout Geometry — qrdraw', () => {
  const viewports = [
    { width: 1920, height: 1080 },
    { width: 1536, height: 864 },
    { width: 1366, height: 768 },
    { width: 2560, height: 1440 }
  ];

  const dprs = [1, 1.25, 1.5, 2];

  for (const planKey of ['A', 'B', 'C']) {
    const plan = PLANS[planKey];

    describe(`Plan ${planKey} (grid ${plan.gridN}×${plan.gridN}, ${plan.modules} modules)`, () => {
      for (const vp of viewports) {
        for (const dpr of dprs) {
          it(`viewport ${vp.width}×${vp.height} at dpr ${dpr}`, () => {
            const availDevicePx = Math.min(vp.width, vp.height) * dpr;
            const layout = calculateGridLayout(plan, availDevicePx, dpr);

            // 1. Module size is a positive integer number of device pixels
            assert.ok(Number.isInteger(layout.devicePxPerModule), 'devicePxPerModule must be an integer');
            assert.ok(layout.devicePxPerModule >= 1, 'devicePxPerModule must be >= 1');

            // 2. The grid fits the available square
            assert.ok(
              layout.gridDevicePx <= availDevicePx,
              `gridDevicePx (${layout.gridDevicePx}) exceeds available (${availDevicePx})`
            );

            // 3. Canvas pixels divided by devicePixelRatio equals CSS size
            const computedCss = layout.gridDevicePx / dpr;
            assert.equal(layout.cssSize, computedCss);
          });
        }
      }
    });
  }

  it('prints chosen device px per module and grid size for 1920x1080 at dpr 1, 1.25, 1.5 for Plan A', () => {
    const planA = PLANS.A;
    const height = 1080;
    for (const dpr of [1, 1.25, 1.5]) {
      const availPx = height * dpr;
      const res = calculateGridLayout(planA, availPx, dpr);
      console.log(
        `[Plan A @ 1920x1080 dpr=${dpr}] devicePxPerModule = ${res.devicePxPerModule}, ` +
        `gridDevicePx = ${res.gridDevicePx}px, cssSize = ${res.cssSize}px`
      );
      assert.ok(res.devicePxPerModule > 0);
      assert.ok(res.gridDevicePx <= availPx);
    }
  });
});
