'use strict';

/**
 * Central server configuration.
 * All process.env reads are collected here so that:
 *  - every default lives in one place
 *  - tests can override a single require() rather than patching process.env in many files
 */
module.exports = {
    GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash-preview-04-17',
};
