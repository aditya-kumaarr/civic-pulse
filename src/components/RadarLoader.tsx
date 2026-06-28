/**
 * Branded radar-pin loader. Same animation everywhere; each page passes its
 * own message via loading.tsx.
 */
export function RadarLoader({ message }: { message: string }) {
  return (
    <div
      className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-4 text-center"
      style={{ background: "var(--bg-canvas)" }}
    >
      <div className="radar-wrap">
        <span className="radar-ring" />
        <span className="radar-ring" />
        <span className="radar-ring" />
        <span className="radar-pin" />
      </div>
      <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
        {message}
      </p>
    </div>
  );
}
