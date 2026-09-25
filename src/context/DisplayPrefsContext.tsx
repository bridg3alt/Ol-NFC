'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Per-device display preferences: text size and high contrast. They live in
// localStorage rather than Firestore because they describe this phone's
// screen and must work before anyone signs in (on the landing page too).

export type TextSize = 'normal' | 'large' | 'xlarge';

interface DisplayPrefs {
  textSize: TextSize;
  highContrast: boolean;
}

interface DisplayPrefsContextType extends DisplayPrefs {
  setTextSize: (size: TextSize) => void;
  setHighContrast: (on: boolean) => void;
}

const STORAGE_KEY = 'olvia.display';
const DEFAULTS: DisplayPrefs = { textSize: 'normal', highContrast: false };

const DisplayPrefsContext = createContext<DisplayPrefsContextType | undefined>(undefined);

function load(): DisplayPrefs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function DisplayPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<DisplayPrefs>(DEFAULTS);

  useEffect(() => {
    setPrefs(load());
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('text-size-large', prefs.textSize === 'large');
    root.classList.toggle('text-size-xlarge', prefs.textSize === 'xlarge');
    root.classList.toggle('high-contrast', prefs.highContrast);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* private mode: preferences just won't persist */
    }
  }, [prefs]);

  return (
    <DisplayPrefsContext.Provider
      value={{
        ...prefs,
        setTextSize: (textSize) => setPrefs((p) => ({ ...p, textSize })),
        setHighContrast: (highContrast) => setPrefs((p) => ({ ...p, highContrast })),
      }}
    >
      {children}
    </DisplayPrefsContext.Provider>
  );
}

export function useDisplayPrefs() {
  const context = useContext(DisplayPrefsContext);
  if (context === undefined) {
    throw new Error('useDisplayPrefs must be used within a DisplayPrefsProvider');
  }
  return context;
}
