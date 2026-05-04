import React, { createContext, useContext } from 'react';

const GoogleOAuthContext = createContext({
  clientId: '',
  loading: false,
  error: '',
  unavailable: false,
});

export function GoogleOAuthRuntimeProvider({ value, children }) {
  return (
    <GoogleOAuthContext.Provider value={value}>
      {children}
    </GoogleOAuthContext.Provider>
  );
}

export function useGoogleOAuthRuntime() {
  return useContext(GoogleOAuthContext);
}
