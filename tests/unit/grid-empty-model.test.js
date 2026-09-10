/**
 * A grid for a model with nothing in it.
 *
 * `niceBounds` answers [0, 0, 0] when the largest extent of the bounding box is
 * zero, which is what an empty model gives it - a construction-only cadquery
 * sketch, say, whose faces compound is empty. `delta` is then zero, and the
 * label loop in `create()` used to step by zero: it never advanced, never
 * threw, and froze the tab with an empty console.
 *
 * A regression shows up as a hung test run rather than a failure, because that
 * is what the defect is.
 */

import { describe, test, expect } from "vitest";
import * as THREE from "three";
import { Grid } from "../../src/scene/grid.js";
import { BoundingBox } from "../../src/scene/bbox.js";

function emptyGrid() {
  return new Grid({
    // Empty: min and max both at the origin, which is what a model with
    // nothing in it leaves behind.
    bbox: new BoundingBox(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)),
    ticks: 10,
    gridFontSize: 12,
    centerGrid: false,
    axes0: false,
    grid: [true, true, true],
    flipY: true,
    theme: "light",
    cadWidth: 800,
    height: 600,
    maxAnisotropy: 1,
    getCamera: () => null,
    getAxes0: () => false,
  });
}

describe("Grid - a model with no extent", () => {
  test("create() returns instead of stepping by zero for ever", async () => {
    const grid = emptyGrid();
    await grid.create();

    expect(grid.size).toBe(0);
    expect(grid.delta).toBe(0);

    // Three GridHelper groups, and not one label sprite among them: there is
    // nowhere to put a tick on a grid of no size.
    const sprites = [];
    grid.traverse((child) => {
      if (child.isSprite) sprites.push(child);
    });
    expect(sprites).toHaveLength(0);
  });
});
