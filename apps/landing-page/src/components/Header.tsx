export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-cream/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-center px-5 sm:px-6">
        <a href="#top" className="group flex items-center gap-1.5 active:scale-95">
          <span className="text-xl font-extrabold tracking-tight text-ink">Seego</span>
          <span className="h-2 w-2 rounded-full bg-accent transition group-hover:scale-125" />
        </a>
      </div>
    </header>
  );
}
