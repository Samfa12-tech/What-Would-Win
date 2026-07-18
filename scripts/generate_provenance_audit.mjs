import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const creaturesPath = path.join(repositoryRoot, 'data', 'creatures.json')
const provenancePath = path.join(repositoryRoot, 'data', 'field_provenance.json')
const writeMode = process.argv.includes('--write')

const creatures = JSON.parse(await readFile(creaturesPath, 'utf8'))

const metadataFields = ['id', 'icon', 'data_confidence', 'source_label', 'source_url']
const conceptFields = ['name', 'kind', 'category']
const realOrientationFields = [
  ...conceptFields,
  'representative_peak_mass_kg',
  'body_length_m',
  'shoulder_or_body_height_m',
  'burst_speed_kph',
  'habitats',
]

const provenance = {
  provenanceVersion: 2,
  reviewed_on: '2026-07-18',
  reviewer: 'Samfa12 release audit',
  review_scope: 'Repository-wide licensing and expression audit. External pages are orientation and factual references; no third-party prose or media is bundled. Scientific validation remains a separate future review.',
  data_license: 'CC-BY-SA-4.0',
  records: creatures.map((creature) => {
    const sourceUrl = new URL(creature.source_url)
    if (sourceUrl.protocol !== 'https:' || sourceUrl.hostname !== 'en.wikipedia.org') {
      throw new Error(`${creature.id}: external source needs a manual licence review: ${creature.source_url}`)
    }

    const externalFields = ['animal', 'extinct'].includes(creature.kind)
      ? realOrientationFields
      : conceptFields
    const modelFields = Object.keys(creature).filter(
      (field) => !externalFields.includes(field) && !metadataFields.includes(field),
    )
    const externalNote = ['animal', 'extinct'].includes(creature.kind)
      ? 'Orientation and factual inputs only. No prose or media is copied. Exact values remain simulation inputs and need stronger primary sourcing before authoritative zoological claims.'
      : 'Concept orientation only. No prose or media is copied; physical and gameplay values are original app-authored assumptions.'

    return {
      creature_id: creature.id,
      release_status: 'licence-cleared-for-public-beta',
      scientific_status: ['animal', 'extinct'].includes(creature.kind)
        ? 'orientation-only'
        : 'authored-profile',
      review_note: 'Licence classification is complete for this beta record. This is not an expert zoological or cultural review.',
      sources: [
        {
          source_id: 'wikipedia-orientation',
          source_type: 'external_orientation',
          label: `${creature.name} orientation reference`,
          publisher: 'Wikipedia contributors',
          url: creature.source_url,
          license: 'CC-BY-SA-4.0',
          accessed_on: '2026-07-18',
          reuse_basis: 'linked-orientation-and-facts',
          copied_expression: false,
          attribution: `Wikipedia contributors, “${creature.name}”; article and contributor history available at ${creature.source_url}`,
          fields: externalFields,
          note: externalNote,
        },
        {
          source_id: 'samfa12-model-v1',
          source_type: 'authored_model',
          label: 'What Would Win authored simulation assumptions',
          publisher: 'Samfa12-tech',
          license: 'CC-BY-SA-4.0',
          reuse_basis: 'original-authored-model',
          copied_expression: false,
          attribution: 'What Would Win creature data by Samfa12-tech, CC BY-SA 4.0',
          fields: modelFields,
          note: 'Game-model inputs and capability interpretations, not direct zoological measurements.',
        },
        {
          source_id: 'samfa12-record-metadata',
          source_type: 'authored_metadata',
          label: 'What Would Win record metadata',
          publisher: 'Samfa12-tech',
          license: 'CC-BY-SA-4.0',
          reuse_basis: 'original-authored-metadata',
          copied_expression: false,
          attribution: 'What Would Win creature data by Samfa12-tech, CC BY-SA 4.0',
          fields: metadataFields,
          note: 'Stable IDs, interface locators, confidence labels and source-warning metadata authored for this application.',
        },
      ],
    }
  }),
}

const rendered = `${JSON.stringify(provenance, null, 2)}\n`
if (writeMode) {
  await writeFile(provenancePath, rendered, 'utf8')
  console.log(`Wrote ${provenance.records.length} provenance records to ${provenancePath}`)
} else {
  const existing = await readFile(provenancePath, 'utf8')
  if (existing !== rendered) {
    console.error('field_provenance.json is stale. Run: node scripts/generate_provenance_audit.mjs --write')
    process.exitCode = 1
  } else {
    console.log(`Verified ${provenance.records.length} generated provenance records`)
  }
}
