/**
 * Bump MODEL_VERSION whenever coefficients or simulation behaviour change.
 * Bump DATA_VERSION whenever the bundled creature records change materially.
 * SHARE_FORMAT_VERSION changes only when the serialized envelope is incompatible.
 */
export const APPLICATION_VERSION = '0.5.0' as const
export const MODEL_VERSION = '0.4.1' as const
export const DATA_VERSION = '0.4.1' as const
export const SHARE_FORMAT_VERSION = 4 as const

/** Frozen identity used only by the retained model 0.3 engine and v3 codec. */
export const LEGACY_MODEL_VERSION = '0.3.0' as const
export const LEGACY_DATA_VERSION = '0.3.1' as const
export const LEGACY_SHARE_FORMAT_VERSION = 3 as const
