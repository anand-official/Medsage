const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  displayName: {
    type: String,
    required: true
  },
  photoURL: {
    type: String
  },
  firebaseUid: {
    type: String,
    required: true,
    unique: true
  },
  studyPreferences: {
    examDate: Date,
    selectedSubjects: [String],
    weakSubjects: [String]
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema); 