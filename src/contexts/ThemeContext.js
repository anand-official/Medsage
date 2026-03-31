import { createContext } from 'react';

// Centralised context so consumers don't need to import from App.js
// (which would create a circular dependency for anything App.js also imports).
export const ThemeContext = createContext({ toggleColorMode: () => {}, mode: 'dark' });
