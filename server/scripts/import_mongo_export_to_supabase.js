'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { getSupabaseAdmin, isSupabaseConfigured } = require('../lib/supabaseAdmin');

const FILE_CANDIDATES = {
  user_profiles: ['user_profiles.json', 'UserProfile.json', 'userprofile.json'],
  study_plans: ['study_plans.json', 'StudyPlan.json', 'studyplan.json'],
  chat_sessions: ['chat_sessions.json', 'ChatSession.json', 'chatsession.json'],
  flashcards: ['flashcards.json', 'Flashcard.json', 'flashcard.json'],
  audit_logs: ['audit_logs.json', 'AuditLog.json', 'auditlog.json'],
};

function usage() {
  console.log(
    'Usage: node server/scripts/import_mongo_export_to_supabase.js --dir <export-dir> [--truncate]'
  );
}

function getArg(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function normalizeObjectId(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && typeof value.$oid === 'string') return value.$oid;
  return String(value);
}

function normalizeDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (typeof value === 'object') {
    if (value.$date) {
      return normalizeDate(value.$date);
    }
    if (typeof value.toISOString === 'function') {
      return normalizeDate(value.toISOString());
    }
  }
  return null;
}

function normalizeArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

function pickFile(exportDir, names) {
  for (const name of names) {
    const fullPath = path.join(exportDir, name);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

function loadJsonArray(filePath) {
  if (!filePath) return [];
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.documents)) return parsed.documents;
  if (Array.isArray(parsed.rows)) return parsed.rows;
  throw new Error(`Expected an array export in ${filePath}`);
}

function buildStudyPlanPayload(doc) {
  const payload = { ...doc };
  delete payload._id;
  delete payload.id;
  delete payload.uid;
  delete payload.exam_date;
  delete payload.createdAt;
  delete payload.updatedAt;
  delete payload.created_at;
  delete payload.updated_at;
  delete payload.__v;
  return payload;
}

function normalizeUserProfile(doc) {
  return {
    _id: normalizeObjectId(doc._id) || doc.uid,
    uid: doc.uid,
    email: doc.email || '',
    display_name: doc.displayName || doc.display_name || '',
    photo_url: doc.photoURL || doc.photo_url || '',
    onboarded: Boolean(doc.onboarded),
    mbbs_year: doc.mbbs_year ?? null,
    college: doc.college || '',
    country: doc.country || 'India',
    topics_weak: normalizeArray(doc.topics_weak || doc.subjects_weak),
    topics_strong: normalizeArray(doc.topics_strong || doc.subjects_strong),
    last_login_at: normalizeDate(doc.lastLoginAt || doc.last_login_at) || new Date().toISOString(),
    created_at: normalizeDate(doc.createdAt || doc.created_at) || new Date().toISOString(),
    updated_at: normalizeDate(doc.updatedAt || doc.updated_at) || new Date().toISOString(),
  };
}

function normalizeStudyPlan(doc) {
  return {
    _id: normalizeObjectId(doc._id) || doc.uid,
    uid: doc.uid,
    planner_version: doc.planner_version || 2,
    exam_date: normalizeDate(doc.exam_date),
    payload: buildStudyPlanPayload(doc),
    created_at: normalizeDate(doc.createdAt || doc.created_at) || new Date().toISOString(),
    updated_at: normalizeDate(doc.updatedAt || doc.updated_at) || new Date().toISOString(),
  };
}

function normalizeChatSession(doc) {
  return {
    _id: normalizeObjectId(doc._id) || `${doc.user_id || doc.uid}-${doc.session_id}`,
    user_id: doc.user_id || doc.uid,
    session_id: doc.session_id || doc.id,
    title: doc.title || 'Untitled session',
    messages: normalizeArray(doc.messages),
    created_at: normalizeDate(doc.created_at || doc.createdAt) || new Date().toISOString(),
    updated_at: normalizeDate(doc.updated_at || doc.updatedAt) || new Date().toISOString(),
  };
}

