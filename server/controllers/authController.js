const UserProfile = require('../models/UserProfile');

class AuthController {

    // POST /auth/user
    // Called by frontend after Firebase Google Sign-In to sync UserProfile
    async syncUser(req, res, next) {
        try {
            const { uid, email, displayName, photoURL } = req.body;

            if (!uid || !email) {
                return res.status(400).json({ success: false, error: 'uid and email are required' });
            }

            // Upsert user profile
            const user = await UserProfile.findOneAndUpdate(
                { uid },
                {
                    $set: {
                        email,
                        displayName: displayName || email.split('@')[0],
                        photoURL: photoURL || '',
                        lastLoginAt: new Date()
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

            const user = await UserProfile.findOneAndUpdate(
                { uid },
                {
                    $set: {
                        ...(displayName && { displayName }),
                        ...(mbbs_year && { mbbs_year: parseInt(mbbs_year, 10) }),
                        ...(college && { college }),
                        ...(country && { country }),
                        ...(onboarded !== undefined && { onboarded })
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

            const StudyPlan = require('../models/StudyPlan');

            // Cascade delete
            await StudyPlan.deleteOne({ uid });
            const deletedUser = await UserProfile.findOneAndDelete({ uid });

            if (!deletedUser) {
                return res.status(404).json({ success: false, error: 'User profile not found' });
            }

            res.json({ success: true, message: 'Account and associated data deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AuthController();
