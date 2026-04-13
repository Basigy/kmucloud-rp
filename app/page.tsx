'use client';
// ============================================================
// 메인 랜딩 페이지 v3 - AI 사건 생성 + 전체 난이도
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Difficulty } from '../types/game';
import type { Case } from '../types/game';

const DIFFICULTIES: {
  id: Difficulty;
  emoji: string;
  label: string;
  apCount: number;
  description: string;
  detail: string;
  color: string;
}[] = [
  {
    id: 'easy',
    emoji: '🟢',
    label: '초급',
    apCount: 40,
    description: '용의자 3명 · 행동 포인트 40점',
    detail: '여유 있는 수사. 대부분의 장소를 탐색할 수 있습니다.',
    color: 'border-green-700/60 hover:border-green-500',
  },
  {
    id: 'medium',
    emoji: '🟡',
    label: '중급',
    apCount: 35,
    description: '용의자 5명 · 행동 포인트 35점',
    detail: '전략적 판단이 필요합니다. 모든 장소를 가기엔 포인트가 부족합니다.',
    color: 'border-yellow-700/60 hover:border-yellow-500',
  },
  {
    id: 'hard',
    emoji: '🔴',
    label: '고급',
    apCount: 30,
    description: '용의자 7명 · 행동 포인트 30점',
    detail: '빠른 판단이 생명. 놓치는 단서가 생깁니다.',
    color: 'border-red-700/60 hover:border-red-500',
  },
  {
    id: 'master',
    emoji: '💀',
    label: '마스터',
    apCount: 25,
    description: '용의자 10명 · 행동 포인트 25점',
    detail: '극한의 선택. 모든 결정이 승패를 가릅니다.',
    color: 'border-purple-700/60 hover:border-purple-500',
  },
];

const LOADING_MESSAGES = [
  '🔮 완벽한 알리바이를 구성하는 중...',
  '🎭 레드 헤링을 배치하는 중...',
  '🕵️ 범인의 동기를 만드는 중...',
  '📍 범행 현장을 설계하는 중...',
  '🔍 단서 체인을 연결하는 중...',
  '📋 용의자 명단을 작성하는 중...',
  '🧪 증거를 숨기는 중...',
  '🌃 서울 2033년을 구현하는 중...',
];

