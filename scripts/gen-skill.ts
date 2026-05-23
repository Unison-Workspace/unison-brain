// Embeds skill/SKILL.md into the CLI as a string so `unison skill install` can
// write it out. Runs as part of the CLI build; the output is committed so the
// dev path works without a prebuild too.
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const md = readFileSync(new URL("skill/SKILL.md", root), "utf8");
const out = `// AUTO-GENERATED from skill/SKILL.md by scripts/gen-skill.ts — do not edit.\nexport const SKILL_MD = ${JSON.stringify(md)};\n`;
writeFileSync(new URL("packages/cli/src/skill-content.ts", root), out);
console.log("wrote packages/cli/src/skill-content.ts");
