const mongoose = require('mongoose');

const studyQuerySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  question: {
    type: String,
    required: true
  },
  answer: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  syllabus: {
    type: String,
    default: 'Indian MBBS'
  },
  studyMode: {
    type: String,
    enum: ['conceptual', 'exam'],
    default: 'conceptual'
  },
  references: [{
    type: String
  }],
  citations: [{
    type: String
  }],
  keyPoints: [{
    type: String
  }],
  clinicalRelevance: {
    type: String
  },
  difficulty: {
    type: String,
    enum: ['basic', 'intermediate', 'advanced'],
    default: 'intermediate'
  },
  isBookmarked: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: {
    type: String
  }
}, {
  timestamps: true
});

// Index for efficient searching
studyQuerySchema.index({ user: 1, createdAt: -1 });
studyQuerySchema.index({ subject: 1, syllabus: 1 });
studyQuerySchema.index({ question: 'text', answer: 'text' });

module.exports = mongoose.model('StudyQuery', studyQuerySchema);