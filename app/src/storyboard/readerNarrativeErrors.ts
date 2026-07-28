export interface ReaderNarrativeIssueLike {
  code: string
  message: string
}

export class ReaderNarrativeGenerationError extends Error {
  readonly kind = 'generation' as const

  constructor(message: string) {
    super(message)
    this.name = 'ReaderNarrativeGenerationError'
  }
}

export class ReaderNarrativeValidationError extends Error {
  readonly kind = 'validation' as const

  constructor(
    message: string,
    readonly issues: readonly ReaderNarrativeIssueLike[],
  ) {
    super(message)
    this.name = 'ReaderNarrativeValidationError'
  }
}

export function isDefinedReaderNarrativeError(
  error: unknown,
): error is ReaderNarrativeGenerationError | ReaderNarrativeValidationError {
  return error instanceof ReaderNarrativeGenerationError
    || error instanceof ReaderNarrativeValidationError
}
