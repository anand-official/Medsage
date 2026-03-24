const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema({
    resourceType: { type: String, enum: ['gold_standard', 'video', 'reference', 'textbook'] },
    platform: { type: String },
    title: { type: String },
    author: { type: String },
    note: { type: String },
    type: { type: String },
    freeLinks: [{ name: String, url: String }]
}, { _id: false });

const TaskSchema = new mongoose.Schema({
    id: { type: String, required: true },
    text: { type: String, required: true },
    topic: { type: String },
    type: { type: String, enum: ['learning', 'review', 'mock_exam'], default: 'learning' },
    completed: { type: Boolean, default: false },
    resources: { type: [ResourceSchema], default: [] }
});

const DailyPlanSchema = new mongoose.Schema({
    date: { type: String, required: true }, // YYYY-MM-DD
    tasks: [TaskSchema],
    completion_rate: { type: Number, default: 0 }
});

const GoalSchema = new mongoose.Schema({
    id: { type: String, required: true },
    text: { type: String, required: true },
    due: { type: String }, // YYYY-MM-DD
    done: { type: Boolean, default: false }
});

const StudyPlanSchema = new mongoose.Schema({
    uid: { type: String, required: true, unique: true },
    mbbs_year: { type: Number },
    exam_date: { type: Date },
    subjects_selected: [{ type: String }],
    weak_topics: [{ type: String }],
    strong_topics: [{ type: String }],

    advisory_text: { type: String },

    daily_plan: [DailyPlanSchema],

    goals: {
        daily: [GoalSchema],
        weekly: [GoalSchema],
        monthly: [GoalSchema],
        quarterly: [GoalSchema]
    },

    streak: {
        current: { type: Number, default: 0 },
        longest: { type: Number, default: 0 },
        last_checkin: { type: Date }
    },

    analytics: {
        total_tasks: { type: Number, default: 0 },
        completed: { type: Number, default: 0 },
        pace_factor: { type: Number, default: 1.0 }
    }
}, { timestamps: true });

module.exports = mongoose.model('StudyPlan', StudyPlanSchema);
