// frontend/app/layout.tsx

import type { Metadata } from 'next';
import { Inter, Sora } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MemoryMint — Pay-per-Query AI Second Brain',
  description: 'Upload your documents. Query them in natural language. Pay $0.001 per query with USDC.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${sora.variable} font-sans bg-[#0b1326] text-[#dae2fd] min-h-screen antialiased`}>
        <Providers>
          {children}
        </Providers>
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: { background: '#171f33', border: '1px solid rgba(255,255,255,0.1)', color: '#dae2fd' }
          }}
        />
      </body>
    </html>
  );
}
