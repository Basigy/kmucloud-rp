'use client';
// ── 결과 화면: AI 생성 결말 + 진실 공개 + 점수 저장 ─────────

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { GameState, Case } from '../types/game';

interface Props {
  state: GameState;
  caseData: Case;
  onRestart: () => void;
}

export default function ResultScreen({ state, caseData, onRestart }: Props) {
  const result = state.result!;
  const [showTruth, setShowTruth] = useState(false);
  const [showConfession, setShowConfession] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  const culprit = caseData.suspects.find(s => s.id === caseData.truth.culpritId)!;
  const accused = state.accusation?.culpritId
    ? caseData.suspects.find(s => s.id === state.accusation!.culpritId)
    : null;

  useEffect(() => {
    const t1 = setTimeout(() => setShowTruth(true), 1500);
    const t2 = setTimeout(() => setShowConfession(true), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const handleSave = async () => {
    if (!playerName.trim() || saving) return;
    setSaving(true);
    try {
      await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: playerName.trim(),
          caseId: state.caseId,
          caseTitle: caseData.title,
          difficulty: state.difficulty,
          score: result.score,
          isCorrect: result.correct,
          remainingAP: state.actionPoints,
          evidenceCount: state.collectedEvidenceIds.length,
          timestamp: new Date().toISOString(),
        }),
      });
      setSaved(true);
      setShowSaveForm(false);
    } catch {
      /* 저장 실패 시 조용히 무시 */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col overflow-y-auto">
      {/* 배경 */}
      <div
        className="fixed inset-0"
        style={{
          background: result.correct
            ? 'linear-gradient(160deg, #001a00 0%, #0a1a0a 50%, #000500 100%)'
            : 'linear-gradient(160deg, #1a0000 0%, #0d0505 50%, #000000 100%)',
        }}
      />

      <div className="relative max-w-2xl mx-auto w-full px-4 py-12">
        {/* ── 결과 헤더 ──────────────────────────────── */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="text-7xl mb-4">{result.correct ? '🎉' : '💔'}</div>
          <h1 className={`text-4xl font-black mb-3 ${result.correct ? 'text-green-400' : 'text-red-400'}`}>
            {result.correct ? '사건 해결' : '수사 실패'}
          </h1>
          <p className="text-zinc-400 text-sm">
            {result.correct
              ? `${accused?.name}을(를) 범인으로 지목하는 데 성공했습니다.`
              : `${accused?.name}은(는) 범인이 아니었습니다. 진짜 범인은 도주했습니다.`}
          </p>
        </div>

        {/* ── 점수 카드 ──────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-zinc-900/50 border border-zinc-700 rounded-2xl p-4 text-center">
            <p className="text-zinc-500 text-xs uppercase mb-1">최종 점수</p>
            <p className="text-3xl font-black text-yellow-400">{result.score.toLocaleString()}</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-700 rounded-2xl p-4 text-center">
            <p className="text-zinc-500 text-xs uppercase mb-1">남은 AP</p>
            <p className="text-3xl font-black text-blue-400">{state.actionPoints}</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-700 rounded-2xl p-4 text-center">
            <p className="text-zinc-500 text-xs uppercase mb-1">수집 증거</p>
            <p className="text-3xl font-black text-green-400">{state.collectedEvidenceIds.length}</p>
          </div>
        </div>

        {/* ── 점수 저장 ──────────────────────────────── */}
        {!saved ? (
          <div className="mb-6">
            {!showSaveForm ? (
              <button
                onClick={() => setShowSaveForm(true)}
                className="w-full py-3 bg-yellow-800/30 hover:bg-yellow-700/40 border border-yellow-700/50 text-yellow-400 font-bold rounded-xl transition-all text-sm"
              >
                🏆 랭킹에 내 점수 저장하기
              </button>
            ) : (
              <div className="bg-zinc-900/80 border border-zinc-600 rounded-2xl p-4">
                <p className="text-zinc-400 text-sm mb-3">탐정 이름을 입력하세요</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={playerName}
                    onChange={e => setPlayerName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                    placeholder="예: 홍길동 탐정"
                    maxLength={20}
                    className="flex-1 bg-zinc-800 border border-zinc-600 text-white rounded-xl px-4 py-2.5 text-sm placeholder-zinc-600 outline-none focus:border-zinc-400"
                  />
                  <button
                    onClick={handleSave}
                    disabled={saving || !playerName.trim()}
                    className="px-5 py-2.5 bg-yellow-600 hover:bg-yellow-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold rounded-xl text-sm transition-all"
                  >
                    {saving ? '저장 중...' : '저장'}
                  </button>
                  <button
                    onClick={() => setShowSaveForm(false)}
                    className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl text-sm"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-6 bg-green-950/40 border border-green-700/40 rounded-xl p-3 text-center">
            <p className="text-green-400 text-sm">✅ 점수가 랭킹에 저장되었습니다!</p>
            <Link href="/leaderboard" className="text-green-300 text-xs underline mt-1 inline-block">
              🏆 랭킹 보기
            </Link>
          </div>
        )}

        {/* ── 결말 텍스트 ─────────────────────────────── */}
        <div className="bg-zinc-900/60 border border-zinc-700 rounded-2xl p-5 mb-6">
          <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
            {result.ending}
          </p>
        </div>

        {/* ── 진실 공개 ──────────────────────────────── */}
        {showTruth && (
          <div className={`border rounded-2xl overflow-hidden mb-6 animate-fade-in ${
            result.correct ? 'border-green-800/50' : 'border-zinc-700'
          }`}>
            <div className="bg-zinc-900 px-4 py-3 border-b border-zinc-700 flex items-center gap-2">
              <span className="text-lg">📖</span>
              <h3 className="text-white font-bold">사건의 진실</h3>
            </div>
            <div className="p-4 space-y-4 bg-zinc-950/50">
              <div className="flex items-start gap-3">
                <div className="text-3xl">{culprit.portraitEmoji}</div>
                <div>
                  <p className="text-zinc-500 text-xs mb-1">실제 범인</p>
                  <p className="text-red-400 font-bold text-lg">{culprit.name}</p>
                  <p className="text-zinc-500 text-xs">{culprit.role}</p>
                </div>
              </div>
              <div>
                <p className="text-zinc-500 text-xs mb-1">범행 동기</p>
                <p className="text-zinc-300 text-sm leading-relaxed">{caseData.truth.motive}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs mb-1">범행 방법</p>
                <p className="text-zinc-300 text-sm leading-relaxed">{caseData.truth.method}</p>
              </div>
              <div className="bg-purple-950/30 border border-purple-800/30 rounded-xl p-3">
                <p className="text-purple-400 text-xs mb-1">🔮 사건의 전말</p>
                <p className="text-zinc-300 text-sm leading-relaxed">{caseData.truth.story}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── 범인의 고백 ─────────────────────────────── */}
        {showConfession && result.correct && result.confession && (
          <div className="bg-zinc-950 border border-zinc-600 rounded-2xl p-5 mb-6 animate-fade-in">
            <h3 className="text-zinc-400 text-xs uppercase tracking-widest mb-4">
              📝 {culprit.name}의 고백
            </h3>
            <blockquote className="border-l-2 border-zinc-600 pl-4">
              <p className="text-zinc-300 text-sm leading-relaxed italic whitespace-pre-line">
                {result.confession}
              </p>
            </blockquote>
            <p className="text-zinc-600 text-xs mt-3 text-right">— {culprit.name}</p>
          </div>
        )}

        {/* ── 액션 버튼 ──────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/leaderboard"
            className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white font-bold text-center rounded-2xl transition-all text-sm"
          >
            🏆 명탐정 랭킹
          </Link>
          <button
            onClick={onRestart}
            className="flex-1 py-4 bg-red-800 hover:bg-red-700 text-white font-bold text-lg rounded-2xl transition-all active:scale-95"
          >
            🔄 새 사건 시작
          </button>
        </div>
      </div>
    </div>
  );
}
