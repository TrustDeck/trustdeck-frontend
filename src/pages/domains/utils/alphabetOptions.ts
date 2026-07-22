import { AlphabetOptionType } from '../types/AlphabetOptionType'



export const characters: Record<string, string> = {  
  HEXADECIMAL_ALPHABET: 'ABCDEF0123456789',
  NUMBERS_ONLY_ALPHABET: '0123456789',
  LETTERS_ONLY_ALPHABET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  LETTERS_AND_NUMBERS_ALPHABET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  LETTERS_AND_NUMBERS_WITHOUT_BIOS_ALPHABET: 'ACDEFGHJKLMNPQRTUVWXYZ0123456789'
}


export const CUSTOM_ALPHABET_VALUE = 'CUSTOM_ALPHABET'

export const alphabetOptions: AlphabetOptionType[] = [
  { label: 'Hexadecimal (A-F, 0-9)', value: 'HEXADECIMAL_ALPHABET' },
  { label: 'Numbers only (0-9)', value: 'NUMBERS_ONLY_ALPHABET' },
  { label: 'Letters only (A-Z)', value: 'LETTERS_ONLY_ALPHABET' },
  { label: 'Letters and numbers (A-Z, 0-9)', value: 'LETTERS_AND_NUMBERS_ALPHABET' },
  { label: 'Letters and numbers without B/I/O/S (A-Z without B,I,O,S, 0-9)', value: 'LETTERS_AND_NUMBERS_WITHOUT_BIOS_ALPHABET' },
  { label: 'Custom', value: CUSTOM_ALPHABET_VALUE }
]

export type AlphabetKey =
  | 'HEXADECIMAL_ALPHABET'
  | 'NUMBERS_ONLY_ALPHABET'
  | 'LETTERS_ONLY_ALPHABET'
  | 'LETTERS_AND_NUMBERS_ALPHABET'
  | 'LETTERS_AND_NUMBERS_WITHOUT_BIOS_ALPHABET'
  | 'CUSTOM_ALPHABET'

// Returns the preset key for the given character string, or null if no preset matches (e.g. custom alphabet).
export function getAlphabetKeyByCharacters(value: string): AlphabetKey | null {
  if (!value) return null
  for (const key in characters) {
    if (key !== CUSTOM_ALPHABET_VALUE && characters[key as AlphabetKey] === value) {
      return key as AlphabetKey
    }
  }
  return null
} 
