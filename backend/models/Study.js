const mongoose = require('mongoose');

const studySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dailyPlan: [{
    date: {
      type: Date,
      required: true
    },
    subjects: [{
      name: String,
      topics: [{
        name: String,
        duration: Number,
        completed: {
          type: Boolean,
          default: false
        }
      }]
    }]
  }],
  progress: {
    completedTopics: {
      type: Number,
      default: 0
    },
    totalTopics: {
      type: Number,
      default: 0
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
studySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Study', studySchema); 