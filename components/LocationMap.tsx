'use client';
// ── 장소 이동 맵 모달 ─────────────────────────────────────

import type { GameState, Case } from '../types/game';

interface Props {
  state: GameState;
  caseData: Case;
  onMoveTo: (locationId: string) => void;
  onClose: () => void;
}

export default function LocationMap({ state, caseData, onMoveTo, onClose }: Props) {
  const otherLocations = caseData.locations.filter(l => l.id !== state.currentLocationId);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-700 rounded-2xl overflow-hidden shadow-2xl animate-slide-up">
        {/* 헤더 */}
        <div className="bg-zinc-900 border-b border-zinc-700 px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold">🗺️ 장소 이동</h2>
            <p className="text-zinc-500 text-xs mt-0.5">
              행동 포인트 남음: <span className="text-yellow-400 font-mono font-bold">{state.actionPoints}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* 현재 위치 */}
        <div className="px-4 pt-3 pb-1">
          <p className="text-zinc-600 text-xs uppercase tracking-widest mb-2">현재 위치</p>
          <div className="flex items-center gap-2 bg-blue-950/30 border border-blue-800/30 rounded-xl p-3">
            {(() => {
              const cur = caseData.locations.find(l => l.id === state.currentLocationId)!;
              return (
                <>
                  <span className="text-2xl">{cur.icon}</span>
                  <span className="text-blue-300 font-semibold">{cur.name}</span>
                  <span className="ml-auto text-blue-600 text-xs">현재</span>
                </>
              );
            })()}
          </div>
        </div>

        {/* 이동 가능 장소 */}
        <div className="px-4 py-3 space-y-2">
          <p className="text-zinc-600 text-xs uppercase tracking-widest mb-2">이동할 장소 선택</p>
          {otherLocations.map(location => {
            const locState = state.locations.find(l => l.id === location.id)!;
            const suspectCount = location.suspectIds.length;
            const canAfford = state.actionPoints >= location.moveCost;

            return (
              <button
                key={location.id}
                onClick={() => canAfford && onMoveTo(location.id)}
                disabled={!canAfford}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                  !canAfford
                    ? 'bg-zinc-900/30 border-zinc-800/50 text-zinc-600 cursor-not-allowed'
                    : locState.visited
                      ? 'bg-zinc-800/50 border-zinc-600/60 text-zinc-200 hover:bg-zinc-700/60 hover:border-zinc-500 active:scale-[0.98]'
                      : 'bg-zinc-900/70 border-zinc-700/60 text-zinc-100 hover:bg-zinc-800/80 hover:border-zinc-500 active:scale-[0.98]'
                }`}
              >
                <span className="text-2xl shrink-0">{location.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{location.name}</span>
                    {locState.visited && (
                      <span className="text-xs text-zinc-500">방문함</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-zinc-500 text-xs">
                      조사 {location.investigations.filter(i => !i.completed).length}개 남음
                    </span>
                    {suspectCount > 0 && (
                      <span className="text-indigo-400 text-xs">
                        🎤 용의자 {suspectCount}명
                      </span>
                    )}
                    {location.investigations.some(i => i.isImportant && !i.completed) && (
                      <span className="text-yellow-400 text-xs">⭐ 중요 단서</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    !canAfford ? 'text-red-600' : 'text-zinc-400 bg-zinc-800'
                  }`}>
                    -{location.moveCost}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* 수사 팁 */}
        <div className="mx-4 mb-4 bg-zinc-900/50 border border-zinc-800 rounded-xl p-3">
          <p className="text-zinc-500 text-xs">
            💡 <strong className="text-zinc-400">팁:</strong> ⭐ 표시된 장소에 중요 단서가 있습니다.
            행동 포인트가 부족하면 신중히 선택하세요.
          </p>
        </div>
      </div>
    </div>
  );
}
