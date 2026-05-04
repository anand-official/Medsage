'use strict';

const { createObjectId } = require('../lib/objectId');
const { defineHiddenMethod, getDb, toIso, unwrap } = require('./_shared');

function fromRow(row) {
  if (!row) return null;
  const doc = {
    _id: row._id,
    user_id: row.user_id,
    topic_id: row.topic_id,
    subject: row.subject,
    chapter: row.chapter,
    question: row.question,
    answer_summary: row.answer_summary,
    source_chunk_ids: Array.isArray(row.source_chunk_ids) ? row.source_chunk_ids : [],
    source_book: row.source_book,
    source_pages: row.source_pages,
    source_confidence: row.source_confidence,
    source_tier: row.source_tier,
    ease_factor: row.ease_factor,
    interval_days: row.interval_days,
    repetitions: row.repetitions,
    next_review: row.next_review ? new Date(row.next_review) : null,
    last_reviewed: row.last_reviewed ? new Date(row.last_reviewed) : null,
    last_quality: row.last_quality,
    total_reviews: row.total_reviews,
    total_correct: row.total_correct,
    is_suspended: Boolean(row.is_suspended),
    createdAt: row.created_at ? new Date(row.created_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null,
  };

  defineHiddenMethod(doc, 'save', async function save() {
    return upsert(doc);
  });
  return doc;
}

function toRow(card, existing = null) {
  return {
    _id: card._id || existing?._id || createObjectId(),
    user_id: card.user_id || existing?.user_id,
    topic_id: card.topic_id || existing?.topic_id,
    subject: card.subject ?? existing?.subject ?? 'Pathology',
    chapter: card.chapter ?? existing?.chapter ?? '',
    question: card.question ?? existing?.question ?? '',
    answer_summary: card.answer_summary ?? existing?.answer_summary ?? '',
    source_chunk_ids: card.source_chunk_ids ?? existing?.source_chunk_ids ?? [],
    source_book: card.source_book ?? existing?.source_book ?? null,
    source_pages: card.source_pages ?? existing?.source_pages ?? null,
    source_confidence: card.source_confidence ?? existing?.source_confidence ?? 0,
    source_tier: card.source_tier ?? existing?.source_tier ?? 'HIGH',
    ease_factor: card.ease_factor ?? existing?.ease_factor ?? 2.5,
    interval_days: card.interval_days ?? existing?.interval_days ?? 0,
    repetitions: card.repetitions ?? existing?.repetitions ?? 0,
    next_review: toIso(card.next_review || existing?.next_review || new Date()),
    last_reviewed: toIso(card.last_reviewed || existing?.last_reviewed),
    last_quality: card.last_quality ?? existing?.last_quality ?? null,
    total_reviews: card.total_reviews ?? existing?.total_reviews ?? 0,
    total_correct: card.total_correct ?? existing?.total_correct ?? 0,
    is_suspended: card.is_suspended ?? existing?.is_suspended ?? false,
    created_at: toIso(card.createdAt || existing?.createdAt || new Date()),
    updated_at: new Date().toISOString(),
  };
}

async function findByIdForUser(cardId, userId) {
  const db = getDb();
  const data = unwrap(
    await db.from('flashcards').select('*').eq('_id', cardId).eq('user_id', userId).maybeSingle(),
    'flashcards.findByIdForUser'
  );
  return fromRow(data);
}

async function findByUserQuestion(userId, question) {
  const db = getDb();
  const data = unwrap(
    await db.from('flashcards').select('*').eq('user_id', userId).eq('question', question).maybeSingle(),
    'flashcards.findByUserQuestion'
  );
  return fromRow(data);
}

async function upsert(card) {
  const db = getDb();
  const existing = card._id ? await findByIdForUser(card._id, card.user_id) : null;
  const row = toRow(card, existing);
  const data = unwrap(
    await db.from('flashcards').upsert(row, { onConflict: '_id' }).select().single(),
    'flashcards.upsert'
  );
  return fromRow(data);
}

async function create(card) {
  return upsert(card);
}

async function listDueCards(userId, filters = {}, limit = 20) {
  const db = getDb();
  let query = db.from('flashcards').select('*').eq('user_id', userId).eq('is_suspended', false).lte('next_review', new Date().toISOString()).order('next_review', { ascending: true }).limit(limit);
  if (filters.topic_id) query = query.eq('topic_id', filters.topic_id);
  if (filters.subject) query = query.eq('subject', filters.subject);
  const data = unwrap(await query, 'flashcards.listDueCards');
  return (data || []).map(fromRow);
}

async function countByUser(userId) {
  const db = getDb();
  const result = await db.from('flashcards').select('*', { count: 'exact', head: true }).eq('user_id', userId);
  if (result.error) throw new Error(`flashcards.countByUser: ${result.error.message}`);
  return result.count || 0;
}

async function countDueByUser(userId) {
  const db = getDb();
  const result = await db.from('flashcards').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_suspended', false).lte('next_review', new Date().toISOString());
  if (result.error) throw new Error(`flashcards.countDueByUser: ${result.error.message}`);
  return result.count || 0;
}

async function countSuspendedByUser(userId) {
  const db = getDb();
  const result = await db.from('flashcards').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_suspended', true);
  if (result.error) throw new Error(`flashcards.countSuspendedByUser: ${result.error.message}`);
  return result.count || 0;
}

async function listReviewedByUser(userId) {
  const db = getDb();
  const data = unwrap(
    await db.from('flashcards').select('*').eq('user_id', userId).gt('total_reviews', 0),
    'flashcards.listReviewedByUser'
  );
  return (data || []).map(fromRow);
}

async function deleteByIdForUser(cardId, userId) {
  const db = getDb();
  const data = unwrap(
    await db.from('flashcards').delete().eq('_id', cardId).eq('user_id', userId).select(),
    'flashcards.deleteByIdForUser'
  );
  return Array.isArray(data) && data.length > 0 ? fromRow(data[0]) : null;
}

async function deleteByUser(userId) {
  const db = getDb();
  const data = unwrap(
    await db.from('flashcards').delete().eq('user_id', userId).select(),
    'flashcards.deleteByUser'
  );
  return data || [];
}

module.exports = {
  countByUser,
  countDueByUser,
  countSuspendedByUser,
  create,
  deleteByIdForUser,
  deleteByUser,
  findByIdForUser,
  findByUserQuestion,
  listDueCards,
  listReviewedByUser,
  upsert,
};
