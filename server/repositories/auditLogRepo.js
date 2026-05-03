'use strict';

const crypto = require('crypto');
const { createObjectId } = require('../lib/objectId');
const { getDb, toIso, unwrap } = require('./_shared');

function fromRow(row) {
  if (!row) return null;
  return {
    _id: row._id,
    log_id: row.log_id,
    user_id: row.user_id,
    session_id: row.session_id,
    question: row.question,
    mode: row.mode,
    subject: row.subject,
    has_image: Boolean(row.has_image),
    answer: row.answer || '',
    pipeline: row.pipeline,
    confidence: row.confidence,
    prompt_id: row.prompt_id,
    prompt_version: row.prompt_version,
    model_version: row.model_version,
    is_clarification: Boolean(row.is_clarification),
    feedback: row.feedback || { rating: null, comment: '', rated_at: null },
    flagged: Boolean(row.flagged),
    flag_reason: row.flag_reason || '',
    created_at: row.created_at ? new Date(row.created_at) : null,
  };
}

function toRow(log, existing = null) {
  return {
    _id: log._id || existing?._id || createObjectId(),
    log_id: log.log_id || existing?.log_id || crypto.randomUUID(),
    user_id: log.user_id || existing?.user_id,
    session_id: log.session_id ?? existing?.session_id ?? null,
    question: log.question ?? existing?.question ?? '',
    mode: log.mode ?? existing?.mode ?? 'unknown',
    subject: log.subject ?? existing?.subject ?? null,
    has_image: log.has_image ?? existing?.has_image ?? false,
    answer: log.answer ?? existing?.answer ?? '',
    pipeline: log.pipeline ?? existing?.pipeline ?? null,
    confidence: log.confidence ?? existing?.confidence ?? null,
    prompt_id: log.prompt_id ?? existing?.prompt_id ?? null,
    prompt_version: log.prompt_version ?? existing?.prompt_version ?? null,
    model_version: log.model_version ?? existing?.model_version ?? null,
    is_clarification: log.is_clarification ?? existing?.is_clarification ?? false,
    feedback: log.feedback ?? existing?.feedback ?? { rating: null, comment: '', rated_at: null },
    flagged: log.flagged ?? existing?.flagged ?? false,
    flag_reason: log.flag_reason ?? existing?.flag_reason ?? '',
    created_at: toIso(log.created_at || existing?.created_at || new Date()),
  };
}

async function create(log) {
  const db = getDb();
  const row = toRow(log);
  const data = unwrap(
    await db.from('audit_logs').insert(row).select().single(),
    'audit_logs.create'
  );
  return fromRow(data);
}

async function findById(id) {
  const db = getDb();
  const data = unwrap(
    await db.from('audit_logs').select('*').eq('_id', id).maybeSingle(),
    'audit_logs.findById'
  );
  return fromRow(data);
}

async function findBySelector(selector) {
  const db = getDb();
  let query = db.from('audit_logs').select('*');
  Object.entries(selector || {}).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  const data = unwrap(await query.maybeSingle(), 'audit_logs.findBySelector');
  return fromRow(data);
}

async function updateBySelector(selector, updates) {
  const existing = await findBySelector(selector);
  if (!existing) return null;
  const row = toRow({ ...existing, ...updates }, existing);
  const db = getDb();
  let query = db.from('audit_logs').update(row).select();
  Object.entries(selector || {}).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  const data = unwrap(await query.single(), 'audit_logs.updateBySelector');
  return fromRow(data);
}

async function flagById(id, reason) {
  const db = getDb();
  const data = unwrap(
    await db.from('audit_logs').update({ flagged: true, flag_reason: reason || 'admin_manual' }).eq('_id', id).select().maybeSingle(),
    'audit_logs.flagById'
  );
  return fromRow(data);
}

function applyReviewFilter(query, filter) {
  if (filter === 'thumbs_down') return query.eq('feedback->>rating', 'down');
  if (filter === 'flagged') return query.eq('flagged', true);
  if (filter === 'low_confidence') return query.lt('confidence', 0.5).not('confidence', 'is', null);
  return query; // 'all' — no filter
}

async function listForReview(filter, limit, skip) {
  const db = getDb();
  const cols = '_id,log_id,user_id,session_id,question,mode,subject,has_image,pipeline,confidence,prompt_id,prompt_version,model_version,is_clarification,feedback,flagged,flag_reason,created_at';
  let query = db.from('audit_logs')
    .select(cols)
    .order('created_at', { ascending: false })
    .range(skip, skip + limit - 1);
  query = applyReviewFilter(query, filter);
  const data = unwrap(await query, 'audit_logs.listForReview');
  return (data || []).map(fromRow);
}

async function countForReview(filter) {
  const db = getDb();
  let query = db.from('audit_logs').select('*', { count: 'exact', head: true });
  query = applyReviewFilter(query, filter);
  const result = await query;
  if (result.error) throw new Error(`audit_logs.countForReview: ${result.error.message}`);
  return result.count || 0;
}

async function listOlderThan(cutoff, limit) {
  const db = getDb();
  const data = unwrap(
    await db.from('audit_logs').select('_id').lt('created_at', cutoff.toISOString()).order('created_at', { ascending: true }).limit(limit),
    'audit_logs.listOlderThan'
  );
  return data || [];
}

async function deleteManyByIds(ids) {
  if (!ids.length) return [];
  const db = getDb();
  const data = unwrap(
    await db.from('audit_logs').delete().in('_id', ids).select(),
    'audit_logs.deleteManyByIds'
  );
  return data || [];
}

async function deleteByUser(userId) {
  const db = getDb();
  const data = unwrap(
    await db.from('audit_logs').delete().eq('user_id', userId).select(),
    'audit_logs.deleteByUser'
  );
  return data || [];
}

module.exports = {
  countForReview,
  create,
  deleteByUser,
  deleteManyByIds,
  findById,
  flagById,
  listForReview,
  listOlderThan,
  updateBySelector,
};
