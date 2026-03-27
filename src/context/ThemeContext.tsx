"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "wusha-theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function isTheme(value: string | null | undefined): value is Theme {
  return value === "light" || value === "dark";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
}

function resolveTheme(): Theme {
  if (typeof document !== "undefined") {
    const current = document.documentElement.getAttribute("data-theme");
    if (isTheme(current)) {
      return current;
    }
  }

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isTheme(stored)) {
        return stored;
      }
    } catch {
      // Ignore localStorage access failures and fall back to system preference.
    }

    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
  }

  return "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const initialTheme = resolveTheme();
    setThemeState(initialTheme);
    applyTheme(initialTheme);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleStorage = () => {
      const nextTheme = resolveTheme();
      setThemeState(nextTheme);
      applyTheme(nextTheme);
    };
    const handleMedia = (event: MediaQueryListEvent) => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (isTheme(stored)) {
          return;
        }
      } catch {
        // Ignore localStorage access failures and keep using system preference.
      }

      const nextTheme: Theme = event.matches ? "dark" : "light";
      setThemeState(nextTheme);
      applyTheme(nextTheme);
    };

    window.addEventListener("storage", handleStorage);
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleMedia);
    } else {
      media.addListener(handleMedia);
    }

    return () => {
      window.removeEventListener("storage", handleStorage);
      if (typeof media.removeEventListener === "function") {
        media.removeEventListener("change", handleMedia);
      } else {
        media.removeListener(handleMedia);
      }
    };
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // Ignore localStorage access failures. The DOM theme has already been updated.
    }
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
