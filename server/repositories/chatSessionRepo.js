'use strict';

const { createObjectId } = require('../lib/objectId');
const { cloneJson, getDb, toIso, unwrap } = require('./_shared');

function fromRow(row) {
  if (!row) return null;
  return {
    _id: row._id,
    user_id: row.user_id,
    session_id: row.session_id,
    title: row.title || 'Untitled session',
    messages: Array.isArray(row.messages) ? row.messages : [],
    created_at: row.created_at ? new Date(row.created_at) : null,
    updated_at: row.updated_at ? new Date(row.updated_at) : null,
  };
}

function toRow(session, existing = null) {
  return {
    _id: session._id || existing?._id || createObjectId(),
    user_id: session.user_id || existing?.user_id,
    session_id: session.session_id || existing?.session_id,
    title: session.title ?? existing?.title ?? 'Untitled session',
    messages: cloneJson(session.messages, existing?.messages || []),
    created_at: toIso(session.created_at || existing?.created_at || new Date()),
    updated_at: toIso(session.updated_at || new Date()),
  };
}

async function listByUser(userId, { limit = 50 } = {}) {
  const db = getDb();
  const data = unwrap(
    await db.from('chat_sessions').select('*').eq('user_id', userId).order('updated_at', { ascending: false }).limit(limit),
    'chat_sessions.listByUser'
  );
  return (data || []).map(fromRow);
}

async function findByUserSession(userId, sessionId) {
  const db = getDb();
  const data = unwrap(
    await db.from('chat_sessions').select('*').eq('user_id', userId).eq('session_id', sessionId).maybeSingle(),
    'chat_sessions.findByUserSession'
  );
  return fromRow(data);
}

async function countByUser(userId) {
  const db = getDb();
  const result = await db.from('chat_sessions').select('*', { count: 'exact', head: true }).eq('user_id', userId);
  if (result.error) throw new Error(`chat_sessions.countByUser: ${result.error.message}`);
  return result.count || 0;
}

async function existsByUserSession(userId, sessionId) {
  const session = await findByUserSession(userId, sessionId);
  return session ? { _id: session._id } : null;
}

async function getOldestByUser(userId) {
  const db = getDb();
  const data = unwrap(
    await db.from('chat_sessions').select('*').eq('user_id', userId).order('updated_at', { ascending: true }).limit(1),
    'chat_sessions.getOldestByUser'
  );
  return Array.isArray(data) && data.length > 0 ? fromRow(data[0]) : null;
}

async function upsert(session) {
  const db = getDb();
  const existing = await findByUserSession(session.user_id, session.session_id);
  const row = toRow(session, existing);
  const data = unwrap(
    await db.from('chat_sessions').upsert(row, { onConflict: 'user_id,session_id' }).select().single(),
    'chat_sessions.upsert'
  );
  return fromRow(data);
}

async function deleteById(id) {
  const db = getDb();
  const data = unwrap(
    await db.from('chat_sessions').delete().eq('_id', id).select(),
    'chat_sessions.deleteById'
  );
  return Array.isArray(data) && data.length > 0 ? fromRow(data[0]) : null;
}

async function deleteByUserSession(userId, sessionId) {
  const db = getDb();
  const data = unwrap(
    await db.from('chat_sessions').delete().eq('user_id', userId).eq('session_id', sessionId).select(),
    'chat_sessions.deleteByUserSession'
  );
  return Array.isArray(data) && data.length > 0 ? fromRow(data[0]) : null;
}

async function deleteByUser(userId) {
  const db = getDb();
  const data = unwrap(
    await db.from('chat_sessions').delete().eq('user_id', userId).select(),
    'chat_sessions.deleteByUser'
  );
  return data || [];
}

module.exports = {
  countByUser,
  deleteById,
  deleteByUser,
  deleteByUserSession,
  existsByUserSession,
  findByUserSession,
  getOldestByUser,
  listByUser,
  upsert,
};
