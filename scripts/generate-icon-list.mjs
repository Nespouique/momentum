/**
 * Extracts valid Lucide icon names from installed npm packages (lucide-react + @lucide/lab)
 * and writes them as a TypeScript Set to apps/api/src/data/valid-icons.ts.
 *
 * Run: node scripts/generate-icon-list.mjs
 * Hooked into: prebuild / postinstall
 */
import { createRequire } from "module";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRequire = createRequire(resolve(__dirname, "../apps/web/package.json"));

const lucideIcons = webRequire("lucide-react");
const labIcons = webRequire("@lucide/lab");

const lucideNames = Object.entries(lucideIcons)
  .filter(([key, val]) => {
    if (key === "default" || key === "createLucideIcon" || key === "icons") return false;
    return val && typeof val === "object" && "$$typeof" in val;
  })
  .map(([key]) => key.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase())
  .filter((name) => !name.endsWith("-icon") && !name.startsWith("lucide-"));

const labNames = Object.entries(labIcons)
  .filter(([, val]) => Array.isArray(val))
  .map(([key]) => key.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase());

const allNames = [...new Set([...lucideNames, ...labNames])].sort();

const output = `// Auto-generated from installed lucide-react + @lucide/lab packages
// Run: node scripts/generate-icon-list.mjs
// lucide-react: ${lucideNames.length}, @lucide/lab: ${labNames.length}, total: ${allNames.length}
export const VALID_ICON_NAMES = new Set([
${allNames.map((n) => `  "${n}",`).join("\n")}
]);
`;

const outPath = resolve(__dirname, "../apps/api/src/data/valid-icons.ts");
writeFileSync(outPath, output);
console.log(`Generated ${allNames.length} icon names -> ${outPath}`);
