'use client';
// ============================================================
// 게임 메인 페이지 v3 - sessionStorage 기반 케이스 로딩
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import GameHUD from '../../../components/GameHUD';
import LocationScene from '../../../components/LocationScene';
import LocationMap from '../../../components/LocationMap';
import InterrogationView from '../../../components/InterrogationView';
import EvidenceNotebook from '../../../components/EvidenceNotebook';
import AccusationScreen from '../../../components/AccusationScreen';
import ResultScreen from '../../../components/ResultScreen';
import { getCaseById } from '../../../lib/dummy-data';
import {
  createInitialGameState,
  spendAP,
  evaluateAccusation,
} from '../../../lib/game-logic';
import type {
  GameState,
  Case,
  Investigation,
  DialogueMessage,
  Difficulty,
} from '../../../types/game';

// ── 케이스 로더: sessionStorage → 더미 데이터 폴백 ─────────
function loadCase(caseId: string): Case | null {
  if (typeof window === 'undefined') return null;
  const stored = sessionStorage.getItem(`verdict_case_${caseId}`);
  if (stored) {
    try { return JSON.parse(stored) as Case; } catch { /* fall through */ }
  }
  return getCaseById(caseId);
}

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.caseId as string;

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);

  const [state, setState] = useState<GameState | null>(null);

  // ── 케이스 로드 (mount) ──────────────────────────────────
  useEffect(() => {
    const data = loadCase(caseId);
    if (data) {
      setCaseData(data);
      const difficulty = (localStorage.getItem('verdict_difficulty') as Difficulty) ?? data.difficulty ?? 'easy';
      setState(createInitialGameState(data, difficulty));
    }
    setLoading(false);
  }, [caseId]);

  // ── 핸들러 ────────────────────────────────────────────────

  const handleInvestigate = useCallback(
    async (investigation: Investigation, locationId: string) => {
      if (!caseData) return;
      setState(prev => {
        if (!prev) return prev;

        let next = spendAP(prev, investigation.cost);

        next = {
          ...next,
          locations: next.locations.map(l =>
            l.id === locationId
              ? {
                  ...l,
                  visited: true,
                  investigations: l.investigations.map(inv =>
                    inv.id === investigation.id ? { ...inv, completed: true } : inv,
                  ),
                }
              : l,
          ),
        };

        if (investigation.evidenceId) {
          next = {
            ...next,
            collectedEvidenceIds: next.collectedEvidenceIds.includes(investigation.evidenceId)
              ? next.collectedEvidenceIds
              : [...next.collectedEvidenceIds, investigation.evidenceId],
          };
        }

        next = {
          ...next,
          lastFinding: {
            evidenceId: investigation.evidenceId,
            text: investigation.findingText,
            icon: investigation.icon,
          },
        };

        return next;
      });
    },
    [caseData],
  );

  const handleClearFinding = useCallback(() => {
    setState(prev => prev ? { ...prev, lastFinding: null } : prev);
  }, []);

  const handleMoveTo = useCallback((locationId: string) => {
    setState(prev => {
      if (!prev) return prev;
      let next = spendAP(prev, 1);
      next = {
        ...next,
        currentLocationId: locationId,
        mapOpen: false,
        locations: next.locations.map(l =>
          l.id === locationId ? { ...l, visited: true } : l,
        ),
      };
      return next;
    });
  }, []);

  const handleOpenInterrogation = useCallback((suspectId: string) => {
    setState(prev => prev ? { ...prev, phase: 'interrogating', activeInterrogationId: suspectId } : prev);
  }, []);

  const handleInterrogationMessage = useCallback(
    (suspectId: string, message: DialogueMessage, stressIncrease: number, confessed: boolean) => {
      setState(prev => {
        if (!prev) return prev;
        const existingSession = prev.interrogationSessions[suspectId];
        const currentStress = existingSession?.stressLevel ?? prev.suspects.find(s => s.id === suspectId)?.stressLevel ?? 0;

        const updatedSession = {
          suspectId,
          messages: [...(existingSession?.messages ?? []), message],
          stressLevel: Math.min(100, currentStress + (message.role === 'suspect' ? stressIncrease : 0)),
          hasConfessed: existingSession?.hasConfessed || (confessed && message.role === 'suspect'),
          questionsAsked: existingSession?.questionsAsked ?? [],
        };

        const updatedSuspects = prev.suspects.map(s =>
          s.id === suspectId
            ? { ...s, stressLevel: updatedSession.stressLevel, interrogated: true }
            : s,
        );

        return {
          ...prev,
          suspects: updatedSuspects,
          interrogationSessions: {
            ...prev.interrogationSessions,
            [suspectId]: updatedSession,
          },
        };
      });
    },
    [],
  );

  const handleInterrogationSpendAP = useCallback((cost: number) => {
    setState(prev => prev ? spendAP(prev, cost) : prev);
  }, []);

  const handleQuestionTracking = useCallback((suspectId: string, questionId: string) => {
    setState(prev => {
      if (!prev) return prev;
      const session = prev.interrogationSessions[suspectId];
      if (!session) return prev;
      return {
        ...prev,
        interrogationSessions: {
          ...prev.interrogationSessions,
          [suspectId]: {
            ...session,
            questionsAsked: session.questionsAsked.includes(questionId)
              ? session.questionsAsked
              : [...session.questionsAsked, questionId],
          },
        },
      };
    });
  }, []);

  const handleCloseInterrogation = useCallback(() => {
    setState(prev => prev ? { ...prev, phase: 'explore', activeInterrogationId: null } : prev);
  }, []);

  const handleOpenMap = useCallback(() => {
    setState(prev => prev ? { ...prev, mapOpen: true } : prev);
  }, []);

  const handleCloseMap = useCallback(() => {
    setState(prev => prev ? { ...prev, mapOpen: false } : prev);
  }, []);

  const handleOpenNotebook = useCallback(() => {
    setState(prev => prev ? { ...prev, notebookOpen: true } : prev);
  }, []);

  const handleCloseNotebook = useCallback(() => {
    setState(prev => prev ? { ...prev, notebookOpen: false } : prev);
  }, []);

  const handleOpenAccuse = useCallback(() => {
    setState(prev => prev ? { ...prev, phase: 'accuse' } : prev);
  }, []);

  const handleCancelAccuse = useCallback(() => {
    setState(prev => prev && prev.actionPoints > 0 ? { ...prev, phase: 'explore' } : prev);
  }, []);

  const handleAccuse = useCallback(
    (culpritId: string, motive: string, method: string) => {
      if (!caseData || !state) return;
      const evaluation = evaluateAccusation(culpritId, motive, method, state, caseData);
      setState(prev => prev ? {
        ...prev,
        phase: 'result',
        accusation: { culpritId, motive, method },
        result: {
          correct: evaluation.correct,
          score: evaluation.score,
          ending: evaluation.ending,
          confession: evaluation.confession,
        },
      } : prev);
    },
    [caseData, state],
  );

  // ── 로딩 ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-zinc-700 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400 text-sm">수사 준비 중...</p>
        </div>
      </div>
    );
  }

  // ── 사건 없음 ─────────────────────────────────────────────
  if (!caseData || !state) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-white text-xl font-bold">사건을 찾을 수 없습니다</p>
          <p className="text-zinc-500 text-sm mt-2 mb-6">링크가 만료되었거나 잘못된 접근입니다.</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl"
          >
            메인으로
          </button>
        </div>
      </div>
    );
  }

  // ── 결과 화면 ────────────────────────────────────────────
  if (state.phase === 'result') {
    return (
      <ResultScreen
        state={state}
        caseData={caseData}
        onRestart={() => router.push('/')}
      />
    );
  }

  // ── 기소 화면 ────────────────────────────────────────────
  if (state.phase === 'accuse') {
    return (
      <AccusationScreen
        state={state}
        caseData={caseData}
        onSubmit={handleAccuse}
        onCancel={state.actionPoints > 0 ? handleCancelAccuse : undefined}
        forcedByAP={state.actionPoints === 0}
      />
    );
  }

  return (
    <>
      <GameHUD
        state={state}
        caseData={caseData}
        onOpenNotebook={handleOpenNotebook}
        onOpenAccuse={handleOpenAccuse}
      />

      <LocationScene
        state={state}
        caseData={caseData}
        onInvestigate={handleInvestigate}
        onInterrogate={handleOpenInterrogation}
        onOpenMap={handleOpenMap}
      />

      {/* ── Finding 팝업 ──────────────────────────────── */}
      {state.lastFinding && (
        <div
          className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={handleClearFinding}
        >
          <div
            className="w-full max-w-md bg-zinc-900 border border-zinc-600 rounded-2xl overflow-hidden shadow-2xl animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            {(() => {
              const finding = state.lastFinding!;
              const evidence = finding.evidenceId
                ? caseData.evidence.find(e => e.id === finding.evidenceId)
                : null;
              return (
                <>
                  <div className={`px-4 py-3 border-b border-zinc-700 flex items-center gap-2 ${
                    evidence?.importance === 'key' ? 'bg-yellow-950/40' :
                    evidence?.importance === 'red_herring' ? 'bg-orange-950/30' :
                    'bg-zinc-800'
                  }`}>
                    <span className="text-2xl">{evidence?.icon ?? finding.icon}</span>
                    <div>
                      <p className="text-white font-bold text-sm">{evidence?.name ?? '발견!'}</p>
                      {evidence?.importance === 'key' && (
                        <p className="text-yellow-400 text-xs">⭐ 핵심 증거</p>
                      )}
                      {evidence?.importance === 'red_herring' && (
                        <p className="text-orange-400 text-xs">🎭 의심스러운 증거</p>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-zinc-300 text-sm leading-relaxed">{finding.text}</p>
                    {evidence && (
                      <p className="text-zinc-400 text-sm mt-3 leading-relaxed border-t border-zinc-700 pt-3">
                        {evidence.detail}
                      </p>
                    )}
                  </div>
                  <div className="px-4 pb-4">
                    <button
                      onClick={handleClearFinding}
                      className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold rounded-xl transition-all"
                    >
                      계속 수사
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── 장소 맵 ──────────────────────────────────── */}
      {state.mapOpen && (
        <LocationMap
          state={state}
          caseData={caseData}
          onMoveTo={handleMoveTo}
          onClose={handleCloseMap}
        />
      )}

      {/* ── 심문 ─────────────────────────────────────── */}
      {state.phase === 'interrogating' && state.activeInterrogationId && (
        <InterrogationView
          suspectId={state.activeInterrogationId}
          state={state}
          caseData={caseData}
          onMessage={handleInterrogationMessage}
          onClose={handleCloseInterrogation}
          onSpendAP={handleInterrogationSpendAP}
        />
      )}

      {/* ── 증거 노트 ────────────────────────────────── */}
      {state.notebookOpen && (
        <EvidenceNotebook
          state={state}
          caseData={caseData}
          onClose={handleCloseNotebook}
        />
      )}
    </>
  );
}
