const UserProfile = require('../models/UserProfile');
const { invalidateLearnerContext } = require('../services/learnerContextCache');
const StudyPlan = require('../models/StudyPlan');
const ChatSession = require('../models/ChatSession');
const Flashcard = require('../models/Flashcard');
const AuditLog = require('../models/AuditLog');

class AuthController {

    // POST /auth/user
    // Called by frontend after Firebase Google Sign-In to sync UserProfile
    async syncUser(req, res, next) {
        try {
            const {
                uid,
                email,
                displayName,
                photoURL,
            } = req.user || {};

            if (!uid || !email) {
                return res.status(400).json({ success: false, error: 'uid and email are required' });
            }

            // Upsert user profile.
            // Only set displayName/photoURL on initial creation ($setOnInsert) so that
            // custom names set during onboarding are not overwritten on every login.
            const user = await UserProfile.findOneAndUpdate(
                { uid },
                {
                    $set: {
                        email,
                        lastLoginAt: new Date()
                    },
                    $setOnInsert: {
                        displayName: displayName || email.split('@')[0],
                        photoURL: photoURL || '',
                    }
                },
                { new: true, upsert: true }
            );

            res.json({
                success: true,
                data: user
            });

        } catch (error) {
            next(error);
        }
    }

    // GET /auth/profile
    // Fetch current user's profile - REQUIRES AUTH
    async getProfile(req, res, next) {
        try {
            const uid = req.user?.uid;

            if (!uid) {
                return res.status(401).json({ success: false, error: 'Unauthorized: No UID provided' });
            }

            const user = await UserProfile.findOne({ uid });

            if (!user) {
                return res.status(404).json({ success: false, error: 'User profile not found' });
            }

            invalidateLearnerContext(uid);

            res.json({
                success: true,
                data: user
            });

        } catch (error) {
            next(error);
        }
    }

    // PUT /auth/profile
    // Update onboarding data (Name, Year, College, Country) - REQUIRES AUTH
    async updateProfile(req, res, next) {
        try {
            const uid = req.user?.uid;

            if (!uid) {
                return res.status(401).json({ success: false, error: 'Unauthorized: No UID provided' });
            }

            const { displayName, mbbs_year, college, country, onboarded } = req.body;
            const updates = {};

            if (displayName !== undefined) {
                updates.displayName = typeof displayName === 'string' ? displayName.trim() : '';
            }

            if (mbbs_year !== undefined) {
                const rawYear = String(mbbs_year ?? '').trim();
                if (!rawYear) {
                    updates.mbbs_year = null;
                } else {
                    const parsed = parseInt(rawYear, 10);
                    if (isNaN(parsed) || parsed < 1 || parsed > 5) {
                        return res.status(400).json({ success: false, error: 'mbbs_year must be between 1 and 5' });
                    }
                    updates.mbbs_year = parsed;
                }
            }

            if (college !== undefined) {
                updates.college = typeof college === 'string' ? college.trim() : '';
            }

            if (country !== undefined) {
                const normalizedCountry = typeof country === 'string' ? country.trim() : '';
                updates.country = normalizedCountry || 'India';
            }

            if (onboarded !== undefined) {
                updates.onboarded = Boolean(onboarded);
            }

            const user = await UserProfile.findOneAndUpdate(
                { uid },
                {
                    $set: updates
                },
                { new: true, runValidators: true }
            );

            if (!user) {
                return res.status(404).json({ success: false, error: 'User profile not found' });
            }

            invalidateLearnerContext(uid);

            res.json({
                success: true,
                data: user
            });

        } catch (error) {
            next(error);
        }
    }

    // PUT /auth/preferences (Used by Study Planner setup) - REQUIRES AUTH
    // Update weak/strong subjects and exam date
    async updatePreferences(req, res, next) {
        try {
            const uid = req.user?.uid;

            if (!uid) {
                return res.status(401).json({ success: false, error: 'Unauthorized: No UID provided' });
            }

            const { subjects_weak, subjects_strong, topics_weak, topics_strong } = req.body;

            const user = await UserProfile.findOneAndUpdate(
                { uid },
                {
                    $set: {
                        ...(topics_weak ?? subjects_weak) && { topics_weak: topics_weak ?? subjects_weak },
                        ...(topics_strong ?? subjects_strong) && { topics_strong: topics_strong ?? subjects_strong }
                    }
                },
                { new: true }
            );

            if (!user) {
                return res.status(404).json({ success: false, error: 'User profile not found' });
            }

            res.json({
                success: true,
                data: user
            });

        } catch (error) {
            next(error);
        }
    }

    // DELETE /auth/profile - REQUIRES AUTH
    async deleteAccount(req, res, next) {
        try {
            const uid = req.user?.uid;

            if (!uid) {
                return res.status(401).json({ success: false, error: 'Unauthorized: No UID provided' });
            }

            const [
                deletedStudyPlan,
                deletedUser,
                deletedSessions,
                deletedFlashcards,
                deletedAuditLogs,
            ] = await Promise.all([
                StudyPlan.deleteOne({ uid }),
                UserProfile.findOneAndDelete({ uid }),
                ChatSession.deleteMany({ user_id: uid }),
                Flashcard.deleteMany({ user_id: uid }),
                AuditLog.deleteMany({ user_id: uid }),
            ]);

            if (
                !deletedUser
                && deletedStudyPlan.deletedCount === 0
                && deletedSessions.deletedCount === 0
                && deletedFlashcards.deletedCount === 0
                && deletedAuditLogs.deletedCount === 0
            ) {
                return res.status(404).json({ success: false, error: 'User profile not found' });
            }

            invalidateLearnerContext(uid);

            res.json({
                success: true,
                message: 'Account and associated data deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AuthController();
