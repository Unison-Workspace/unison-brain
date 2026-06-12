// Embeds skill/SKILL.md + skill/reference.md into the CLI as strings so
// `unison skill install` can write them out. Runs as part of the CLI build; the
// output is committed so the dev path works without a prebuild too.
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const skill = readFileSync(new URL("skill/SKILL.md", root), "utf8");
const reference = readFileSync(new URL("skill/reference.md", root), "utf8");
const out = `// AUTO-GENERATED from skill/ by scripts/gen-skill.ts — do not edit.
export const SKILL_MD = ${JSON.stringify(skill)};
export const REFERENCE_MD = ${JSON.stringify(reference)};
`;
writeFileSync(new URL("packages/cli/src/skill-content.ts", root), out);
console.log("wrote packages/cli/src/skill-content.ts");
