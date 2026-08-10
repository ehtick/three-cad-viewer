/**
 * Unit tests for decode-instances.ts — the split between buffer decoding and
 * instance resolution.
 *
 * The split exists so that a host receiving geometry as raw binary rather than
 * base64 can resolve instance refs without reimplementing the walk. Those hosts
 * call `resolveInstances` alone; `decodeInstancedFormat` remains the
 * composition of both halves for everyone else.
 */
import { describe, test, expect } from "vitest";
import {
  isInstancedFormat,
  decodeBuffers,
  resolveInstances,
  decodeInstancedFormat,
} from "../../src/utils/decode-instances.js";

/** Encode a TypedArray the way the wire format does. */
function b64(arr, dtype) {
  return {
    shape: [arr.length],
    dtype,
    buffer: Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).toString(
      "base64",
    ),
    codec: "b64",
  };
}

/** A single instance with all nine required buffer fields. */
function instance(seed = 1) {
  const f = (n) => new Float32Array(Array.from({ length: n }, (_, i) => i + seed));
  const u = (n) => new Uint32Array(Array.from({ length: n }, (_, i) => i + seed));
  return {
    vertices: b64(f(3), "float32"),
    triangles: b64(u(3), "uint32"),
    normals: b64(f(3), "float32"),
    edges: b64(f(2), "float32"),
    obj_vertices: b64(f(3), "float32"),
    face_types: b64(u(1), "uint32"),
    edge_types: b64(u(1), "uint32"),
    triangles_per_face: b64(u(1), "uint32"),
    segments_per_edge: b64(u(1), "uint32"),
  };
}

/** Instanced payload: two parts referencing one instance, plus a nested part. */
function payload() {
  return {
    instances: [instance(1), instance(10)],
    shapes: {
      version: 3,
      name: "root",
      id: "/root",
      parts: [
        { name: "a", id: "/root/a", shape: { ref: 0 } },
        { name: "b", id: "/root/b", shape: { ref: 0 } },
        {
          name: "group",
          id: "/root/group",
          parts: [{ name: "c", id: "/root/group/c", shape: { ref: 1 } }],
        },
      ],
    },
  };
}

describe("isInstancedFormat", () => {
  test("detects the instanced payload", () => {
    expect(isInstancedFormat(payload())).toBe(true);
  });

  test("rejects a plain shapes tree", () => {
    expect(isInstancedFormat(payload().shapes)).toBe(false);
  });
});

describe("decodeBuffers", () => {
  test("returns one Shape per instance, with TypedArrays", () => {
    const decoded = decodeBuffers(payload().instances);
    expect(decoded).toHaveLength(2);
    expect(decoded[0].vertices).toBeInstanceOf(Float32Array);
    expect(decoded[0].triangles).toBeInstanceOf(Uint32Array);
    expect(Array.from(decoded[0].vertices)).toEqual([1, 2, 3]);
    expect(Array.from(decoded[1].vertices)).toEqual([10, 11, 12]);
  });

  test("does not touch the shapes tree", () => {
    const data = payload();
    decodeBuffers(data.instances);
    expect(data.shapes.parts[0].shape).toEqual({ ref: 0 });
  });
});

describe("resolveInstances", () => {
  test("resolves refs against arrays the caller already holds", () => {
    // The build123d Studio case: buffers arrived as raw binary, never base64.
    const own = [
      { vertices: new Float32Array([7, 8, 9]) },
      { vertices: new Float32Array([70, 80, 90]) },
    ];
    const shapes = resolveInstances(payload().shapes, own);
    expect(shapes.parts[0].shape).toBe(own[0]);
    expect(shapes.parts[1].shape).toBe(own[0]);
    expect(shapes.parts[2].parts[0].shape).toBe(own[1]);
  });

  test("shares one decoded instance between every reference to it", () => {
    const shapes = resolveInstances(payload().shapes, [{ v: 1 }, { v: 2 }]);
    expect(shapes.parts[0].shape).toBe(shapes.parts[1].shape);
  });

  test("throws on an out-of-bounds ref rather than producing a hole", () => {
    expect(() => resolveInstances(payload().shapes, [{ v: 1 }])).toThrow(
      /out of bounds/,
    );
  });

  test("returns the same tree object it was given", () => {
    const shapes = payload().shapes;
    expect(resolveInstances(shapes, [{ v: 1 }, { v: 2 }])).toBe(shapes);
  });
});

describe("decodeInstancedFormat", () => {
  test("is the composition of the two halves", () => {
    const viaWhole = decodeInstancedFormat(payload());
    const data = payload();
    const viaParts = resolveInstances(data.shapes, decodeBuffers(data.instances));
    expect(Array.from(viaWhole.parts[0].shape.vertices)).toEqual(
      Array.from(viaParts.parts[0].shape.vertices),
    );
    expect(Array.from(viaWhole.parts[2].parts[0].shape.vertices)).toEqual([
      10, 11, 12,
    ]);
  });

  test("still decodes nested parts, unchanged for existing callers", () => {
    const shapes = decodeInstancedFormat(payload());
    expect(shapes.parts[0].shape.vertices).toBeInstanceOf(Float32Array);
    expect(shapes.parts[2].parts[0].shape.triangles).toBeInstanceOf(Uint32Array);
  });
});
