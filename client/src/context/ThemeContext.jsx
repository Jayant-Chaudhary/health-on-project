import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/** Also read by the inline script in index.html, which applies it before first paint. */
const STORAGE_KEY = 'medbrief-theme';
const PREFERENCES = ['light', 'dark', 'system'];
const DARK_QUERY = '(prefers-color-scheme: dark)';

const ThemeContext = createContext(null);

function readPreference() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return PREFERENCES.includes(saved) ? saved : 'system';
  } catch {
    // Storage can be blocked (private mode, site data off); follow the OS then.
    return 'system';
  }
}

function systemIsDark() {
  return typeof window !== 'undefined' && window.matchMedia(DARK_QUERY).matches;
}

/**
 * Light / dark theme. The preference is the user's choice ('light', 'dark' or
 * 'system'); the resolved theme is what is actually shown. The `dark` class
 * on <html> switches every colour token in theme-tokens.css.
 */
export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(readPreference);
  const [systemDark, setSystemDark] = useState(systemIsDark);

  // Follow the OS while the preference is 'system'.
  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => setSystemDark(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const theme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const setPreference = useCallback((next) => {
    if (!PREFERENCES.includes(next)) return;
    setPreferenceState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* not persisted; the choice still applies for this visit */
    }
  }, []);

  /** Light -> dark -> system -> light. */
  const cyclePreference = useCallback(() => {
    setPreference(PREFERENCES[(PREFERENCES.indexOf(preference) + 1) % PREFERENCES.length]);
  }, [preference, setPreference]);

  const value = useMemo(
    () => ({ preference, theme, setPreference, cyclePreference }),
    [preference, theme, setPreference, cyclePreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
