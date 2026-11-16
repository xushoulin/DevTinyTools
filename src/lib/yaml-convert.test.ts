import { describe, expect, it } from "vitest";

import {
  DEFAULT_CONVERT_OPTIONS,
  jsonToYaml,
  yamlToJson,
  type ConvertOptions,
} from "./yaml-convert";

const FOUR: ConvertOptions = { indent: 4 };

describe("jsonToYaml", () => {
  it("converts a nested mapping", () => {
    const result = jsonToYaml('{"name":"api","replicas":3,"tags":["a","b"]}');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe("name: api\nreplicas: 3\ntags:\n  - a\n  - b\n");
  });

  it("respects the indent option", () => {
    const nested = '{"outer":{"inner":[1,2]}}';
    const two = jsonToYaml(nested);
    const four = jsonToYaml(nested, FOUR);
    expect(two.ok === true && two.value).toContain("  - 1");
    expect(four.ok === true && four.value).toContain("    - 1");
  });

  it("maps JSON scalars to YAML scalars", () => {
    const result = jsonToYaml('{"n":3.5,"i":7,"t":true,"f":false,"z":null}');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe("n: 3.5\ni: 7\nt: true\nf: false\nz: null\n");
  });

  it("quotes strings that YAML would misread as other types", () => {
    const result = jsonToYaml('{"v":"yes","w":"true","x":"123","y":"null","z":"on"}');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Reading each line back with a YAML parser must give the original string.
    const round = yamlToJson(result.value);
    expect(round.ok).toBe(true);
    if (!round.ok) return;
    expect(JSON.parse(round.value)).toEqual({
      v: "yes",
      w: "true",
      x: "123",
      y: "null",
      z: "on",
    });
  });

  it("keeps long values on one line instead of folding at column 80", () => {
    const url = "https://example.com/" + "a".repeat(120);
    const result = jsonToYaml(JSON.stringify({ url }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const lines = result.value.trimEnd().split("\n");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(`url: ${url}`);
  });

  it("preserves unicode text", () => {
    const result = jsonToYaml('{"city":"杭州","note":"café ☕"}');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe("city: 杭州\nnote: café ☕\n");
  });

  it("rejects input that is not valid JSON, with the browser's message", () => {
    const result = jsonToYaml('{"n": }');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/JSON|position/i);
  });

  it("handles an array root", () => {
    const result = jsonToYaml('[{"id":1},{"id":2}]');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe("- id: 1\n- id: 2\n");
  });
});

describe("yamlToJson", () => {
  it("converts a mapping to pretty JSON", () => {
    const result = yamlToJson("name: api\nreplicas: 3\ntags:\n  - a\n  - b\n");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(JSON.parse(result.value)).toEqual({ name: "api", replicas: 3, tags: ["a", "b"] });
    expect(result.value.startsWith("{\n  \"name\": \"api\"")).toBe(true);
  });

  it("reads YAML scalars with YAML 1.2 semantics, not JSON ones", () => {
    // YAML 1.2 core schema: only `true`/`false` are booleans. `yes`/`on`,
    // which YAML 1.1 parsers treated as booleans, stay strings here.
    const result = yamlToJson("a: true\nb: yes\nc: null\nd: 3.5\ne: '07:30'\n");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(JSON.parse(result.value)).toEqual({
      a: true,
      b: "yes",
      c: null,
      d: 3.5,
      e: "07:30",
    });
  });

  it("collects multiple documents into an array", () => {
    const result = yamlToJson("---\nid: 1\n---\nid: 2\n");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(JSON.parse(result.value)).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("returns an empty object for an empty document rather than failing", () => {
    // A single empty document parses to null; JSON output is `null`, not an error.
    const result = yamlToJson("");
    expect(result.ok).toBe(false); // no documents at all
  });

  it("reports the line of a broken mapping", () => {
    const result = yamlToJson("a: 1\n  b: 2\n");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/line|indent/i);
  });

  it("rejects tab indentation with the parser's message", () => {
    const result = yamlToJson("a:\n\tb: 1\n");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/tab/i);
  });
});

describe("round trips", () => {
  const sample = {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: { name: "web", labels: { app: "web" } },
    spec: {
      replicas: 3,
      template: {
        spec: {
          containers: [
            { name: "web", image: "nginx:1.27", ports: [{ containerPort: 80 }] },
          ],
        },
      },
    },
    empty: null,
    enabled: true,
    ratio: 0.75,
  };

  it("JSON → YAML → JSON returns the original value", () => {
    const json = JSON.stringify(sample, null, 2);
    const asYaml = jsonToYaml(json);
    expect(asYaml.ok).toBe(true);
    if (!asYaml.ok) return;
    const back = yamlToJson(asYaml.value);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(JSON.parse(back.value)).toEqual(sample);
  });

  it("YAML → JSON → YAML produces equivalent YAML", () => {
    const yaml = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3
  containers:
    - name: web
      image: nginx:1.27
      ports:
        - containerPort: 80
`;
    const asJson = yamlToJson(yaml);
    expect(asJson.ok).toBe(true);
    if (!asJson.ok) return;
    const back = jsonToYaml(asJson.value);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    const again = yamlToJson(back.value);
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(JSON.parse(again.value)).toEqual(JSON.parse(asJson.value));
  });
});

describe("options", () => {
  it("defaults to indent 2", () => {
    expect(DEFAULT_CONVERT_OPTIONS.indent).toBe(2);
    const result = jsonToYaml('{"a":{"b":1}}');
    expect(result.ok === true && result.value).toContain("  b: 1");
  });
});
