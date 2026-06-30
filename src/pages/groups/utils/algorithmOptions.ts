export const algorithmOptions = [
  { label: 'Random custom alphabet', value: 'RANDOM' },
  { label: 'Random numbers', value: 'RANDOM_NUM' },
  { label: 'Random hexadecimal', value: 'RANDOM_HEX' },
  { label: 'Random letters', value: 'RANDOM_LET' },
  { label: 'Random letters and numbers', value: 'RANDOM_SYM' },
  { label: 'Random letters and numbers without B/I/O/S', value: 'RANDOM_SYM_BIOS' },
  { label: 'Consecutive numbers', value: 'CONSECUTIVE' },
  { label: 'MD5', value: 'MD5' },
  { label: 'SHA-1', value: 'SHA1' },
  { label: 'SHA-2', value: 'SHA2' },
  { label: 'SHA-3', value: 'SHA3' },
  { label: 'BLAKE3', value: 'BLAKE3' },
  { label: 'xxHash', value: 'XXHASH' }
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
    case 'RANDOM':
    default:
      return 'LETTERS_AND_NUMBERS_ALPHABET'
  }
}