export default function HomePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Difficulty | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(0);
  const [glitch, setGlitch] = useState(false);
  const msgInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // 타이틀 글리치 효과
  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 150);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // 로딩 메시지 순환
  useEffect(() => {
    if (generating) {
      msgInterval.current = setInterval(() => {
        setLoadingMsg(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 1200);
    } else {
      if (msgInterval.current) clearInterval(msgInterval.current);
      setLoadingMsg(0);
    }
    return () => { if (msgInterval.current) clearInterval(msgInterval.current); };
  }, [generating]);

  const handleStart = async () => {
    if (!selected || generating) return;
    setGenerating(true);

    try {
      // AI로 새 사건 생성
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficulty: selected }),
      });

      if (!res.ok) throw new Error('사건 생성 실패');

      const { caseId, caseData } = await res.json() as { caseId: string; caseData: Case };

      // sessionStorage에 저장 (게임 페이지에서 읽음)
      sessionStorage.setItem(`verdict_case_${caseId}`, JSON.stringify(caseData));
      localStorage.setItem('verdict_difficulty', selected);

      router.push(`/game/${caseId}`);
    } catch (err) {
      console.error('[start]', err);
      setGenerating(false);
      alert('사건 생성에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // ── 로딩 오버레이 ────────────────────────────────────────
  if (generating) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="fixed inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(100,30,30,0.25) 0%, transparent 70%)' }}
        />
        <div className="relative text-center max-w-sm mx-auto px-6">
          {/* 스피너 */}
          <div className="w-16 h-16 mx-auto mb-8 relative">
            <div className="absolute inset-0 border-2 border-red-900 rounded-full" />
            <div className="absolute inset-0 border-t-2 border-red-500 rounded-full animate-spin" />
            <div className="absolute inset-2 border-t border-red-700/50 rounded-full animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
            <div className="absolute inset-0 flex items-center justify-center text-xl">🕵️</div>
          </div>

          <h2 className="text-white font-black text-2xl mb-2">AI가 사건을 생성 중</h2>
          <p className="text-zinc-400 text-sm mb-8">매번 새로운 범인과 스토리가 만들어집니다</p>

          {/* 로딩 메시지 */}
          <div className="bg-zinc-900/80 border border-zinc-700 rounded-2xl px-5 py-4 min-h-[60px] flex items-center justify-center">
            <p key={loadingMsg} className="text-zinc-300 text-sm animate-fade-in">
              {LOADING_MESSAGES[loadingMsg]}
            </p>
          </div>

          <p className="text-zinc-700 text-xs mt-6 font-mono">
            CLAUDE 3.5 SONNET · SEOUL 2033
          </p>
        </div>
      </div>
    );
  }

  // ── 메인 화면 ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* 배경 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(120,40,40,0.15) 0%, transparent 60%)' }}
        />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 3px)' }}
        />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 py-10 sm:py-14">

        {/* ── 상단 네비게이션 ────────────────────────── */}
        <div className="flex justify-end mb-6">
          <Link
            href="/leaderboard"
            className="flex items-center gap-1.5 text-zinc-500 hover:text-yellow-400 text-sm transition-colors"
          >
            <span>🏆</span>
            <span>명탐정 랭킹</span>
          </Link>
        </div>

        {/* ── 타이틀 ───────────────────────────────── */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-red-950/30 border border-red-800/40 rounded-full px-4 py-1.5 text-red-400 text-xs font-mono tracking-widest mb-8">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            SEOUL 2033 · POWERED BY CLAUDE AI
          </div>

          <h1 className={`text-6xl sm:text-7xl font-black tracking-tight mb-1 transition-all duration-75 ${
            glitch ? 'translate-x-0.5 opacity-80' : ''
          }`}>
            <span className="text-white">THE</span>{' '}
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' }}
            >
              VERDICT
            </span>
          </h1>

          <p className="text-zinc-400 text-lg font-medium tracking-[0.15em] mb-1">
            AI Detective Game
          </p>
          <p className="text-zinc-600 text-sm italic">
            매 순간 선택이 진실을 결정합니다
          </p>
        </div>

        {/* ── AI 생성 배지 ─────────────────────────── */}
        <div className="bg-gradient-to-r from-purple-950/40 to-blue-950/40 border border-purple-800/40 rounded-2xl p-4 mb-8 text-center">
          <p className="text-purple-300 text-sm font-semibold mb-1">
            ✨ 매번 새로운 사건이 생성됩니다
          </p>
          <p className="text-zinc-500 text-xs">
            Claude AI가 새로운 범인·동기·증거·장소를 생성합니다. 같은 사건은 두 번 없습니다.
          </p>
        </div>

        {/* ── 난이도 선택 ──────────────────────────── */}
        <div className="mb-8">
          <h2 className="text-zinc-500 text-xs uppercase tracking-widest text-center mb-4">
            난이도 선택
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DIFFICULTIES.map(diff => {
              const isSelected = selected === diff.id;
              return (
                <button
                  key={diff.id}
                  onClick={() => setSelected(diff.id)}
                  className={`relative text-left p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? `bg-zinc-800 border-white shadow-2xl shadow-white/5`
                      : `bg-zinc-900/60 ${diff.color}`
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{diff.emoji}</span>
                    <div>
                      <h3 className="text-white font-bold text-lg">{diff.label}</h3>
                      <p className="text-zinc-500 text-xs">{diff.description}</p>
                    </div>
                  </div>

                  {/* AP 게이지 */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-zinc-600 mb-1">
                      <span>행동 포인트</span>
                      <span className="font-mono text-yellow-600">{diff.apCount}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-700 to-yellow-400 rounded-full"
                        style={{ width: `${(diff.apCount / 40) * 100}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-zinc-600 text-xs leading-relaxed">{diff.detail}</p>

                  {isSelected && (
                    <div className="absolute inset-0 rounded-2xl border-2 border-white pointer-events-none" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 시작 버튼 ─────────────────────────────── */}
        <div className="text-center mb-12">
          <button
            onClick={handleStart}
            disabled={!selected}
            className={`px-14 py-4 rounded-2xl font-black text-xl transition-all duration-200 ${
              selected
                ? 'bg-red-700 hover:bg-red-600 text-white active:scale-95 shadow-2xl shadow-red-900/50'
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
            }`}
          >
            {selected ? '🕵️ 수사 시작' : '난이도를 선택하세요'}
          </button>
        </div>

        {/* ── 행동 포인트 시스템 소개 ───────────────── */}
        <div className="bg-zinc-900/60 border border-zinc-700 rounded-2xl p-5 mb-10">
          <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
            <span className="text-yellow-400">⭐</span> 행동 포인트 시스템
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: '🚶', label: '장소 이동', cost: '-1점' },
              { icon: '🔎', label: '정밀 조사', cost: '-2점' },
              { icon: '💬', label: '본격 심문', cost: '-3점' },
              { icon: '⚖️', label: 'AP 소진 시', cost: '강제 기소' },
            ].map(item => (
              <div key={item.label} className="bg-zinc-800/50 rounded-xl p-3 text-center">
                <div className="text-2xl mb-1">{item.icon}</div>
                <p className="text-zinc-400 text-xs">{item.label}</p>
                <p className={`font-mono font-bold text-sm mt-1 ${
                  item.cost === '강제 기소' ? 'text-red-400' : 'text-yellow-400'
                }`}>{item.cost}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 게임 흐름 ─────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {[
            { step: '01', icon: '🔍', title: '장소 탐색', desc: '장소를 이동하며 증거를 조사. 각 행동은 포인트를 소모합니다.' },
            { step: '02', icon: '🎤', title: '용의자 심문', desc: '용의자를 만나 질문하고 증거를 제시. 긴장도를 높이세요.' },
            { step: '03', icon: '⚖️', title: '범인 지목', desc: 'AP 소진 전 자신감이 생겼을 때 범인·동기·방법을 지목합니다.' },
          ].map(item => (
            <div key={item.step} className="text-center">
              <div className="text-zinc-700 font-mono text-xs tracking-widest mb-2">{item.step}</div>
              <div className="text-3xl mb-2">{item.icon}</div>
              <h3 className="text-white font-semibold text-sm mb-1">{item.title}</h3>
              <p className="text-zinc-600 text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* 푸터 */}
        <div className="text-center text-zinc-800 text-xs font-mono">
          NEXT.JS 14 · AWS BEDROCK CLAUDE · DYNAMODB · SEOUL 2033
        </div>
      </div>
    </div>
  );
}
