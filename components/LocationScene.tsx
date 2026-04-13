'use client';
// ── 비주얼 노벨 핵심: 장소 배경 + 설명 + 행동 선택지 ────────

import { useState } from 'react';
import type { GameState, Case, Investigation } from '../types/game';

interface Props {
  state: GameState;
  caseData: Case;
  onInvestigate: (investigation: Investigation, locationId: string) => void;
  onInterrogate: (suspectId: string) => void;
  onOpenMap: () => void;
}

export default function LocationScene({
  state,
  caseData,
  onInvestigate,
  onInterrogate,
  onOpenMap,
}: Props) {
  const [showingFinding, setShowingFinding] = useState(false);

  const currentLocData = caseData.locations.find(l => l.id === state.currentLocationId)!;
  const currentLocState = state.locations.find(l => l.id === state.currentLocationId)!;

  // 이 장소의 용의자들
  const suspectsHere = caseData.suspects.filter(s =>
    currentLocData.suspectIds.includes(s.id),
  );

  // finding 팝업 (lastFinding)
  if (state.lastFinding && !showingFinding) {
    setShowingFinding(true);
  }

  return (
    <div className="relative min-h-screen flex flex-col select-none">
      {/* ── 배경 그라디언트 ──────────────────────────── */}
      <div
        className="fixed inset-0 transition-all duration-700"
        style={{
          background: `linear-gradient(160deg, ${currentLocData.bgFrom} 0%, ${currentLocData.bgVia} 50%, ${currentLocData.bgTo} 100%)`,
        }}
      />

      {/* 배경 노이즈 오버레이 */}
      <div className="fixed inset-0 opacity-30"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'4\' height=\'4\'%3E%3Crect width=\'1\' height=\'1\' fill=\'white\' opacity=\'0.08\'/%3E%3C/svg%3E")',
        }}
      />

      {/* ── 장소 아이콘 & 분위기 요소 ─────────────────── */}
      <div className="relative flex flex-col items-center justify-center flex-1 px-4 pt-24 pb-4">
        {/* 큰 장소 아이콘 */}
        <div className="text-8xl sm:text-9xl mb-4 opacity-20 select-none pointer-events-none">
          {currentLocData.icon}
        </div>

        {/* 도착 메시지 (미방문 시 또는 처음 도착 시) */}
        {!currentLocState.visited && (
          <div className="text-center mb-6 max-w-lg">
            <p className="text-zinc-300 text-sm leading-relaxed italic">
              "{currentLocData.arrivalText}"
            </p>
          </div>
        )}
      </div>

      {/* ── 하단 선택지 패널 ──────────────────────────── */}
      <div className="relative z-10 max-w-3xl mx-auto w-full px-4 pb-6">
        {/* 장소 설명 텍스트박스 */}
        <div className="bg-black/70 backdrop-blur-md border border-white/10 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{currentLocData.icon}</span>
            <span className="text-white font-bold">{currentLocData.name}</span>
            {currentLocState.visited && (
              <span className="text-xs text-green-500 bg-green-900/30 border border-green-800/40 rounded-full px-2 py-0.5 ml-auto">
                방문함
              </span>
            )}
          </div>
          <p className="text-zinc-300 text-sm leading-relaxed">{currentLocData.description}</p>
        </div>

        {/* 조사 선택지 */}
        <div className="space-y-2 mb-4">
          <p className="text-zinc-500 text-xs uppercase tracking-widest px-1 mb-2">
            🔍 무엇을 조사하시겠습니까?
          </p>

          {currentLocState.investigations.map(inv => {
            const isCompleted = inv.completed;
            const canAfford = state.actionPoints >= inv.cost;

            return (
              <button
                key={inv.id}
                onClick={() => !isCompleted && canAfford && onInvestigate(inv, state.currentLocationId)}
                disabled={isCompleted || !canAfford}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-150 ${
                  isCompleted
                    ? 'bg-zinc-900/30 border-zinc-800/50 text-zinc-600 cursor-default'
                    : !canAfford
                      ? 'bg-zinc-900/30 border-zinc-800/50 text-zinc-600 cursor-not-allowed'
                      : inv.isImportant
                        ? 'bg-yellow-950/40 border-yellow-700/60 text-yellow-100 hover:bg-yellow-900/50 hover:border-yellow-500 active:scale-[0.98]'
                        : 'bg-zinc-900/50 border-zinc-700/50 text-zinc-200 hover:bg-zinc-800/60 hover:border-zinc-500 active:scale-[0.98]'
                }`}
              >
                <span className="text-xl shrink-0">
                  {isCompleted ? '✅' : inv.icon}
                </span>
                <span className="flex-1 text-sm font-medium">{inv.name}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {inv.isImportant && !isCompleted && (
                    <span className="text-yellow-400 text-xs">⭐</span>
                  )}
                  {isCompleted ? (
                    <span className="text-zinc-600 text-xs">완료</span>
                  ) : (
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                      !canAfford ? 'text-red-600' : 'text-zinc-400 bg-zinc-800/60'
                    }`}>
                      -{inv.cost}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* 이 장소의 용의자 심문 */}
        {suspectsHere.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-zinc-500 text-xs uppercase tracking-widest px-1 mb-2">
              🎤 이 장소의 용의자
            </p>
            {suspectsHere.map(suspect => {
              const suspectState = state.suspects.find(s => s.id === suspect.id)!;
              const canAfford = state.actionPoints >= 3;
              const session = state.interrogationSessions[suspect.id];

              return (
                <button
                  key={suspect.id}
                  onClick={() => canAfford && onInterrogate(suspect.id)}
                  disabled={!canAfford}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                    !canAfford
                      ? 'bg-zinc-900/30 border-zinc-800/50 text-zinc-600 cursor-not-allowed'
                      : 'bg-indigo-950/40 border-indigo-700/50 text-indigo-100 hover:bg-indigo-900/50 hover:border-indigo-500 active:scale-[0.98]'
                  }`}
                >
                  <span className="text-2xl shrink-0">{suspect.portraitEmoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{suspect.name}</span>
                      <span className="text-xs text-zinc-500">{suspect.role}</span>
                    </div>
                    {/* 스트레스 바 */}
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            suspectState.stressLevel >= 70 ? 'bg-red-500' : 'bg-orange-500'
                          }`}
                          style={{ width: `${suspectState.stressLevel}%` }}
                        />
                      </div>
                      <span className="text-zinc-500 text-xs">{suspectState.stressLevel}%</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                      !canAfford ? 'text-red-600' : 'text-indigo-300 bg-indigo-900/50'
                    }`}>
                      -3
                    </span>
                    {session && (
                      <span className="text-xs text-zinc-600">
                        {session.messages.filter(m => m.role === 'detective').length}회 질문
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* 이동 버튼 */}
        <button
          onClick={onOpenMap}
          disabled={state.actionPoints < 1}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
            state.actionPoints < 1
              ? 'bg-zinc-900/30 border-zinc-800/50 text-zinc-600 cursor-not-allowed'
              : 'bg-zinc-900/60 border-zinc-600/50 text-zinc-300 hover:bg-zinc-800/70 hover:border-zinc-400 active:scale-[0.98]'
          }`}
        >
          <span>🗺️</span>
          <span className="text-sm font-medium">다른 장소로 이동</span>
          <span className="text-xs text-zinc-500 ml-auto">-1</span>
        </button>
      </div>

      {/* ── 조사 결과 팝업 ────────────────────────────── */}
      {state.lastFinding && (
        <FindingPopup
          finding={state.lastFinding}
          evidence={state.lastFinding.evidenceId
            ? caseData.evidence.find(e => e.id === state.lastFinding!.evidenceId)
            : null}
          onClose={() => {}} // 부모에서 clear
        />
      )}
    </div>
  );
}

// ── 조사 결과 팝업 ─────────────────────────────────────────
function FindingPopup({
  finding,
  evidence,
  onClose,
}: {
  finding: { evidenceId?: string; text: string; icon: string };
  evidence: { name: string; icon: string; detail: string; importance: string } | null | undefined;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-600 rounded-2xl overflow-hidden shadow-2xl">
        {/* 헤더 */}
        <div className={`px-4 py-3 border-b border-zinc-700 flex items-center gap-2 ${
          evidence?.importance === 'key' ? 'bg-yellow-950/40' :
          evidence?.importance === 'red_herring' ? 'bg-red-950/30' :
          'bg-zinc-800'
        }`}>
          <span className="text-2xl">{evidence?.icon ?? finding.icon}</span>
          <div>
            <p className="text-white font-bold text-sm">
              {evidence ? evidence.name : '발견!'}
            </p>
            {evidence?.importance === 'key' && (
              <p className="text-yellow-400 text-xs">⭐ 핵심 증거</p>
            )}
            {evidence?.importance === 'red_herring' && (
              <p className="text-orange-400 text-xs">🎭 주의: 판단 필요</p>
            )}
          </div>
        </div>

        {/* 내용 */}
        <div className="p-4">
          <p className="text-zinc-300 text-sm leading-relaxed">
            {evidence ? evidence.detail : finding.text}
          </p>
          {!evidence && (
            <p className="text-zinc-400 text-sm mt-3 leading-relaxed italic">
              "{finding.text}"
            </p>
          )}
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold rounded-xl transition-all"
          >
            계속 수사
          </button>
        </div>
      </div>
    </div>
  );
}
