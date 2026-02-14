import { type LucideIcon, createLucideIcon } from "lucide-react";
import * as lucideIcons from "lucide-react";
import * as labIcons from "@lucide/lab";

/**
 * Convert kebab-case icon name to PascalCase (lucide-react export format).
 * e.g. "person-standing" -> "PersonStanding"
 */
function toPascalCase(name: string): string {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

/**
 * Convert kebab-case icon name to camelCase (@lucide/lab export format).
 * e.g. "flower-lotus" -> "flowerLotus"
 */
function toCamelCase(name: string): string {
  const parts = name.split("-");
  return (
    parts[0] +
    parts
      .slice(1)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("")
  );
}

// Cache resolved icons to avoid repeated lookups
const iconCache = new Map<string, LucideIcon | null>();

/**
 * Resolve a kebab-case icon name to a React component.
 * Checks lucide-react first, then falls back to @lucide/lab.
 * Returns null if icon not found.
 */
export function getIconComponent(iconName: string): LucideIcon | null {
  if (!iconName) return null;

  const cached = iconCache.get(iconName);
  if (cached !== undefined) return cached;

  // Try lucide-react (PascalCase lookup)
  const pascalName = toPascalCase(iconName);
  const icons = lucideIcons as unknown as Record<string, unknown>;
  const lucideIcon = icons[pascalName];
  // lucide-react icons are React.forwardRef objects, not functions
  if (
    lucideIcon &&
    typeof lucideIcon === "object" &&
    "$$typeof" in lucideIcon
  ) {
    iconCache.set(iconName, lucideIcon as LucideIcon);
    return lucideIcon as LucideIcon;
  }

  // Try @lucide/lab (camelCase lookup, returns iconNode data)
  const camelName = toCamelCase(iconName);
  const lab = labIcons as unknown as Record<string, unknown>;
  const labIconNode = lab[camelName];
  if (labIconNode && Array.isArray(labIconNode)) {
    const component = createLucideIcon(pascalName, labIconNode as Parameters<typeof createLucideIcon>[1]);
    iconCache.set(iconName, component);
    return component;
  }

  iconCache.set(iconName, null);
  return null;
}
