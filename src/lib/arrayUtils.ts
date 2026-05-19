/**
 * Safely ensures a value is an array.
 * If it's already an array, returns it.
 * If it's a plain object that looks like it was an array (from Firebase corruption), converts to array.
 * Otherwise, returns the fallback (defaulting to empty array).
 */
export function ensureArray<T>(value: any, fallback: T[] = []): T[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    // Check if it's a "corrupted" array object (keys are all numeric)
    const keys = Object.keys(value);
    if (keys.length > 0 && keys.every(k => !isNaN(Number(k)))) {
      return Object.values(value) as T[];
    }
    // If it's an empty object saved instead of an empty array
    if (keys.length === 0) return fallback;
  }
  return fallback;
}
