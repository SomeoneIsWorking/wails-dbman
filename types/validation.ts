export interface ValidationError {
  message: string
  line?: number
  column?: number
  severity: 'error' | 'warning'
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings?: string[]
} 