import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Verdict: 72시간의 함정',
  description: 'AI 기반 동적 추리 게임. 72시간 안에 살인 사건의 범인을 찾아라.',
  keywords: ['추리게임', '미스터리', 'AI', 'Next.js'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="dark">
      <body className="bg-zinc-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
