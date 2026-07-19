# What Would Win — model 0.4 persistence and compatibility

**Status:** active v4 share and v2 browser-storage implementation

Model 0.4 emits v4 shares and writes the two v2 browser-storage keys. The frozen legacy codecs and v1 stores remain migration/recovery inputs.

## Recovery boundary

- Model 0.4 custom profiles use `what-would-win-custom-creatures-v2`.
- Model 0.4 history uses `what-would-win-history-v2`.
- A successful migration writes only the new key. The original v1 bytes are never edited or removed.
- A partial or invalid v1 store is usable in memory where safe, but no v2 copy is written.
- A damaged v2 store remains authoritative and untouched; loading does not silently replace it from v1.

V1 custom exports remain importable. Imports receive conservative structured abilities and an explicit review-required notice. New exports use storage format 2 only.

## History truthfulness

Migrating history converts inputs, not outcomes. A legacy numerical result remains attached as a snapshot with `pending-recalculation` status. Missing profiles produce `pending-unavailable-profile`. Only `finalizeModel04HistoryItem` may attach a result carrying model/data 0.4.1 identity after the activated engine has actually run.

## Share routing

The active codec emits `4.` and accepts current v4 payloads. Released v4/0.4.0 is a deliberate `migrated-v4` input; existing v3, deployed v2, v1 and unversioned links pass through the established migration spine. Embedded custom IDs must be unique `custom:` IDs and exactly equal the custom IDs referenced by the contestants—no missing or unreferenced extras and no built-in shadowing.

Side resource defaults may differ, and `abilityPercent` maps are serialized in sorted key order so equivalent scenarios have one canonical link. Embedded legacy custom profiles are migrated visibly with stable IDs and review-required metadata.

## Verification

The unit suite locks:

- asymmetric side and per-ability resource round trips;
- v3 resource/seed preservation;
- embedded custom-profile migration;
- byte-identical v1 recovery stores;
- all-or-nothing recovery-copy writes;
- v1 import and v2 export compatibility;
- pending and unavailable history states;
- explicit 0.4 result finalization;
- inactive per-ability resource mechanical identity.

The codec and storage modules are wired into the production entry graph; the regression suite locks their active formats and legacy recovery paths.
