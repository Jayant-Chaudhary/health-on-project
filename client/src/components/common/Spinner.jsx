export function Spinner({ size = 18, className = '' }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      style={{ width: size, height: size }}
      className={`inline-block animate-spin rounded-full border-2 border-line border-t-cypress ${className}`}
    />
  );
}

export default Spinner;
