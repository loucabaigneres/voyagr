import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { authClient } from '../lib/auth-client';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const { data: session } = authClient.useSession();

  return (
    <div className="min-h-screen bg-[#F2EDE8] text-[#1a1a1a] flex flex-col font-sans">
      {session?.user && (
        <header className="sticky top-0 z-50 border-b border-[#ddd] bg-[#F2EDE8]/90 backdrop-blur-md px-4 py-3 sm:px-8">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <Link
              to="/discovery"
              className="text-xl font-black tracking-tight text-[#1a1a1a] hover:opacity-80 transition"
            >
              Voyagr<span className="text-[#FF4D4D]">.</span>
            </Link>

            <nav className="flex items-center gap-3">
              <Link
                to="/profile"
                className="flex items-center gap-2 rounded-full border border-[#ddd] bg-white px-4 py-2 text-sm font-semibold text-[#1a1a1a] shadow-sm hover:border-[#FF4D4D] transition active:scale-95"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FF4D4D] text-xs font-bold text-white uppercase">
                  {session.user.name?.charAt(0) || session.user.email?.charAt(0) || 'U'}
                </div>
                <span>Mon Profil</span>
              </Link>
            </nav>
          </div>
        </header>
      )}

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
