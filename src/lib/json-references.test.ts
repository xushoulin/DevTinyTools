import { describe, expect, it } from "vitest";
import {
  CROSS_ENGINE_CASES,
  CROSS_ENGINE_VERSIONS,
  ENCODING_CASES,
  ENCODING_SIZE,
  ENGINE_MESSAGES,
  ESCAPE_CASES,
  ESCAPE_VERSIONS,
  TRUNCATION_CASES,
} from "./json-references";

/**
 * The cross-engine table is quoted verbatim on a guide page, so the same two
 * mistakes that matter in prose matter here: a row with no message at all, and
 * a message that was quietly cleaned up and is no longer what the engine said.
 */
describe("cross-engine messages", () => {
  it("covers the failures readers actually search for", () => {
    expect(CROSS_ENGINE_CASES.length).toBeGreaterThanOrEqual(5);

    const scenarios = CROSS_ENGINE_CASES.map((row) => row.scenario);
    expect(new Set(scenarios).size).toBe(scenarios.length);

    for (const row of CROSS_ENGINE_CASES) {
      expect(row.scenario.trim()).toBeTruthy();
      expect(row.input.length).toBeLessThan(40);
    }
  });

  it("reports something for every engine in every row", () => {
    for (const row of CROSS_ENGINE_CASES) {
      const reported = [row.node, row.python, row.mysql].filter(
        (value) => value !== null,
      );
      expect(reported.length).toBeGreaterThanOrEqual(1);
      for (const message of reported) {
        expect(message.length).toBeGreaterThan(3);
        expect(message).toBe(message.trim());
      }
    }
  });

  it("keeps the engine's own prefix out of the captured message", () => {
    // "SyntaxError:" / "JSONDecodeError:" belong to the wrapper, not the message,
    // and quoting them would make the table disagree with what a reader sees.
    for (const row of CROSS_ENGINE_CASES) {
      for (const message of [row.node, row.python, row.mysql]) {
        if (message) expect(message).not.toMatch(/^(SyntaxError|JSONDecodeError|Error):/);
      }
    }
  });

  it("documents at least one input that an engine accepts", () => {
    const accepted = CROSS_ENGINE_CASES.filter((row) =>
      [row.node, row.python, row.mysql].includes(null),
    );
    expect(accepted.length).toBeGreaterThanOrEqual(1);
  });

  it("names the exact build each column was measured on", () => {
    for (const value of Object.values(CROSS_ENGINE_VERSIONS)) {
      expect(value).toMatch(/\d+\.\d+/);
    }
  });
});

/**
 * `ENGINE_MESSAGES` claims every string in it is verbatim. This re-runs each
 * input through the engine the test process is using and compares the message
 * character for character, so a hand-edited or paraphrased row fails here
 * instead of shipping to a page that promises the wording is exact.
 *
 * If this test fails after a runtime upgrade, the runtime changed its wording —
 * update the rows and the Node version named on the page, not the assertion.
 */
describe("engine messages are verbatim", () => {
  it("reproduces each quoted message exactly", () => {
    for (const row of ENGINE_MESSAGES) {
      let actual: string | null = null;
      try {
        JSON.parse(row.input);
      } catch (error) {
        actual = (error as Error).message;
      }

      expect(actual, `input ${JSON.stringify(row.input)} was accepted`).not.toBeNull();
      expect(actual).toBe(row.message);
    }
  });

  it("does not reuse an input or a message", () => {
    const inputs = ENGINE_MESSAGES.map((row) => row.input);
    expect(new Set(inputs).size).toBe(inputs.length);

    const messages = ENGINE_MESSAGES.map((row) => row.message);
    expect(new Set(messages).size).toBe(messages.length);
  });

  it("explains every row", () => {
    for (const row of ENGINE_MESSAGES) {
      expect(row.note.length).toBeGreaterThan(20);
    }
  });
});

/**
 * The truncation table makes a claim that is easy to get wrong by hand: that
 * four of these six equally-truncated inputs do *not* produce "Unexpected end
 * of JSON input". Re-running the column is the only way to keep that true.
 */
describe("truncation cases are verbatim on V8", () => {
  it("reproduces the Node column exactly", () => {
    for (const row of TRUNCATION_CASES) {
      let actual: string | null = null;
      try {
        JSON.parse(row.input);
      } catch (error) {
        actual = (error as Error).message;
      }
      expect(actual, `input ${JSON.stringify(row.input)} was accepted`).not.toBeNull();
      expect(actual).toBe(row.node);
    }
  });

  it("only uses the headline message where V8 really produces it", () => {
    const withEndOfInput = TRUNCATION_CASES.filter(
      (row) => row.node === "Unexpected end of JSON input",
    );
    expect(withEndOfInput.length).toBeLessThan(TRUNCATION_CASES.length);
    expect(withEndOfInput.length).toBeGreaterThan(0);
  });

  it("names every engine that contributed a column", () => {
    for (const row of TRUNCATION_CASES) {
      expect(row.scenario.length).toBeGreaterThan(8);
      expect(Object.values(CROSS_ENGINE_VERSIONS).length).toBe(3);
    }
  });
});

describe("escape cases", () => {
  it("reproduces the V8 column exactly", () => {
    for (const row of ESCAPE_CASES) {
      const literal = `"${row.sequence}"`;

      if (row.node === "Accepted, keeps the lone surrogate") {
        const value = JSON.parse(literal) as string;
        expect(value.length).toBe(1);
        expect(value.charCodeAt(0)).toBe(0xd800);
        continue;
      }

      if (row.node.startsWith("Accepted, produces ")) {
        const value = JSON.parse(literal) as string;
        expect(row.node).toBe(`Accepted, produces ${value}`);
        continue;
      }

      expect(() => JSON.parse(literal)).toThrow(row.node);
    }
  });

  it("explains why each sequence was attempted", () => {
    for (const row of ESCAPE_CASES) {
      expect(row.intent.length).toBeGreaterThan(20);
      expect(row.python.length).toBeGreaterThan(0);
      expect(row.ruby.length).toBeGreaterThan(0);
    }
  });

  it("names the three runtimes the table was measured on", () => {
    expect(Object.values(ESCAPE_VERSIONS)).toHaveLength(3);
    expect(ESCAPE_VERSIONS.ruby).toMatch(/2\.6/);
  });

  it("quotes the Node serialization default", () => {
    for (const row of ENCODING_CASES) {
      const inner = JSON.stringify(row.character).slice(1, -1);
      expect(row.node, `${row.label} differs from JSON.stringify`).toBe(inner);
    }
  });

  it("keeps the byte figures consistent with the sample", () => {
    expect(ENCODING_SIZE.escapedBytes).toBe(ENCODING_SIZE.escapedChars);
    // Both counts include the two double quotes json.dumps wraps around a string.
    expect(ENCODING_SIZE.rawChars).toBe([...ENCODING_SIZE.sample].length + 2);
    expect(ENCODING_SIZE.rawBytes).toBeGreaterThan(ENCODING_SIZE.rawChars);
    expect(ENCODING_SIZE.escapedBytes).toBeGreaterThan(ENCODING_SIZE.rawBytes);
  });
});
