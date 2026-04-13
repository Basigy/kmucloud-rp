'use client';
// ── 증거 노트 (드로어) ────────────────────────────────────

import type { GameState, Case } from '../types/game';

interface Props {
  state: GameState;
  caseData: Case;
  onClose: () => void;
}

export default function EvidenceNotebook({ state, caseData, onClose }: Props) {
  const collected = state.collectedEvidenceIds.map(
    eid => caseData.evidence.find(e => e.id === eid)!,
  ).filter(Boolean);

  const keyEvidence = collected.filter(e => e.importance === 'key');
  const supporting = collected.filter(e => e.importance === 'supporting');
  const redHerring = collected.filter(e => e.importance === 'red_herring');

  // 심문 세션 요약
  const sessions = Object.values(state.interrogationSessions);

  // AI 힌트 (패턴 기반)
  const hints = generateHints(state, caseData);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* 노트 패널 */}
      <div className="relative w-full max-w-sm bg-zinc-950 border-l border-zinc-700 h-full overflow-y-auto flex flex-col animate-slide-right">
        {/* 헤더 */}
        <div className="sticky top-0 bg-zinc-950 border-b border-zinc-800 px-4 py-3 flex items-center gap-3 z-10">
          <span className="text-xl">📓</span>
          <div>
            <h2 className="text-white font-bold">증거 노트</h2>
            <p className="text-zinc-500 text-xs">{collected.length}개 수집됨</p>
          </div>
          <button onClick={onClose} className="ml-auto text-zinc-500 hover:text-white text-2xl">×</button>
        </div>

        <div className="flex-1 p-4 space-y-6">
          {/* 핵심 증거 */}
          {keyEvidence.length > 0 && (
            <section>
              <h3 className="text-yellow-400 text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                <span>⭐</span> 핵심 증거
              </h3>
              <div className="space-y-2">
                {keyEvidence.map(ev => (
                  <EvidenceCard key={ev.id} evidence={ev} variant="key" />
                ))}
              </div>
            </section>
          )}

          {/* 보조 증거 */}
          {supporting.length > 0 && (
            <section>
              <h3 className="text-blue-400 text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                <span>📌</span> 보조 증거
              </h3>
              <div className="space-y-2">
                {supporting.map(ev => (
                  <EvidenceCard key={ev.id} evidence={ev} variant="supporting" />
                ))}
              </div>
            </section>
          )}

          {/* 레드 헤링 */}
          {redHerring.length > 0 && (
            <section>
              <h3 className="text-orange-400 text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                <span>🎭</span> 의심 증거
              </h3>
              <div className="space-y-2">
                {redHerring.map(ev => (
                  <EvidenceCard key={ev.id} evidence={ev} variant="red_herring" />
                ))}
              </div>
            </section>
          )}

          {/* 심문 기록 */}
          {sessions.length > 0 && (
            <section>
              <h3 className="text-indigo-400 text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                <span>🎤</span> 심문 기록
              </h3>
              <div className="space-y-2">
                {sessions.map(session => {
                  const suspect = caseData.suspects.find(s => s.id === session.suspectId)!;
                  return (
                    <div key={session.suspectId} className="bg-zinc-900 border border-zinc-700 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{suspect.portraitEmoji}</span>
                        <span className="text-white font-medium text-sm">{suspect.name}</span>
                        <div className="ml-auto flex items-center gap-1">
                          <div className="w-12 h-1 bg-zinc-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500"
                              style={{ width: `${session.stressLevel}%` }}
                            />
                          </div>
                          <span className="text-zinc-500 text-xs">{session.stressLevel}%</span>
                        </div>
                      </div>
                      <p className="text-zinc-500 text-xs">
                        {session.questionsAsked.length}회 질문
                        {session.hasConfessed && (
                          <span className="text-red-400 ml-2 font-semibold">자백 확보!</span>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 증거 없을 때 */}
          {collected.length === 0 && sessions.length === 0 && (
            <div className="text-center py-12">
              <div className="text-5xl mb-3 opacity-30">📓</div>
              <p className="text-zinc-600 text-sm">아직 수집된 증거가 없습니다.</p>
              <p className="text-zinc-700 text-xs mt-1">현장을 조사하여 단서를 찾으세요.</p>
            </div>
          )}

          {/* AI 힌트 */}
          {hints.length > 0 && (
            <section className="bg-yellow-950/20 border border-yellow-800/30 rounded-xl p-4">
              <h3 className="text-yellow-400 text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                <span>💡</span> 수사 분석
              </h3>
              <div className="space-y-2">
                {hints.map((hint, i) => (
                  <p key={i} className="text-zinc-400 text-xs leading-relaxed">
                    • {hint}
                  </p>
                ))}
              </div>
            </section>
          )}

          {/* 행동 포인트 상태 */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-zinc-500 text-xs uppercase tracking-widest mb-2">수사 현황</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">남은 행동 포인트</span>
                <span className="text-yellow-400 font-mono font-bold">{state.actionPoints}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">수집 증거</span>
                <span className="text-blue-400">{collected.length} / {caseData.evidence.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">방문 장소</span>
                <span className="text-green-400">
                  {state.locations.filter(l => l.visited).length} / {caseData.locations.length}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ── 증거 카드 ─────────────────────────────────────────────
function EvidenceCard({
  evidence,
  variant,
}: {
  evidence: { name: string; icon: string; description: string; detail: string; tags: string[] };
  variant: 'key' | 'supporting' | 'red_herring';
}) {
  return (
    <div className={`bg-zinc-900 border rounded-xl p-3 ${
      variant === 'key' ? 'border-yellow-800/50' :
      variant === 'red_herring' ? 'border-orange-800/40' :
      'border-zinc-700/60'
    }`}>
      <div className="flex items-start gap-2">
        <span className="text-2xl shrink-0">{evidence.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm">{evidence.name}</p>
          <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{evidence.description}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {evidence.tags.map(tag => (
              <span key={tag} className="text-xs bg-zinc-800 text-zinc-500 rounded px-1.5 py-0.5">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 패턴 기반 힌트 생성 ───────────────────────────────────
function generateHints(state: GameState, caseData: Case): string[] {
  const hints: string[] = [];
  const collected = state.collectedEvidenceIds;

  if (collected.includes('ev_02') && collected.includes('ev_05')) {
    hints.push('CCTV 영상(14:30 출입)과 수술 변경 기록(13:45 이탈)의 시간이 일치합니다. 알리바이가 무너진 인물이 있습니다.');
  }
  if (collected.includes('ev_03') && collected.includes('ev_06')) {
    hints.push('발견된 약병의 잔여물과 병원 약품 목록의 미상 반출 약품이 연관될 수 있습니다. 국과수 분석이 필요합니다.');
  }
  if (collected.includes('ev_09')) {
    hints.push('독성 분석 결과로 독극물 종류가 확정되었습니다. 이 물질을 구할 수 있는 인물을 주목하세요.');
  }
  if (collected.includes('ev_08')) {
    hints.push('박지수의 알리바이가 확인되었습니다. 수사 대상을 좁힐 수 있습니다.');
  }
  if (collected.length >= 3 && state.actionPoints <= 15) {
    hints.push(`행동 포인트가 ${state.actionPoints}점 남았습니다. 가장 결정적인 증거들을 확보한 상태에서 기소를 검토해보세요.`);
  }

  return hints;
}
