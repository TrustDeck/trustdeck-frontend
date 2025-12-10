import { Link } from "./Link"

export interface BioSampleEntity {
  id?: string
  type?: 'bioprobe'
  location: string
  date: string | Date | null
  contents: string
  links?: Link[]
  identifiers: {
    MOI?: string,
    sampleNumber: string
  }
}