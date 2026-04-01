const mongoose = require('mongoose');

/**
 * ChatSession — persists Cortex conversation sessions per user.
 *
 * Replaces the browser-local `medsage_chat_sessions` localStorage store
 * with server-side MongoDB storage so sessions are:
 *   - Persistent across devices
 *   - Not lost when localStorage is cleared
 *   - Cap-managed (max 50 sessions per user via TTL + count guard)
 *
 * The frontend still writes to localStorage as an offline cache.
 * On load, server sessions are merged and take precedence.
 */

const MessageSchema = new mongoose.Schema({
    role:       { type: String, enum: ['user', 'ai'], required: true },
    text:       { type: String, required: true, maxlength: 10000 },
    timestamp:  { type: Number, default: () => Date.now() },
    // Optional metadata attached to AI messages
    meta: {
        topic_id:   String,
        subject:    String,
        confidence: Number,
        pipeline:   String,
    },
    // Rich assistant payload retained so restored sessions keep follow-up context.
    response: mongoose.Schema.Types.Mixed,
}, { _id: false });

const ChatSessionSchema = new mongoose.Schema({
    user_id:    { type: String, required: true, index: true },
    session_id: { type: String, required: true },            // client-generated UUID
    title:      { type: String, default: 'Untitled session', maxlength: 120 },
    messages:   { type: [MessageSchema], default: [] },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Compound unique index — one session_id per user
ChatSessionSchema.index({ user_id: 1, session_id: 1 }, { unique: true });

// TTL index — auto-delete sessions older than 90 days
ChatSessionSchema.index({ updated_at: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('ChatSession', ChatSessionSchema);
