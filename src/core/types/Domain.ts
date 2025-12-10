export type Domain = {
  id: number;
  name: string;
  prefix: string;
  validFrom: string;
  validFromInherited: boolean;
  validTo: string;
  validityTime?: string; // Only needed for creation
  validToInherited: boolean;
  enforceStartDateValidity: boolean;
  enforceStartDateValidityInherited: boolean;
  enforceEndDateValidity: boolean;
  enforceEndDateValidityInherited: boolean;
  algorithm: string; // Default: "RANDOM_LET"
  algorithmInherited: boolean;
  alphabet: string;
  alphabetInherited: boolean;
  randomAlgorithmDesiredSize: number; // int64
  randomAlgorithmDesiredSizeInherited: boolean;
  randomAlgorithmDesiredSuccessProbability: number; // double
  randomAlgorithmDesiredSuccessProbabilityInherited: boolean;
  multiplePsnAllowed: boolean;
  multiplePsnAllowedInherited: boolean;
  consecutiveValueCounter: number; // int64
  pseudonymLength: number;
  pseudonymLengthInherited: boolean;
  paddingCharacter: string; // Default: "0"
  paddingCharacterInherited: boolean;
  addCheckDigit: boolean;
  addCheckDigitInherited: boolean;
  lengthIncludesCheckDigit: boolean;
  lengthIncludesCheckDigitInherited: boolean;
  salt: string;
  saltLength: number; // Default: 32
  description: string;
  superDomainID: number;
  superDomainName: string;
};
