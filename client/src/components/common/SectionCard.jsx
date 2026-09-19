import { Icon } from './Icon.jsx';

/** Card with a titled header row — the base container for dashboard panels. */
export function SectionCard({ icon, title, subtitle, action, children, className = '', bodyClassName = '' }) {
  return (
    <section className={`card flex min-h-0 flex-col ${className}`}>
      <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          {icon && (
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-subcanvas text-cypress">
              <Icon name={icon} size={16} />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="truncate font-display text-head-sm text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-body-sm text-ink-3">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export default SectionCard;
