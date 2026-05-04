const userProfileRepo = require('../repositories/userProfileRepo');
const { invalidateLearnerContext } = require('../services/learnerContextCache');
const studyPlanRepo = require('../repositories/studyPlanRepo');
const chatSessionRepo = require('../repositories/chatSessionRepo');
const flashcardRepo = require('../repositories/flashcardRepo');
const auditLogRepo = require('../repositories/auditLogRepo');
const { GOOGLE_CLIENT_ID } = require('../config');

function normalizeGoogleClientId(value) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return null;
    const normalized = trimmed.toLowerCase();
    if (['fill_in', 'your_google_oauth_client_id_here', 'your_google_client_id_here'].includes(normalized)) {
        return null;
    }
    return trimmed;
}

class AuthController {
    async getPublicConfig(req, res, next) {
        try {
            const googleClientId = normalizeGoogleClientId(GOOGLE_CLIENT_ID);
            res.set('Cache-Control', 'no-store');
            res.json({
                success: true,
                data: {
                    googleClientId,
                    googleAuthEnabled: Boolean(googleClientId),
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/auth/user
    // Called by the frontend after Google OAuth sign-in to sync the user profile.
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
            const existingUser = await userProfileRepo.findByUid(uid);
            const user = await userProfileRepo.updateByUid(uid, {
                uid,
                email,
                lastLoginAt: new Date(),
                ...(!existingUser ? {
                    displayName: displayName || email.split('@')[0],
                    photoURL: photoURL || '',
                    country: 'India',
                } : {}),
            }, { upsert: true });

            res.json({
                success: true,
                data: user
            });

        } catch (error) {
            next(error);
        }
    }

    // GET /api/v1/auth/profile
    // Fetch current user's profile - REQUIRES AUTH
    async getProfile(req, res, next) {
        try {
            const uid = req.user?.uid;

            if (!uid) {
                return res.status(401).json({ success: false, error: 'Unauthorized: No UID provided' });
            }

            const user = await userProfileRepo.findByUid(uid);

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

    // PUT /api/v1/auth/profile
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

            const user = await userProfileRepo.updateByUid(uid, updates);

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

    // PUT /api/v1/auth/preferences (Used by Study Planner setup) - REQUIRES AUTH
    // Update weak/strong subjects and exam date
    async updatePreferences(req, res, next) {
        try {
            const uid = req.user?.uid;

            if (!uid) {
                return res.status(401).json({ success: false, error: 'Unauthorized: No UID provided' });
            }

            const { subjects_weak, subjects_strong, topics_weak, topics_strong } = req.body;

            const user = await userProfileRepo.updateByUid(uid, {
                ...(topics_weak ?? subjects_weak) && { topics_weak: topics_weak ?? subjects_weak },
                ...(topics_strong ?? subjects_strong) && { topics_strong: topics_strong ?? subjects_strong }
            });

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

    // DELETE /api/v1/auth/profile - REQUIRES AUTH
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
                studyPlanRepo.deleteByUid(uid),
                userProfileRepo.deleteByUid(uid),
                chatSessionRepo.deleteByUser(uid),
                flashcardRepo.deleteByUser(uid),
                auditLogRepo.deleteByUser(uid),
            ]);

            if (
                !deletedUser
                && !deletedStudyPlan
                && deletedSessions.length === 0
                && deletedFlashcards.length === 0
                && deletedAuditLogs.length === 0
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
