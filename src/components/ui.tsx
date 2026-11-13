export {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/meridian/states";

/** Legacy field helpers kept for any remaining forms outside Meridian views. */
export function Button({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`btn primary ${className ?? ""}`} {...props} />;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export const fieldClass = "";
