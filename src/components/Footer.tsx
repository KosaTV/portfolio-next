export default function Footer() {
  return (
    <footer className="relative py-8 border-t border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="text-xs text-[var(--text-muted)] tracking-wider">
          <span className="text-[var(--accent-cyan)]">&copy;</span> {new Date().getFullYear()} Jacob Chodubski
        </span>
        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.3em]">
          Designed & built with <span className="text-[var(--accent-amber)]">precision</span>
        </span>
      </div>
    </footer>
  );
}
