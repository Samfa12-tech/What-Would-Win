import { describe, expect, test } from 'vitest'
import packageJson from '../../package.json'
import creaturesJson from '../../../data/creatures.json'
import {
  MODEL_04_CUSTOM_STORAGE_VERSION,
  MODEL_04_DATA_VERSION,
  MODEL_04_HISTORY_STORAGE_VERSION,
  MODEL_04_SHARE_FORMAT_VERSION,
  MODEL_04_VERSION,
} from '../model04/contracts'
import {
  MODEL_04_CUSTOM_STORAGE_KEY,
  MODEL_04_HISTORY_STORAGE_KEY,
  decodeModel04Scenario,
} from '../model04/persistence'
import { Model04Runtime, type Model04RuntimeResult } from '../model04/runtime'
import { defaultScenario } from '../simulation/engine'
import type { Creature, Scenario } from '../types'
import { APPLICATION_VERSION, DATA_VERSION, MODEL_VERSION, SHARE_FORMAT_VERSION } from '../version'

const creatures = creaturesJson as Creature[]
const runtime = new Model04Runtime(creatures)

const frozenLegacyShares = [
  {
    name: 'compact v3 model 0.3.0 data 0.3.1',
    status: 'migrated-v3',
    encoded: '3.WyIwLjMuMCIsIjAuMy4xIixbIm1hbGxhcmQtZHVjayIsImhvcnNlIiwiMTAwIixbIm5hbWVkIiwiaG9yc2UiXSxbIm5hbWVkIiwiZHVjayJdLCJmdW5jdGlvbmFsIiwib3BlbiIsImNsZWFyIiwyNSwwLCJkYXkiLCJub25lIiwibm9uZSIsMCwzNywidHJhbnNwYXJlbnQiLFtudWxsLG51bGwsbnVsbCxudWxsLG51bGwsbnVsbCxudWxsLG51bGwsbnVsbCxudWxsLG51bGxdLFtudWxsLG51bGwsbnVsbCxudWxsLG51bGwsbnVsbCxudWxsLG51bGwsbnVsbCxudWxsLG51bGxdLDczNDIxLCJuYXR1cmFsIiwibmF0dXJhbCIsImluY2FwYWNpdGF0aW9uIiwibm9uZSIsIm11dHVhbCIsIm11dHVhbCIsImJvdW5kZWQiLDUwMCwwLCJpbnN0aW5jdGl2ZSIsIm5hdHVyYWwiLCJwcm9maWxlLWJhc2VsaW5lIiwicHJvZmlsZS1iYXNlbGluZSIsInVuc3BlY2lmaWVkIiwidW5zcGVjaWZpZWQiXV0',
  },
  {
    name: 'deployed compact v2 model and data 0.1.0',
    status: 'migrated-v2',
    encoded: '2.WyIwLjEuMCIsIjAuMS4wIixbIm1hbGxhcmQtZHVjayIsImhvcnNlIiwiMTAwIixbIm5hbWVkIiwiaG9yc2UiXSxbIm5hbWVkIiwiZHVjayJdLCJmdW5jdGlvbmFsIiwib3BlbiIsImNsZWFyIiwyNSwwLCJkYXkiLCJub25lIiwibm9uZSIsMCwzNywidHJhbnNwYXJlbnQiLFtudWxsLG51bGwsbnVsbCxudWxsLG51bGwsbnVsbCxudWxsLG51bGwsbnVsbCxudWxsLG51bGxdLFtudWxsLG51bGwsbnVsbCxudWxsLG51bGwsbnVsbCxudWxsLG51bGwsbnVsbCxudWxsLG51bGxdLDczNDIxXV0',
  },
  {
    name: 'v1 envelope model and data 0.1.0',
    status: 'migrated-v1',
    encoded: 'eyJmb3JtYXRWZXJzaW9uIjoxLCJtb2RlbFZlcnNpb24iOiIwLjEuMCIsImRhdGFWZXJzaW9uIjoiMC4xLjAiLCJzY2VuYXJpbyI6eyJzb2xvSWQiOiJtYWxsYXJkLWR1Y2siLCJncm91cElkIjoiaG9yc2UiLCJncm91cFF1YW50aXR5IjoiMTAwIiwic29sb1NpemUiOnsibWV0aG9kIjoibmFtZWQiLCJ2YWx1ZSI6ImhvcnNlIn0sImdyb3VwU2l6ZSI6eyJtZXRob2QiOiJuYW1lZCIsInZhbHVlIjoiZHVjayJ9LCJzY2FsaW5nTW9kZSI6ImZ1bmN0aW9uYWwiLCJ0ZXJyYWluIjoib3BlbiIsIndlYXRoZXIiOiJjbGVhciIsInN0YXJ0aW5nRGlzdGFuY2VNIjoyNSwicHJlcGFyYXRpb25NaW51dGVzIjowLCJ0aW1lT2ZEYXkiOiJkYXkiLCJhbWJ1c2giOiJub25lIiwiZGVmZW5zaXZlUG9zaXRpb24iOiJub25lIiwiZXNjYXBlQWxsb3dlZCI6ZmFsc2UsInJlc291cmNlc1BlcmNlbnQiOjM3LCJyZXBvcnREZXB0aCI6InRyYW5zcGFyZW50Iiwic29sb092ZXJyaWRlcyI6e30sImdyb3VwT3ZlcnJpZGVzIjp7fSwic2VlZCI6NzM0MjF9fQ',
  },
  {
    name: 'delivered raw unversioned v1 scenario',
    status: 'migrated-legacy',
    encoded: 'eyJzb2xvSWQiOiJtYWxsYXJkLWR1Y2siLCJncm91cElkIjoiaG9yc2UiLCJncm91cFF1YW50aXR5IjoiMTAwIiwic29sb1NpemUiOnsibWV0aG9kIjoibmFtZWQiLCJ2YWx1ZSI6ImhvcnNlIn0sImdyb3VwU2l6ZSI6eyJtZXRob2QiOiJuYW1lZCIsInZhbHVlIjoiZHVjayJ9LCJzY2FsaW5nTW9kZSI6ImZ1bmN0aW9uYWwiLCJ0ZXJyYWluIjoib3BlbiIsIndlYXRoZXIiOiJjbGVhciIsInN0YXJ0aW5nRGlzdGFuY2VNIjoyNSwicHJlcGFyYXRpb25NaW51dGVzIjowLCJ0aW1lT2ZEYXkiOiJkYXkiLCJhbWJ1c2giOiJub25lIiwiZGVmZW5zaXZlUG9zaXRpb24iOiJub25lIiwiZXNjYXBlQWxsb3dlZCI6ZmFsc2UsInJlc291cmNlc1BlcmNlbnQiOjM3LCJyZXBvcnREZXB0aCI6InRyYW5zcGFyZW50Iiwic29sb092ZXJyaWRlcyI6e30sImdyb3VwT3ZlcnJpZGVzIjp7fSwic2VlZCI6NzM0MjF9',
  },
] as const

