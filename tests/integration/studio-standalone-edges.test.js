/**
 * Regression: standalone edge-only and vertex-only shapes (no faces) in Studio.
 *
 * NestedGroup.enterStudioMode used to skip groups without a front mesh, so a
 * standalone edge group never saved its CAD visibility: setStudioShowEdges(false)
 * hid it, and leaveStudioMode() returned early, leaving the edges hidden back in
 * CAD mode. Standalone vertices were never hidden in Studio at all.
 */
import { describe, test, expect, afterEach } from "vitest";
import { setupViewer, cleanup } from "../helpers/setup.js";
import { loadExample } from "../helpers/snapshot.js";

let testContext;
afterEach(() => {
  if (testContext) {
    cleanup(testContext);
    testContext = null;
  }
});

async function renderExample(name) {
  testContext = setupViewer();
  const { viewer, renderOptions, viewerOptions } = testContext;
  viewer.render(await loadExample(name), renderOptions, viewerOptions);
  return viewer.nestedGroup;
}

function standaloneGroups(nestedGroup) {
  return Object.values(nestedGroup.groups).filter(
    (g) => g.front == null && (g.edgeMaterial != null || g.vertices != null),
  );
}

describe("Studio mode - standalone edges and vertices", () => {
  test("standalone edges are hidden in studio and restored on leave", async () => {
    const nestedGroup = await renderExample("single-edges");
    const groups = standaloneGroups(nestedGroup).filter((g) => g.edgeMaterial);
    expect(groups.length).toBeGreaterThan(0);
    for (const g of groups) expect(g.edgeMaterial.visible).toBe(true);

    await nestedGroup.enterStudioMode("parametric");
    nestedGroup.setStudioShowEdges(false);
    for (const g of groups) {
      expect(g.isStudioMode).toBe(true);
      expect(g.edgeMaterial.visible).toBe(false);
    }

    nestedGroup.leaveStudioMode();
    for (const g of groups) {
      expect(g.isStudioMode).toBe(false);
      expect(g.edgeMaterial.visible).toBe(true);
    }
  });

  test("standalone vertices are hidden in studio and restored on leave", async () => {
    const nestedGroup = await renderExample("single-vertices");
    const groups = standaloneGroups(nestedGroup).filter((g) => g.vertices);
    expect(groups.length).toBeGreaterThan(0);
    for (const g of groups) expect(g.vertices.material.visible).toBe(true);

    await nestedGroup.enterStudioMode("parametric");
    nestedGroup.setStudioShowEdges(false);
    for (const g of groups) {
      expect(g.isStudioMode).toBe(true);
      expect(g.vertices.material.visible).toBe(false);
    }

    nestedGroup.leaveStudioMode();
    for (const g of groups) {
      expect(g.isStudioMode).toBe(false);
      expect(g.vertices.material.visible).toBe(true);
    }
  });

  test("edges hidden in CAD before studio stay hidden after leaving", async () => {
    const nestedGroup = await renderExample("single-edges");
    const groups = standaloneGroups(nestedGroup).filter((g) => g.edgeMaterial);
    for (const g of groups) g.setEdgesVisible(false);

    await nestedGroup.enterStudioMode("parametric");
    nestedGroup.setStudioShowEdges(false);
    nestedGroup.leaveStudioMode();
    for (const g of groups) expect(g.edgeMaterial.visible).toBe(false);
  });
});
