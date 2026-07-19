import { describe, expect, test } from 'vitest'
import mechanicsVocabulary from '../../../data/mechanics-vocabulary.json'
import { profileTagStatus } from '../mechanicsStatus'

describe('profile tag mechanics status', () => {
  test('reports every mechanical family for a multi-purpose token', () => {
    expect(profileTagStatus('attack_modes', 'tail-spike')).toEqual({
      status: 'mechanical',
      explanation: 'contact piercing, conditional ranged delivery, area control',
    })
  })

  test('labels controlled and open custom non-mechanical tags honestly', () => {
    expect(profileTagStatus('traits', 'apex-predator')).toEqual({
      status: 'descriptive',
      explanation: 'dossier context; no current model rule',
    })
    expect(profileTagStatus('traits', 'custom-luminous')).toEqual({
      status: 'descriptive',
      explanation: 'dossier context; no current model rule',
    })
  })

  test('treats an open custom habitat as an exact terrain mechanic', () => {
    expect(profileTagStatus('habitats', 'floating-library')).toEqual({
      status: 'mechanical',
      explanation: 'terrain affinity',
    })
  })

  test('stays exhaustive against the canonical controlled vocabulary', () => {
    for (const field of ['attack_modes', 'traits'] as const) {
      for (const tokens of Object.values(mechanicsVocabulary[field].mechanical)) {
        for (const token of tokens) expect(profileTagStatus(field, token).status).toBe('mechanical')
      }
      for (const token of mechanicsVocabulary[field].descriptive) {
        expect(profileTagStatus(field, token).status).toBe('descriptive')
      }
    }
    for (const token of mechanicsVocabulary.habitats.mechanical['terrain-affinity']) {
      expect(profileTagStatus('habitats', token).status).toBe('mechanical')
    }
  })
})
