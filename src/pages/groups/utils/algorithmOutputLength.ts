/**
 * Hash algorithms produce fixed-length output (hex-encoded).
 * Returns the character length, or null for randomness-based algorithms (no padding).
 */
const HASH_OUTPUT_LENGTHS: Record<string, number> = {
  MD5: 32,
  SHA1: 40,
  SHA2: 128,
  SHA3: 128,
  BLAKE3: 64,
  xxHash: 16
}

/**
 * Returns the fixed output length for hash-based algorithms, or null for
 * randomness-based algorithms (e.g. RANDOM_LET) where padding is never used.
 * Counter-based algorithms use variable length; not represented here (no fixed length).
 */
export function getAlgorithmOutputLength(algorithm: string | undefined): number | null {
  if (!algorithm) return null
  const length = HASH_OUTPUT_LENGTHS[algorithm.toUpperCase()]
  return length !== undefined ? length : null
}

/**
 * Whether the algorithm is randomness-based (output always equals psnlength, no padding).
 */
export function isRandomnessAlgorithm(algorithm: string | undefined): boolean {
  return getAlgorithmOutputLength(algorithm) === null
}

/**
 * Whether the algorithm is hash-based (fixed-length hex output; requires hex alphabet).
 */
export function isHashAlgorithm(algorithm: string | undefined): boolean {
  return getAlgorithmOutputLength(algorithm) !== null
}
