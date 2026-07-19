/**
 * Bump MODEL_VERSION whenever coefficients or simulation behaviour change.
 * Bump DATA_VERSION whenever the bundled creature records change materially.
 * SHARE_FORMAT_VERSION changes only when the serialized envelope is incompatible.
 */
export const MODEL_VERSION = '0.3.0' as const
export const DATA_VERSION = '0.3.1' as const
export const SHARE_FORMAT_VERSION = 3 as const