function resultIdentity(run: Model04RuntimeResult) {
  return {
    modelVersion: run.result.technical.modelVersion,
    dataVersion: run.result.technical.dataVersion,
    deterministicSoloLogPower: run.result.technical.deterministicSoloLogPower,
    deterministicGroupLogPower: run.result.technical.deterministicGroupLogPower,
    rawSoloTrialRate: run.result.technical.rawSoloTrialRate,
    soloWinProbability: run.result.soloWinProbability,
    winner: run.result.winner,
    seed: run.result.technical.seed,
    appliedFactors: run.result.appliedFactors,
  }
}

describe('model 0.4 atomic activation contract', () => {
  test('locks application and active model, data, share, custom and history identities explicitly', () => {
    expect(packageJson.version).toBe(APPLICATION_VERSION)
    expect(String(APPLICATION_VERSION)).toBe('0.5.0')
    expect(String(MODEL_VERSION)).toBe(MODEL_04_VERSION)
    expect(String(DATA_VERSION)).toBe(MODEL_04_DATA_VERSION)
    expect(Number(SHARE_FORMAT_VERSION)).toBe(MODEL_04_SHARE_FORMAT_VERSION)
    expect(MODEL_04_CUSTOM_STORAGE_VERSION).toBe(2)
    expect(MODEL_04_HISTORY_STORAGE_VERSION).toBe(2)
    expect(MODEL_04_CUSTOM_STORAGE_KEY).toMatch(/-v2$/)
    expect(MODEL_04_HISTORY_STORAGE_KEY).toMatch(/-v2$/)
  })

  test('activates the complete reviewed canonical roster without legacy markers', () => {
    expect(runtime.creatures).toHaveLength(134)
    expect(runtime.creatures.map((creature) => creature.id)).toEqual(creatures.map((creature) => creature.id))
    expect(new Set(runtime.creatures.map((creature) => creature.id)).size).toBe(134)
    expect(runtime.creatures.every((creature) => creature.migration.reviewRequired === false)).toBe(true)
    expect(runtime.creatures.every((creature) => creature.abilities.every((ability) => !('legacyGenerated' in ability)))).toBe(true)
  })

  test('uses model 0.4 runtime authority and keeps inactive resource overrides seed-stable', () => {
    const scenario: Scenario = {
      ...defaultScenario(creatures),
      soloId: 'medusa',
      groupId: 'stone-golem',
      groupQuantity: '1',
      startingDistanceM: 15,
      reportDepth: 'verdict',
      seed: 424_242,
    }
    const variants = [undefined, 0, 100].map((percent) => runtime.simulate(scenario, {
      solo: {
        defaultPercent: 50,
        abilityPercent: percent === undefined ? {} : { 'petrifying-gaze': percent },
      },
      group: { defaultPercent: 50, abilityPercent: {} },
    }))

    expect(variants[0].result.technical).toMatchObject({
      modelVersion: MODEL_04_VERSION,
      dataVersion: MODEL_04_DATA_VERSION,
      seed: expect.any(Number),
    })
    expect(variants[0].result.appliedFactors.some((factor) => factor.id.startsWith('ability:'))).toBe(true)
    expect(variants.map(resultIdentity)).toEqual(Array(3).fill(resultIdentity(variants[0])))
  })

  test.each(frozenLegacyShares)('recovers $name through the v4 decoder', ({ encoded, status }) => {
    const decoded = decodeModel04Scenario(encoded)
    expect(decoded).toMatchObject({
      ok: true,
      status,
      payload: {
        formatVersion: MODEL_04_SHARE_FORMAT_VERSION,
        modelVersion: MODEL_04_VERSION,
        dataVersion: MODEL_04_DATA_VERSION,
        scenario: {
          schemaVersion: 4,
          seed: 73_421,
          soloResources: { defaultPercent: 37, abilityPercent: {} },
          groupResources: { defaultPercent: 37, abilityPercent: {} },
          winCondition: 'incapacitation',
          arenaBoundary: 'bounded',
        },
      },
    })
  })
})
