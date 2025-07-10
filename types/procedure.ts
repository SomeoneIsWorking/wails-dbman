export type ProcedureState = 'failed' | 'loading' | 'waiting' | 'loaded' | 'partial' | 'uncached'

export interface ProcedureResponse {
  state: ProcedureState
  error?: string
  definition: string | null
  definitionReadError?: string
  parameters: Array<{
    name: string
    type: string
    mode: 'IN' | 'OUT' | 'INOUT'
    defaultValue?: string
  }>
  parametersReadError?: string
  resultSets: Array<{
    columns: Array<{
      name: string
      type: string
      nullable: boolean
      defaultValue?: string
    }>
  }>
  resultSetsReadError?: string
  lastCached: Date | null
} 
