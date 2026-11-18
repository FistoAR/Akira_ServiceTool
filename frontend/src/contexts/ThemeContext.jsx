import React, { createContext, useContext, useState, useEffect } from "react";

export const THEMES = [
  { id: "light", name: "Light Theme", icon: "☀️", desc: "Crisp, clear, high-contrast day theme" },
  { id: "dark", name: "Dark Theme", icon: "🌙", desc: "Deep soothing dark theme for low light" },
];

const ThemeContext = createContext({
  theme: "light",
  setTheme: () => {},
  themes: THEMES,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem("service_tool_theme") || "light";
  });

  const setTheme = (newTheme) => {
    const validTheme = newTheme === "dark" ? "dark" : "light";
    setThemeState(validTheme);
    localStorage.setItem("service_tool_theme", validTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-dark", "dark");
    if (theme === "dark") {
      root.classList.add("theme-dark", "dark");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.add("theme-light");
      root.setAttribute("data-theme", "light");
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
