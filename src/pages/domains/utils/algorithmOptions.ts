export const algorithmOptions = [
  { labelKey: 'algorithms.randomCustomAlphabet', value: 'RANDOM' },
  { labelKey: 'algorithms.randomNumbers', value: 'RANDOM_NUM' },
  { labelKey: 'algorithms.randomHexadecimal', value: 'RANDOM_HEX' },
  { labelKey: 'algorithms.randomLetters', value: 'RANDOM_LET' },
  { labelKey: 'algorithms.randomLettersAndNumbers', value: 'RANDOM_SYM' },
  {
    labelKey: 'algorithms.randomLettersAndNumbersWithoutBios',
    value: 'RANDOM_SYM_BIOS'
  },
  { labelKey: 'algorithms.consecutiveNumbers', value: 'CONSECUTIVE' },
  { labelKey: 'algorithms.md5', value: 'MD5' },
  { labelKey: 'algorithms.sha1', value: 'SHA1' },
  { labelKey: 'algorithms.sha2', value: 'SHA2' },
  { labelKey: 'algorithms.sha3', value: 'SHA3' },
  { labelKey: 'algorithms.blake3', value: 'BLAKE3' },
  { labelKey: 'algorithms.xxHash', value: 'XXHASH' }
]

export function defaultAlphabetForAlgorithm(algorithm: string): string {
  switch (algorithm.trim().toUpperCase()) {
    case 'MD5':
    case 'SHA1':
    case 'SHA2':
    case 'SHA3':
    case 'BLAKE3':
    case 'XXHASH':
    case 'RANDOM_HEX':
      return 'HEXADECIMAL_ALPHABET'
    case 'CONSECUTIVE':
    case 'RANDOM_NUM':
      return 'NUMBERS_ONLY_ALPHABET'
    case 'RANDOM_LET':
      return 'LETTERS_ONLY_ALPHABET'
    case 'RANDOM_SYM_BIOS':
      return 'LETTERS_AND_NUMBERS_WITHOUT_BIOS_ALPHABET'
    case 'RANDOM_SYM':
      return 'LETTERS_AND_NUMBERS_ALPHABET'
    case 'RANDOM':
      return 'CUSTOM_ALPHABET'
    default:
      return 'LETTERS_AND_NUMBERS_ALPHABET'
  }
}
