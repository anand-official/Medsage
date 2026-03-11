const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
    uid: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true
    },
    displayName: {
        type: String,
        default: ''
    },
    photoURL: {
        type: String,
        default: ''
    },
    onboarded: {
        type: Boolean,
        default: false
    },
    // Demographics (from Post-Login Onboarding)
    mbbs_year: {
        type: Number,
        min: 1,
        max: 5,
        default: null
    },
    college: {
        type: String,
        default: ''
    },
    country: {
        type: String,
        default: 'India'
    },
    // Study Preferences (from Study Planner Setup)
    topics_weak: [{
        type: String
    }],
    topics_strong: [{
        type: String
    }],
    lastLoginAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('UserProfile', userProfileSchema);
