export interface SafetySentence {
  sentenceId: number
  content: string
  category: 'INSULT'
  severity: number
  enabled: boolean
  revision: number
  indexStatus: 'PENDING' | 'INDEXING' | 'INDEXED' | 'FAILED'
  applied: boolean
  indexedRevision: number | null
  vectorId: number | null
  indexError: string | null
  model: string
  profile: string
  createdAt: string
  updatedAt: string
}

export interface SafetySentencesPage {
  items: SafetySentence[]
  page: number
  hasNext: boolean
}

export interface SafetySentenceInput {
  content: string
  severity: number
}
export interface SafetySentenceUpdate extends SafetySentenceInput {
  revision: number
  enabled: boolean
}
