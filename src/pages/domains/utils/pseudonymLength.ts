/**
 * Whether the backend calculates the pseudonym length for this algorithm. This applies to the
 * random algorithms (RANDOM, RANDOM_LET, RANDOM_SYM, ...); hash and counter algorithms use the
 * configured length as is.
 */
export function isRandomAlgorithm(algorithm: string | undefined): boolean {
  return Boolean(algorithm?.trim().toUpperCase().startsWith('RANDOM'))
}

/** Default number of generation attempts of the backend (app.defaults.algorithm.number-of-retries). */
export const DEFAULT_NUMBER_OF_RETRIES = 3

type MinimumLengthParameters = {
  /** Desired number of pseudonyms in the domain. */
  desiredSize: number | null
  /** Desired probability that generating a pseudonym succeeds within the retries. */
  successProbability: number | null
  /** Number of symbols the pseudonyms are generated from. */
  alphabetSize: number
  /** Whether the check digit replaces the last generated character. */
  checkDigitReplacesLastCharacter: boolean
  /** Number of generation attempts. */
  retries?: number
}

/**
 * Estimates the shortest pseudonym length the backend will calculate for a random algorithm,
 * using the same formula: k = n / (1 - T)^(1/m) possible pseudonyms are needed, so the length is
 * ceil(log(k) / log(alphabet size)), plus one character when the check digit replaces the last
 * one. Returns null when the parameters do not allow a calculation.
 *
 * The backend's number of retries is configurable; this estimate assumes the default.
 */
export function estimateMinimumPseudonymLength({
  desiredSize,
  successProbability,
  alphabetSize,
  checkDigitReplacesLastCharacter,
  retries = DEFAULT_NUMBER_OF_RETRIES
}: MinimumLengthParameters): number | null {
  if (
    desiredSize === null ||
    successProbability === null ||
    !(desiredSize >= 1) ||
    !(successProbability > 0 && successProbability < 1) ||
    alphabetSize < 2 ||
    retries < 1
  ) {
    return null
  }

  // ln(k) = ln(n) - ln(1 - T) / m, with log1p for success probabilities close to 1
  const lnK = Math.log(desiredSize) - Math.log1p(-successProbability) / retries
  const lnA = Math.log(alphabetSize)
  let length = Math.max(1, Math.ceil(lnK / lnA))

  // Correct floating-point rounding at exact powers of the alphabet size
  const tolerance = 1e-12
  while (length > 1 && (length - 1) * lnA >= lnK - tolerance) length--
  while (length * lnA < lnK - tolerance) length++

  return checkDigitReplacesLastCharacter ? length + 1 : length
}
