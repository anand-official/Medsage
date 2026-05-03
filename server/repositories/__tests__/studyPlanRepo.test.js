'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

jest.mock('../_shared', () => ({
  cloneJson: (value, fallback) => (value === undefined ? fallback : JSON.parse(JSON.stringify(value))),
  defineHiddenMethod: (target, name, fn) => {
    Object.defineProperty(target, name, {
      value: fn,
      enumerable: false,
      configurable: true,
      writable: true,
    });
  },
  getDb: jest.fn(),
  toIso: (value) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  },
  unwrap: (result, context) => {
    if (result.error) {
      throw new Error(`${context}: ${result.error.message}`);
    }
    return result.data;
  },
}));

const { getDb } = require('../_shared');
const studyPlanRepo = require('../studyPlanRepo');

describe('studyPlanRepo local fallback', () => {
  const originalEnv = process.env;
  let fallbackPath;

  beforeEach(() => {
    jest.clearAllMocks();
    fallbackPath = path.join(os.tmpdir(), `study-plan-repo-${Date.now()}-${Math.random()}.json`);
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      LOCAL_STUDY_PLAN_REPO_PATH: fallbackPath,
    };

    getDb.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              error: { message: "Could not find the table 'public.study_plans' in the schema cache" },
            }),
          }),
        }),
        upsert: () => ({
          select: () => ({
            single: async () => ({
              error: { message: "Could not find the table 'public.study_plans' in the schema cache" },
            }),
          }),
        }),
        delete: () => ({
          eq: () => ({
            select: async () => ({
              error: { message: "Could not find the table 'public.study_plans' in the schema cache" },
            }),
          }),
        }),
      }),
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    if (fs.existsSync(fallbackPath)) {
      fs.unlinkSync(fallbackPath);
    }
  });

  test('persists and reloads a study plan when the Supabase table is missing', async () => {
    const saved = await studyPlanRepo.replaceByUid('user-1', {
      planner_version: 2,
      exam_date: new Date('2030-01-02T00:00:00.000Z'),
      daily_plan: [{ date: '2030-01-01', tasks: [] }],
    });

    expect(saved.uid).toBe('user-1');
    expect(saved.daily_plan).toEqual([{ date: '2030-01-01', tasks: [] }]);

    const loaded = await studyPlanRepo.findByUid('user-1');

    expect(loaded).not.toBeNull();
    expect(loaded.uid).toBe('user-1');
    expect(loaded.exam_date).toBeInstanceOf(Date);
    expect(loaded.daily_plan).toHaveLength(1);
  });

  test('deletes a locally stored fallback plan', async () => {
    await studyPlanRepo.replaceByUid('user-2', {
      planner_version: 2,
      daily_plan: [],
    });

    const deleted = await studyPlanRepo.deleteByUid('user-2');
    const loaded = await studyPlanRepo.findByUid('user-2');

    expect(deleted.uid).toBe('user-2');
    expect(loaded).toBeNull();
  });
});
