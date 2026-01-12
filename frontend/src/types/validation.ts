export interface ValidationError {
  message: string
  severity: 'error' | 'warning'
  line?: number
  column?: number
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings?: string[]
}