function normalizeFlashcard(doc) {
  return {
    _id: normalizeObjectId(doc._id),
    user_id: doc.user_id || doc.uid,
    topic_id: doc.topic_id || '',
    subject: doc.subject || 'Pathology',
    chapter: doc.chapter || '',
    question: doc.question || '',
    answer_summary: doc.answer_summary || '',
    source_chunk_ids: normalizeArray(doc.source_chunk_ids),
    source_book: doc.source_book || null,
    source_pages: doc.source_pages || null,
    source_confidence: doc.source_confidence ?? 0,
    source_tier: doc.source_tier || 'HIGH',
    ease_factor: doc.ease_factor ?? 2.5,
    interval_days: doc.interval_days ?? 0,
    repetitions: doc.repetitions ?? 0,
    next_review: normalizeDate(doc.next_review) || new Date().toISOString(),
    last_reviewed: normalizeDate(doc.last_reviewed),
    last_quality: doc.last_quality ?? null,
    total_reviews: doc.total_reviews ?? 0,
    total_correct: doc.total_correct ?? 0,
    is_suspended: Boolean(doc.is_suspended),
    created_at: normalizeDate(doc.createdAt || doc.created_at) || new Date().toISOString(),
    updated_at: normalizeDate(doc.updatedAt || doc.updated_at) || new Date().toISOString(),
  };
}

function normalizeAuditLog(doc) {
  return {
    _id: normalizeObjectId(doc._id),
    log_id: doc.log_id || normalizeObjectId(doc._id),
    user_id: doc.user_id || doc.uid,
    session_id: doc.session_id || null,
    question: doc.question || '',
    mode: doc.mode || 'unknown',
    subject: doc.subject || null,
    has_image: Boolean(doc.has_image),
    answer: doc.answer || '',
    pipeline: doc.pipeline || null,
    confidence: doc.confidence ?? null,
    prompt_id: doc.prompt_id || null,
    prompt_version: doc.prompt_version || null,
    model_version: doc.model_version || null,
    is_clarification: Boolean(doc.is_clarification),
    feedback: doc.feedback || { rating: null, comment: '', rated_at: null },
    flagged: Boolean(doc.flagged),
    flag_reason: doc.flag_reason || '',
    created_at: normalizeDate(doc.created_at || doc.createdAt) || new Date().toISOString(),
  };
}

async function upsertRows(db, table, rows, onConflict, { truncate = false } = {}) {
  if (truncate) {
    const { error } = await db.from(table).delete().not('_id', 'is', null);
    if (error) {
      throw new Error(`${table}.truncate: ${error.message}`);
    }
  }

  if (rows.length === 0) {
    return 0;
  }

  const batchSize = 200;
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    const { error } = await db.from(table).upsert(batch, { onConflict });
    if (error) {
      throw new Error(`${table}.upsert: ${error.message}`);
    }
  }

  return rows.length;
}

async function main() {
  const exportDir = getArg('--dir');
  const truncate = hasFlag('--truncate');

  if (!exportDir) {
    usage();
    process.exit(1);
  }

  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY first.');
  }

  const resolvedDir = path.resolve(exportDir);
  if (!fs.existsSync(resolvedDir)) {
    throw new Error(`Export directory does not exist: ${resolvedDir}`);
  }

  const db = getSupabaseAdmin();
  const files = Object.fromEntries(
    Object.entries(FILE_CANDIDATES).map(([key, names]) => [key, pickFile(resolvedDir, names)])
  );

  const userProfiles = loadJsonArray(files.user_profiles).map(normalizeUserProfile).filter((row) => row.uid);
  const studyPlans = loadJsonArray(files.study_plans).map(normalizeStudyPlan).filter((row) => row.uid);
  const chatSessions = loadJsonArray(files.chat_sessions).map(normalizeChatSession).filter((row) => row.user_id && row.session_id);
  const flashcards = loadJsonArray(files.flashcards).map(normalizeFlashcard).filter((row) => row._id && row.user_id);
  const auditLogs = loadJsonArray(files.audit_logs).map(normalizeAuditLog).filter((row) => row._id && row.log_id && row.user_id);

  const counts = {};
  counts.user_profiles = await upsertRows(db, 'user_profiles', userProfiles, 'uid', { truncate });
  counts.study_plans = await upsertRows(db, 'study_plans', studyPlans, 'uid', { truncate });
  counts.chat_sessions = await upsertRows(db, 'chat_sessions', chatSessions, 'user_id,session_id', { truncate });
  counts.flashcards = await upsertRows(db, 'flashcards', flashcards, '_id', { truncate });
  counts.audit_logs = await upsertRows(db, 'audit_logs', auditLogs, 'log_id', { truncate });

  console.log(JSON.stringify({
    success: true,
    exportDir: resolvedDir,
    truncate,
    files,
    imported: counts,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
