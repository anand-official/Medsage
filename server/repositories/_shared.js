'use strict';

const { getSupabaseAdmin } = require('../lib/supabaseAdmin');

function getDb() {
  return getSupabaseAdmin();
}

function unwrap(result, context) {
  if (result.error) {
    throw new Error(`${context}: ${result.error.message}`);
  }
  return result.data;
}

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function cloneJson(value, fallback) {
  if (value === undefined) return fallback;
  return JSON.parse(JSON.stringify(value));
}

function defineHiddenMethod(target, name, fn) {
  Object.defineProperty(target, name, {
    value: fn,
    enumerable: false,
    configurable: true,
    writable: true,
  });
}

module.exports = {
  cloneJson,
  defineHiddenMethod,
  getDb,
  toIso,
  unwrap,
};
