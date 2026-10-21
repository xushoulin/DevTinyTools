import { describe, expect, it } from "vitest";
import {
  ADSENSE_CLIENT,
  ADSENSE_PUBLISHER_ID,
  ADSENSE_SCRIPT_ENABLED,
  adsTxtBody,
} from "./ads";

describe("ads.txt", () => {
  it("uses Google's canonical records form", () => {
    expect(adsTxtBody()).toBe(
      `google.com, ${ADSENSE_PUBLISHER_ID}, DIRECT, f08c47fec0942fa0\n`,
    );
  });

  it("has a publisher id in the shape AdSense issues", () => {
    expect(ADSENSE_PUBLISHER_ID).toMatch(/^pub-\d{16}$/);
  });

  it("derives the loader client id from the publisher id", () => {
    expect(ADSENSE_CLIENT).toBe(`ca-${ADSENSE_PUBLISHER_ID}`);
    expect(ADSENSE_SCRIPT_ENABLED).toBe(true);
  });

  it("returns a single line that ends with a newline", () => {
    const body = adsTxtBody() ?? "";
    expect(body.split("\n").filter(Boolean)).toHaveLength(1);
    expect(body.endsWith("\n")).toBe(true);
  });
});
