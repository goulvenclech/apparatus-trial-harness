import { describe, expect, it } from "vitest";
import { substituteDate } from "../src/template.js";

describe("substituteDate", () => {
  it("substitutes the {DATE} placeholder", () => {
    expect(substituteDate("Today's date is {DATE}.", "2026-07-29")).toBe(
      "Today's date is 2026-07-29.",
    );
  });

  it("substitutes every occurrence", () => {
    expect(substituteDate("{DATE} and {DATE}", "2026-07-29")).toBe("2026-07-29 and 2026-07-29");
  });

  it("leaves other braced tokens untouched", () => {
    expect(substituteDate("{DATE} {MODEL} {date}", "2026-07-29")).toBe("2026-07-29 {MODEL} {date}");
  });

  it("fails loudly when the placeholder is missing", () => {
    expect(() => substituteDate("Today's date is 2026-01-01.", "2026-07-29")).toThrow(
      /no \{DATE\} placeholder/,
    );
  });
});
