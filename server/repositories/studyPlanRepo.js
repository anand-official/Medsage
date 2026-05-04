'use strict';

const fs = require('fs');
const path = require('path');
const { createObjectId } = require('../lib/objectId');
const { cloneJson, defineHiddenMethod, getDb, toIso, unwrap } = require('./_shared');

const META_KEYS = new Set([
  '_id',
  'uid',
  'planner_version',
  'exam_date',
  'createdAt',
  'updatedAt',
  'created_at',
  'updated_at',
]);

function payloadFromDoc(doc) {
  const payload = {};
  Object.entries(doc || {}).forEach(([key, value]) => {
    if (META_KEYS.has(key)) return;
    if (typeof value === 'function') return;
    payload[key] = value;
  });
  return cloneJson(payload, {});
}

function buildDoc(row) {
  if (!row) return null;
  const payload = row.payload || {};
  const doc = {
    ...cloneJson(payload, {}),
    _id: row._id,
    uid: row.uid,
    planner_version: row.planner_version ?? payload.planner_version ?? 2,
    exam_date: row.exam_date ? new Date(row.exam_date) : null,
    createdAt: row.created_at ? new Date(row.created_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null,
  };

  defineHiddenMethod(doc, 'markModified', () => {});
  defineHiddenMethod(doc, 'save', async function save() {
    return upsert(doc);
  });
  defineHiddenMethod(doc, 'toObject', () => ({ ...doc }));
  return doc;
}

function rowFromDoc(doc, existing = null) {
  return {
    _id: doc._id || existing?._id || createObjectId(),
    uid: doc.uid || existing?.uid,
    planner_version: doc.planner_version ?? existing?.planner_version ?? 2,
    exam_date: toIso(doc.exam_date || existing?.exam_date),
    payload: payloadFromDoc(doc),
    created_at: toIso(doc.createdAt || existing?.createdAt || new Date()),
    updated_at: new Date().toISOString(),
  };
}

function isMissingTableError(error) {
  const msg = String(error?.message || '');
  // Match table-not-found errors (the unwrap() prefix adds "study_plans." to the message)
  // Also match the "not configured" error thrown by getSupabaseAdmin() when env vars are absent,
  // so the local-file fallback activates in development without Supabase set up.
  return (
    /study_plans.*(schema cache|does not exist|relation)/i.test(msg) ||
    /supabase is not configured/i.test(msg)
  );
}

function canUseLocalFallback() {
  return process.env.NODE_ENV !== 'production';
}

function getFallbackFilePath() {
  return process.env.LOCAL_STUDY_PLAN_REPO_PATH
    || path.join(process.cwd(), '.local-data', 'study-plans.json');
}

function ensureFallbackDir() {
  fs.mkdirSync(path.dirname(getFallbackFilePath()), { recursive: true });
}

function readFallbackRows() {
  try {
    const raw = fs.readFileSync(getFallbackFilePath(), 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function writeFallbackRows(rows) {
  ensureFallbackDir();
  fs.writeFileSync(getFallbackFilePath(), JSON.stringify(rows, null, 2));
}

function withMissingTableFallback(error, action) {
  if (!canUseLocalFallback() || !isMissingTableError(error)) {
    throw error;
  }
  return action();
}

async function findByUid(uid) {
  try {
    const db = getDb();
    const data = unwrap(
      await db.from('study_plans').select('*').eq('uid', uid).maybeSingle(),
      'study_plans.findByUid'
    );
    return buildDoc(data);
  } catch (error) {
    return withMissingTableFallback(error, () => {
      const row = readFallbackRows().find((entry) => entry.uid === uid) || null;
      return buildDoc(row);
    });
  }
}

async function upsert(doc) {
  try {
    const db = getDb();
    const existing = doc.uid ? await findByUid(doc.uid) : null;
    const row = rowFromDoc(doc, existing);
    const data = unwrap(
      await db.from('study_plans').upsert(row, { onConflict: 'uid' }).select().single(),
      'study_plans.upsert'
    );
    return buildDoc(data);
  } catch (error) {
    return withMissingTableFallback(error, () => {
      const rows = readFallbackRows();
      const existingIndex = rows.findIndex((entry) => entry.uid === doc.uid);
      const existingRow = existingIndex >= 0 ? rows[existingIndex] : null;
      const row = rowFromDoc(doc, existingRow);
      if (existingIndex >= 0) {
        rows[existingIndex] = row;
      } else {
        rows.push(row);
      }
      writeFallbackRows(rows);
      return buildDoc(row);
    });
  }
}

async function replaceByUid(uid, payload) {
  return upsert({ ...payload, uid });
}

async function deleteByUid(uid) {
  try {
    const db = getDb();
    const data = unwrap(
      await db.from('study_plans').delete().eq('uid', uid).select(),
      'study_plans.deleteByUid'
    );
    return Array.isArray(data) && data.length > 0 ? buildDoc(data[0]) : null;
  } catch (error) {
    return withMissingTableFallback(error, () => {
      const rows = readFallbackRows();
      const existingIndex = rows.findIndex((entry) => entry.uid === uid);
      if (existingIndex < 0) return null;
      const [deletedRow] = rows.splice(existingIndex, 1);
      writeFallbackRows(rows);
      return buildDoc(deletedRow);
    });
  }
}

module.exports = {
  deleteByUid,
  findByUid,
  replaceByUid,
  upsert,
};
