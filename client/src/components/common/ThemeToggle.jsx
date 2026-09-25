import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';

const LABEL = {
  light: { icon: Sun, text: 'Light theme', next: 'dark' },
  dark: { icon: Moon, text: 'Dark theme', next: 'system' },
  system: { icon: Monitor, text: 'System theme', next: 'light' },
};

/** One button that steps through light, dark and the device's own setting. */
export function ThemeToggle({ className = '' }) {
  const { preference, cyclePreference } = useTheme();
  const { icon: IconComponent, text, next } = LABEL[preference];

  return (
    <button
      type="button"
      onClick={cyclePreference}
      aria-label={`${text}. Switch to ${next} theme`}
      title={`${text} — click for ${next}`}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-ink-2
                  transition-colors hover:bg-subcanvas hover:text-ink ${className}`}
    >
      <IconComponent className="h-[18px] w-[18px]" />
    </button>
  );
}

export default ThemeToggle;
