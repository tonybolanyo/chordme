/**
 * ID generation utilities for ChordMe
 */

/**
 * Generate a unique ID using timestamp and random suffix
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${timestamp}_${randomSuffix}`;
}

/**
 * Generate a chord diagram ID
 */
export function generateChordDiagramId(name: string, instrument: string): string {
  const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const timestamp = Date.now().toString(36);
  return `${instrument}_${sanitizedName}_${timestamp}`;
}

/**
 * Generate a tuning ID
 */
export function generateTuningId(name: string, instrument: string): string {
  const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  return `${instrument}_tuning_${sanitizedName}`;
}