import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`p-2.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-muted)] hover:text-brand-primary hover:border-brand-primary/30 transition-all duration-300 shadow-sm active:scale-95 ${className}`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {theme === 'light' ? (
          <Moon className="w-5 h-5 animate-in zoom-in spin-in-90 duration-300" />
        ) : (
          <Sun className="w-5 h-5 animate-in zoom-in spin-in-180 duration-300 text-brand-accent" />
        )}
      </div>
    </button>
  );
}
