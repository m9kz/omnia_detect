// src/utils/classColors.ts
/**
 * Shared class -> color registry with a fixed palette.
 * Keeps mappings stable across components and screens.
 */

const PALETTE = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF', '#C0C0C0',
  '#800000', '#008000', '#000080', '#808000', '#008080', '#800080', '#808080',
  '#FF8080', '#80FF80', '#8080FF', '#FFFF80', '#80FFFF', '#FF80FF'
] as const

// Internal registry. Shared singleton per JS runtime.
const CLASS_COLORS: Record<string, string> = {}

/**
 * Optional: hash a string to a 32-bit int — useful for deterministic color selection
 * across sessions without relying on insertion order. Not used by default.
 */
// function hash32(str: string): number {
//   let h = 0
//   for (let i = 0; i < str.length; i++) {
//     h = (h << 5) - h + str.charCodeAt(i)
//     h |= 0
//   }
//   return h >>> 0 // unsigned
// }

/**
 * Get a color for a class. If the class has never been seen, assign next palette color.
 * This keeps colors consistent within a runtime (and across components) by sharing the registry.
 *
 * If you want deterministic colors across sessions, uncomment the hash-based line below.
 */
export function getClassColor(className: string): string {
  if (!CLASS_COLORS[className]) {
    // --- Option A: insertion-order cycling (default) ---
    const nextIndex = Object.keys(CLASS_COLORS).length % PALETTE.length
    CLASS_COLORS[className] = PALETTE[nextIndex]

    // --- Option B: deterministic by hash (uncomment to use globally) ---
    // const idx = hash32(className) % PALETTE.length
    // CLASS_COLORS[className] = PALETTE[idx]
  }
  return CLASS_COLORS[className]
}

/** Manually set/override a color for a class (e.g., reflect server config) */
export function setClassColor(className: string, color: string): void {
  CLASS_COLORS[className] = color
}

/** Read-only snapshot of the current mapping (useful for legends/debug) */
export function getRegistry(): Readonly<Record<string, string>> {
  return { ...CLASS_COLORS }
}

/** Access the palette (e.g., to render a legend or validate inputs) */
export function getPalette(): readonly string[] {
  return PALETTE
}

/** Clear the registry (e.g., when switching datasets/projects) */
export function resetClassColorRegistry(): void {
  for (const k of Object.keys(CLASS_COLORS)) delete CLASS_COLORS[k]
}
