'use strict';

const { createObjectId } = require('../lib/objectId');
const { defineHiddenMethod, getDb, toIso, unwrap } = require('./_shared');

function fromRow(row) {
  if (!row) return null;
  const doc = {
    _id: row._id || row.id || row.uid,
    uid: row.uid,
    email: row.email,
    displayName: row.display_name || '',
    photoURL: row.photo_url || '',
    onboarded: Boolean(row.onboarded),
    mbbs_year: row.mbbs_year,
    college: row.college || '',
    country: row.country || 'India',
    topics_weak: Array.isArray(row.topics_weak) ? row.topics_weak : [],
    topics_strong: Array.isArray(row.topics_strong) ? row.topics_strong : [],
    lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : null,
    createdAt: row.created_at ? new Date(row.created_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null,
  };

  defineHiddenMethod(doc, 'toObject', () => ({ ...doc }));
  return doc;
}

function toRow(doc, existing = null) {
  return {
    _id: doc._id || existing?._id || createObjectId(),
    uid: doc.uid || existing?.uid,
    email: doc.email ?? existing?.email ?? '',
    display_name: doc.displayName ?? existing?.displayName ?? '',
    photo_url: doc.photoURL ?? existing?.photoURL ?? '',
    onboarded: doc.onboarded ?? existing?.onboarded ?? false,
    mbbs_year: doc.mbbs_year ?? existing?.mbbs_year ?? null,
    college: doc.college ?? existing?.college ?? '',
    country: doc.country ?? existing?.country ?? 'India',
    topics_weak: doc.topics_weak ?? existing?.topics_weak ?? [],
    topics_strong: doc.topics_strong ?? existing?.topics_strong ?? [],
    last_login_at: toIso(doc.lastLoginAt || existing?.lastLoginAt || new Date()),
    updated_at: new Date().toISOString(),
    created_at: toIso(doc.createdAt || existing?.createdAt || new Date()),
  };
}

async function findByUid(uid) {
  const db = getDb();
  const data = unwrap(
    await db.from('user_profiles').select('*').eq('uid', uid).maybeSingle(),
    'user_profiles.findByUid'
  );
  return fromRow(data);
}

async function upsert(doc) {
  const db = getDb();
  const existing = doc.uid ? await findByUid(doc.uid) : null;
  const row = toRow(doc, existing);
  const firstAttempt = await db.from('user_profiles').upsert(row, { onConflict: 'uid' }).select().single();
  const firstMessage = String(firstAttempt?.error?.message || '');
  const missingIdColumn =
    firstMessage.includes("Could not find the '_id' column")
    || firstMessage.includes('column "_id"');

  if (!firstAttempt.error) {
    return fromRow(firstAttempt.data);
  }

  if (!missingIdColumn) {
    throw new Error(`user_profiles.upsert: ${firstAttempt.error.message}`);
  }

  const { _id, ...rowWithoutLegacyId } = row;
  const fallbackAttempt = await db.from('user_profiles').upsert(rowWithoutLegacyId, { onConflict: 'uid' }).select().single();
  const data = unwrap(fallbackAttempt, 'user_profiles.upsert');
  return fromRow(data);
}

async function updateByUid(uid, updates, { upsert: shouldUpsert = false } = {}) {
  const existing = await findByUid(uid);
  if (!existing && !shouldUpsert) return null;
  return upsert({
    ...(existing || { uid }),
    ...updates,
  });
}

async function deleteByUid(uid) {
  const db = getDb();
  const data = unwrap(
    await db.from('user_profiles').delete().eq('uid', uid).select(),
    'user_profiles.deleteByUid'
  );
  return Array.isArray(data) && data.length > 0 ? fromRow(data[0]) : null;
}

module.exports = {
  deleteByUid,
  findByUid,
  updateByUid,
  upsert,
};
