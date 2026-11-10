/**
 * Whether the backend calculates the pseudonym length for this algorithm. This applies to the
 * random algorithms (RANDOM, RANDOM_LET, RANDOM_SYM, ...); hash and counter algorithms use the
 * configured length as is.
 */
export function isRandomAlgorithm(algorithm: string | undefined): boolean {
  return Boolean(algorithm?.trim().toUpperCase().startsWith('RANDOM'))
}
