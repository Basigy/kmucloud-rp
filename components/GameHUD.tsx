'use client';
// ── 상단 HUD: 행동 포인트, 사건명, 증거 현황 ──────────────

import type { GameState, Case } from '../types/game';
import { apPercent } from '../lib/game-logic';

interface Props {
  state: GameState;
  caseData: Case;
  onOpenNotebook: () => void;
  onOpenAccuse: () => void;
}

export default function GameHUD({ state, caseData, onOpenNotebook, onOpenAccuse }: Props) {
  const apPct = apPercent(state);
  const apColor =
    apPct > 50 ? 'text-green-400' : apPct > 25 ? 'text-yellow-400' : 'text-red-400 animate-pulse';
  const barColor =
    apPct > 50 ? 'bg-green-500' : apPct > 25 ? 'bg-yellow-500' : 'bg-red-500';

  const currentLoc = caseData.locations.find(l => l.id === state.currentLocationId);
  const keyEvidenceCount = state.collectedEvidenceIds.filter(
    eid => caseData.evidence.find(e => e.id === eid)?.importance === 'key',
  ).length;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
      {/* 행동 포인트 바 */}
      <div className="h-0.5 bg-zinc-800">
        <div
          className={`h-full transition-all duration-500 ${barColor}`}
          style={{ width: `${apPct}%` }}
        />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center gap-3">
        {/* 사건명 */}
        <div className="hidden sm:block shrink-0">
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest leading-none">사건</p>
          <p className="text-white font-bold text-sm leading-tight">{caseData.title}</p>
        </div>

        <div className="hidden sm:block w-px h-8 bg-zinc-700 shrink-0" />

        {/* 현재 위치 */}
        <div className="shrink-0">
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest leading-none">위치</p>
          <p className="text-blue-300 font-semibold text-sm leading-tight">
            {currentLoc?.icon} {currentLoc?.shortName}
          </p>
        </div>

        <div className="flex-1" />

        {/* 증거 카운터 */}
        <button
          onClick={onOpenNotebook}
          className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 rounded-lg px-2.5 py-1.5 transition-all"
        >
          <span className="text-sm">📓</span>
          <span className="text-blue-400 font-mono text-sm font-bold">
            {state.collectedEvidenceIds.length}
          </span>
          <span className="text-zinc-600 text-xs hidden sm:inline">/ {caseData.evidence.length}</span>
        </button>

        {/* 행동 포인트 */}
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5">
          <span className="text-zinc-400 text-xs hidden sm:inline">행동</span>
          <span className={`font-mono text-base font-black ${apColor}`}>
            {state.actionPoints}
          </span>
          <span className="text-zinc-600 text-xs">/ {state.maxActionPoints}</span>
        </div>

        {/* 기소 버튼 */}
        <button
          onClick={onOpenAccuse}
          className="flex items-center gap-1.5 bg-red-950/60 hover:bg-red-900/70 border border-red-800 hover:border-red-600 text-red-300 hover:text-red-200 rounded-lg px-3 py-1.5 text-sm font-bold transition-all"
        >
          <span>⚖️</span>
          <span className="hidden sm:inline">기소</span>
        </button>
      </div>

      {/* AP 경고 배너 */}
      {state.actionPoints <= 8 && state.phase !== 'accuse' && (
        <div className="bg-red-950/80 border-t border-red-800/50 px-4 py-1 text-center">
          <span className="text-red-300 text-xs font-semibold animate-pulse">
            ⚠️ 행동 포인트 {state.actionPoints}점 남음! 신중하게 선택하세요. 포인트 소진 시 강제 기소!
          </span>
        </div>
      )}
    </header>
  );
}
