import { describe, expect, test } from "bun:test";
import { resolveMember } from "./chat";

const members = [
  { id: "u1", name: "Raf Mevis" },
  { id: "u2", name: "Daniel Kim" },
  { id: "u3", name: "rafaela ortiz" },
];

describe("resolveMember", () => {
  test("returns the unique case-insensitive match", () => {
    expect(resolveMember(members, "mevis")?.id).toBe("u1");
    expect(resolveMember(members, "DANIEL")?.id).toBe("u2");
  });

  test("trims surrounding whitespace before matching", () => {
    expect(resolveMember(members, "  kim  ")?.id).toBe("u2");
  });

  test("returns null when the query is ambiguous", () => {
    // "raf" matches both "Raf Mevis" and "rafaela ortiz"
    expect(resolveMember(members, "raf")).toBeNull();
  });

  test("returns null when nothing matches", () => {
    expect(resolveMember(members, "zzz")).toBeNull();
  });
});
