export interface PersonConfig {
  mandatoryFields: string[];
  dataFromLeadingSystem: boolean;
  confirmationEmailOnRegistration: boolean;
}

export interface PseudonymConfig {
  prefix: string;
  psnLength: number;
  algorithm: string;
  alphabet: string;
  description: string;
  maxNumPseudonyms: number;
  multiplePseudonymsPerValue: boolean;
  checkDigit: boolean;
}

export interface ProjectType {
  storeEntities?: boolean;
  storePseudonyms?: boolean;
  name: string;
  description?: string;
  abbreviation: string;
  startDate: string; // ISO 8601 datetime string
  endDate: string;   // ISO 8601 datetime string
  entityTypes?: string[];
  statistics?: {
    firstPseudonymCreatedAt: string;
    lastPseudonymCreatedAt: string;
    totalSubGroups: number;
  };
  createdOn?: string;
  updatedOn?: string;
  referencedDomains?: {
    name: string;
    prefix: string;
    description: string;
  }[];
}
