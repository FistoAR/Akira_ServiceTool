import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { Sun, Moon } from "lucide-react";

export default function ThemeSelector() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
      className="flex items-center gap-2 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-full px-3.5 py-1.5 hover:shadow-md hover:border-blue-500 dark:hover:border-blue-400 text-slate-800 dark:text-slate-100 transition-all cursor-pointer font-bold text-xs"
    >
      {isDark ? (
        <>
          <Moon className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span className="hidden sm:inline">Dark</span>
        </>
      ) : (
        <>
          <Sun className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span className="hidden sm:inline">Light</span>
        </>
      )}
    </button>
  );
}
