// Firebase removed. Google OAuth is handled via @react-oauth/google.
// This file exports a no-op stub so legacy imports don't cause module errors
// during the transition. api.js no longer reads auth.currentUser — it reads
// from localStorage instead.

export const auth = {
  currentUser: null,
};

export const googleProvider = null;
export const analytics = null;
export default null;
