import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { Providers } from './Providers';

export const metadata: Metadata = {
  title: 'Clonecast — AI Video Pipeline',
  description: 'Generate avatar + B-roll videos with your AI clone. Zero terminal needed.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-ink-800 bg-ink-900/50 backdrop-blur sticky top-0 z-10">
            <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 font-semibold">
                <div className="w-7 h-7 rounded-md bg-accent-500 flex items-center justify-center text-xs font-bold">
                  C
                </div>
                Clonecast
                <span className="pill ml-2">alpha</span>
              </Link>
              <nav className="flex items-center gap-1">
                <Link href="/" className="btn-ghost">Dashboard</Link>
                <Link href="/generate" className="btn-ghost">Generate</Link>
                <Link href="/generate-v2" className="btn-ghost flex items-center gap-1.5">
                  Generate v2
                  <span className="pill !text-[10px] !px-1.5 !py-0 bg-accent-500/15 text-accent-400 border-accent-500/30">beta</span>
                </Link>
                <Link href="/library" className="btn-ghost">Library</Link>
                <Link href="/settings" className="btn-ghost">Settings</Link>
                <Link href="/setup" className="btn-secondary ml-2">Setup</Link>
              </nav>
            </div>
          </header>
          <main className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full">{children}</main>
          <footer className="border-t border-ink-800 py-6">
            <div className="max-w-6xl mx-auto px-6 text-xs text-ink-500 flex justify-between">
              <span>Clonecast — MIT licensed</span>
              <span>
                <Link href="https://github.com/Agustin-Ruppel/clonecast" className="hover:text-white">GitHub</Link>
              </span>
            </div>
          </footer>
        </div>
        </Providers>
      </body>
    </html>
  );
}
