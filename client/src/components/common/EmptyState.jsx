import { Icon } from './Icon.jsx';

export function EmptyState({ icon = 'notes', title, description }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-subcanvas text-ink-3">
        <Icon name={icon} size={18} />
      </span>
      <p className="font-display text-label-lg text-ink-2">{title}</p>
      {description && <p className="max-w-xs text-body-sm text-ink-3">{description}</p>}
    </div>
  );
}

export default EmptyState;
