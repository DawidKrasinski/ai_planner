export function Progress({ value, color = "violet" }: { value: number; color?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="progress">
      <i className={color} style={{ width: `${clamped}%` }} />
    </div>
  );
}
