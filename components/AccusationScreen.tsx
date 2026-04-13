'use client';
// ── 기소 화면 ─────────────────────────────────────────────

import { useState } from 'react';
import type { GameState, Case } from '../types/game';

interface Props {
  state: GameState;
  caseData: Case;
  onSubmit: (culpritId: string, motive: string, method: string) => void;
  onCancel?: () => void;
  forcedByAP?: boolean; // AP 소진으로 강제 기소
}

export default function AccusationScreen({ state, caseData, onSubmit, onCancel, forcedByAP }: Props) {
  const [selectedCulprit, setSelectedCulprit] = useState<string | null>(null);
  const [selectedMotive, setSelectedMotive] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = selectedCulprit && selectedMotive && selectedMethod;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1200));
    onSubmit(selectedCulprit!, selectedMotive!, selectedMethod!);
    setSubmitting(false);
  };

  const collectedEvidence = state.collectedEvidenceIds
    .map(eid => caseData.evidence.find(e => e.id === eid))
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col overflow-y-auto">
      {/* 배경 */}
      <div
        className="fixed inset-0"
        style={{ background: 'linear-gradient(160deg, #0a0000 0%, #1a0505 50%, #050005 100%)' }}
      />

      <div className="relative max-w-2xl mx-auto w-full px-4 py-6 pt-8">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">⚖️</div>
          <h1 className="text-white text-3xl font-black mb-2">범인 지목</h1>
          {forcedByAP ? (
            <div className="inline-flex items-center gap-2 bg-red-950/60 border border-red-800 rounded-xl px-4 py-2 mb-3">
              <span className="text-red-400 text-sm font-semibold">
                ⚠️ 행동 포인트가 소진되었습니다. 수집한 증거로 판단하세요.
              </span>
            </div>
          ) : (
            <p className="text-zinc-400 text-sm">
              수집한 증거를 바탕으로 범인, 동기, 방법을 선택하세요.
            </p>
          )}
        </div>

        {/* 수집 증거 요약 */}
        {collectedEvidence.length > 0 && (
          <div className="bg-zinc-900/50 border border-zinc-700 rounded-2xl p-4 mb-6">
            <h3 className="text-zinc-400 text-xs uppercase tracking-widest mb-3">
              📦 수집된 증거 ({collectedEvidence.length}개)
            </h3>
            <div className="flex flex-wrap gap-2">
              {collectedEvidence.map(ev => (
                <span
                  key={ev!.id}
                  className={`flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 border ${
                    ev!.importance === 'key'
                      ? 'bg-yellow-950/40 border-yellow-800/50 text-yellow-300'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                  }`}
                >
                  {ev!.icon} {ev!.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 1. 범인 선택 */}
        <section className="mb-6">
          <h2 className="text-zinc-300 font-bold text-sm mb-3">
            1. 범인으로 지목할 인물
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {caseData.suspects.map(suspect => {
              const isSelected = selectedCulprit === suspect.id;
              const session = state.interrogationSessions[suspect.id];

              return (
                <button
                  key={suspect.id}
                  onClick={() => setSelectedCulprit(isSelected ? null : suspect.id)}
                  className={`text-left p-4 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-red-950/50 border-red-500 shadow-lg shadow-red-900/30'
                      : 'bg-zinc-900/60 border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/70'
                  }`}
                >
                  <div className="text-3xl mb-2">{isSelected ? '🎯' : suspect.portraitEmoji}</div>
                  <p className="text-white font-bold text-sm">{suspect.name}</p>
                  <p className="text-zinc-500 text-xs">{suspect.role}</p>
                  {session && (
                    <div className="mt-2">
                      <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500"
                          style={{ width: `${session.stressLevel}%` }}
                        />
                      </div>
                      <p className="text-zinc-600 text-xs mt-0.5">
                        긴장도 {session.stressLevel}%
                        {session.hasConfessed && <span className="text-red-400 ml-1">자백</span>}
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. 동기 선택 */}
        <section className="mb-6">
          <h2 className="text-zinc-300 font-bold text-sm mb-3">
            2. 범행 동기
          </h2>
          <div className="space-y-2">
            {caseData.accusationOptions.motives.map(motive => (
              <button
                key={motive}
                onClick={() => setSelectedMotive(selectedMotive === motive ? null : motive)}
                className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-all ${
                  selectedMotive === motive
                    ? 'bg-purple-950/50 border-purple-500 text-purple-200'
                    : 'bg-zinc-900/50 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                }`}
              >
                {selectedMotive === motive ? '● ' : '○ '}{motive}
              </button>
            ))}
          </div>
        </section>

        {/* 3. 방법 선택 */}
        <section className="mb-8">
          <h2 className="text-zinc-300 font-bold text-sm mb-3">
            3. 범행 방법
          </h2>
          <div className="space-y-2">
            {caseData.accusationOptions.methods.map(method => (
              <button
                key={method}
                onClick={() => setSelectedMethod(selectedMethod === method ? null : method)}
                className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-all ${
                  selectedMethod === method
                    ? 'bg-orange-950/50 border-orange-500 text-orange-200'
                    : 'bg-zinc-900/50 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                }`}
              >
                {selectedMethod === method ? '● ' : '○ '}{method}
              </button>
            ))}
          </div>
        </section>

        {/* 제출 버튼 */}
        {!confirming ? (
          <div className="space-y-3">
            <button
              onClick={() => setConfirming(true)}
              disabled={!canSubmit}
              className={`w-full py-4 rounded-2xl font-black text-lg transition-all ${
                canSubmit
                  ? 'bg-red-700 hover:bg-red-600 text-white active:scale-95 shadow-xl shadow-red-900/40'
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
            >
              ⚖️ 기소하기
            </button>
            {onCancel && !forcedByAP && (
              <button
                onClick={onCancel}
                className="w-full py-3 text-zinc-600 hover:text-zinc-400 text-sm transition-colors"
              >
                ← 계속 수사하기
              </button>
            )}
          </div>
        ) : (
          <div className="bg-red-950/40 border border-red-800 rounded-2xl p-5 space-y-4">
            <div className="text-center">
              <p className="text-white font-bold text-lg">정말로 기소하시겠습니까?</p>
              <p className="text-red-400/80 text-sm mt-1">
                {caseData.suspects.find(s => s.id === selectedCulprit)?.name}을(를) 범인으로 지목합니다.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setConfirming(false)}
                className="py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-semibold transition-all"
              >
                재검토
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={`py-3 rounded-xl font-black transition-all ${
                  submitting
                    ? 'bg-red-900 text-red-400 animate-pulse'
                    : 'bg-red-600 hover:bg-red-500 text-white active:scale-95'
                }`}
              >
                {submitting ? '⏳ 처리 중...' : '✅ 최종 기소'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
