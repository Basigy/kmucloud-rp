'use client';
// ============================================================
// 리더보드 페이지 - 명탐정 랭킹
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { ScoreEntry } from '../api/leaderboard/route';

type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard' | 'master';

const DIFF_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  easy:   { label: '초급',   emoji: '🟢', color: 'text-green-400' },
  medium: { label: '중급',   emoji: '🟡', color: 'text-yellow-400' },
  hard:   { label: '고급',   emoji: '🔴', color: 'text-red-400' },
  master: { label: '마스터', emoji: '💀', color: 'text-purple-400' },
};

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [filter, setFilter] = useState<DifficultyFilter>('all');
  const [loading, setLoading] = useState(true);

  const fetchScores = useCallback(async (difficulty: DifficultyFilter) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?difficulty=${difficulty}`);
      const data = await res.json() as { scores: ScoreEntry[] };
      setScores(data.scores ?? []);
    } catch {
      setScores([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScores(filter);
  }, [filter, fetchScores]);

  const handleFilter = (d: DifficultyFilter) => {
    setFilter(d);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* 배경 */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(180,130,0,0.08) 0%, transparent 60%)' }}
      />

      <div className="relative max-w-3xl mx-auto px-4 py-10">
        {/* ── 헤더 ──────────────────────────────────── */}
        <div className="flex items-center justify-between mb-10">
          <Link
            href="/"
            className="text-zinc-500 hover:text-white text-sm transition-colors flex items-center gap-1"
          >
            ← 홈으로
          </Link>
          <div className="text-zinc-600 text-xs font-mono">THE VERDICT</div>
        </div>

        <div className="text-center mb-10">
          <div className="text-6xl mb-3">🏆</div>
          <h1 className="text-4xl font-black text-white mb-1">명탐정 랭킹</h1>
          <p className="text-zinc-500 text-sm">최고의 탐정들이 남긴 기록</p>
        </div>

        {/* ── 난이도 필터 ───────────────────────────── */}
        <div className="flex gap-2 justify-center flex-wrap mb-8">
          {(['all', 'easy', 'medium', 'hard', 'master'] as DifficultyFilter[]).map(d => (
            <button
              key={d}
              onClick={() => handleFilter(d)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                filter === d
                  ? 'bg-white text-black'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {d === 'all' ? '전체' : (
                <>
                  {DIFF_CONFIG[d]?.emoji} {DIFF_CONFIG[d]?.label}
                </>
              )}
            </button>
          ))}
        </div>

        {/* ── 랭킹 테이블 ──────────────────────────── */}
        {loading ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-zinc-700 border-t-yellow-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-500 text-sm">랭킹을 불러오는 중...</p>
          </div>
        ) : scores.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
            <div className="text-4xl mb-3">🕵️</div>
            <p className="text-zinc-400 text-lg font-semibold mb-1">아직 기록이 없습니다</p>
            <p className="text-zinc-600 text-sm mb-6">첫 번째 탐정이 되어보세요!</p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-red-700 hover:bg-red-600 text-white font-bold rounded-xl text-sm"
            >
              🎮 게임 시작
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {/* 상위 3위 하이라이트 */}
            {scores.slice(0, 3).length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                {scores.slice(0, 3).map((s, i) => (
                  <div
                    key={i}
                    className={`rounded-2xl border p-4 text-center ${
                      i === 0 ? 'bg-yellow-950/40 border-yellow-700/50' :
                      i === 1 ? 'bg-zinc-800/60 border-zinc-600/50' :
                      'bg-orange-950/30 border-orange-800/40'
                    }`}
                  >
                    <div className="text-3xl mb-1">{RANK_MEDALS[i]}</div>
                    <p className="text-white font-bold text-sm truncate">{s.playerName}</p>
                    <p className={`text-xs mt-0.5 ${DIFF_CONFIG[s.difficulty]?.color ?? 'text-zinc-400'}`}>
                      {DIFF_CONFIG[s.difficulty]?.emoji} {DIFF_CONFIG[s.difficulty]?.label ?? s.difficulty}
                    </p>
                    <p className="text-yellow-400 font-black text-xl mt-2">
                      {s.score.toLocaleString()}
                    </p>
                    <p className="text-xs mt-1">{s.isCorrect ? '✅ 정답' : '❌ 오답'}</p>
                  </div>
                ))}
              </div>
            )}

            {/* 전체 목록 */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-4 py-3 text-left text-zinc-500 text-xs uppercase font-semibold w-12">순위</th>
                    <th className="px-4 py-3 text-left text-zinc-500 text-xs uppercase font-semibold">탐정</th>
                    <th className="px-4 py-3 text-left text-zinc-500 text-xs uppercase font-semibold hidden sm:table-cell">난이도</th>
                    <th className="px-4 py-3 text-right text-zinc-500 text-xs uppercase font-semibold">점수</th>
                    <th className="px-4 py-3 text-center text-zinc-500 text-xs uppercase font-semibold hidden sm:table-cell">정답</th>
                    <th className="px-4 py-3 text-right text-zinc-500 text-xs uppercase font-semibold hidden md:table-cell">날짜</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map((s, i) => (
                    <tr
                      key={i}
                      className={`border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/30 ${
                        i < 3 ? 'bg-yellow-950/10' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-zinc-500 text-xs">
                          {i < 3 ? RANK_MEDALS[i] : `#${i + 1}`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-white font-semibold text-sm">{s.playerName}</p>
                          {s.caseTitle && (
                            <p className="text-zinc-600 text-xs truncate max-w-[140px]">{s.caseTitle}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`text-xs font-semibold ${DIFF_CONFIG[s.difficulty]?.color ?? 'text-zinc-400'}`}>
                          {DIFF_CONFIG[s.difficulty]?.emoji} {DIFF_CONFIG[s.difficulty]?.label ?? s.difficulty}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-yellow-400 font-black">{s.score.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        {s.isCorrect ? '✅' : '❌'}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-600 text-xs hidden md:table-cell">
                        {s.timestamp ? new Date(s.timestamp).toLocaleDateString('ko-KR') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── CTA ──────────────────────────────────── */}
        <div className="text-center mt-10">
          <Link
            href="/"
            className="inline-block px-10 py-4 bg-red-700 hover:bg-red-600 text-white font-black text-lg rounded-2xl transition-all active:scale-95 shadow-2xl shadow-red-900/40"
          >
            🕵️ 새 사건 도전
          </Link>
        </div>
      </div>
    </div>
  );
}
