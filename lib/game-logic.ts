// ============================================================
// 게임 로직 v2 - 행동 포인트 시스템
// ============================================================

import type { GameState, Case, Difficulty } from '../types/game';
import { INITIAL_AP } from '../types/game';

// ── 초기 게임 상태 ────────────────────────────────────────
export function createInitialGameState(caseData: Case, difficulty: Difficulty): GameState {
  const maxAP = INITIAL_AP[difficulty];
  return {
    caseId: caseData.caseId,
    difficulty,
    phase: 'explore',
    actionPoints: maxAP,
    maxActionPoints: maxAP,
    currentLocationId: caseData.startLocationId,
    locations: caseData.locations.map(l => ({ ...l, investigations: l.investigations.map(i => ({ ...i })) })),
    suspects: caseData.suspects.map(s => ({ ...s })),
    collectedEvidenceIds: [],
    interrogationSessions: {},
    activeInterrogationId: null,
    notebookOpen: false,
    mapOpen: false,
    lastFinding: null,
  };
}

// ── 행동 포인트 소모 ──────────────────────────────────────
export function spendAP(state: GameState, cost: number): GameState {
  const newAP = Math.max(0, state.actionPoints - cost);
  // AP 소진 시 기소 페이즈 전환
  const newPhase = newAP === 0 ? 'accuse' : state.phase;
  return { ...state, actionPoints: newAP, phase: newPhase };
}

// AP 퍼센트
export function apPercent(state: GameState): number {
  return (state.actionPoints / state.maxActionPoints) * 100;
}

// ── 점수 계산 ────────────────────────────────────────────
export function calculateScore(state: GameState, correct: boolean): number {
  if (!correct) return 0;

  let score = 1000;
  // AP 남을수록 보너스 (최대 800점)
  score += Math.floor((state.actionPoints / state.maxActionPoints) * 800);
  // 증거 수집 보너스 (개당 50)
  score += state.collectedEvidenceIds.length * 50;
  // 증거 연결 (심문 세션 수, 개당 30)
  score += Object.keys(state.interrogationSessions).length * 30;

  return score;
}

// ── 스트레스 계산 ─────────────────────────────────────────
export function calculateStressIncrease(
  isCulprit: boolean,
  questionType: 'alibi' | 'relationship' | 'evidence' | 'pressure',
  evidenceCount: number,
): number {
  const base: Record<string, number> = {
    alibi: isCulprit ? 12 : 3,
    relationship: isCulprit ? 8 : 4,
    evidence: isCulprit ? 20 + evidenceCount * 8 : 3,
    pressure: isCulprit ? 22 : 6,
  };
  return base[questionType] ?? 5;
}

// 자백 조건 (범인 + 스트레스 85+ + 핵심 증거 2개 이상)
export function checkConfessionCondition(
  suspectId: string,
  state: GameState,
  caseData: Case,
): boolean {
  const suspect = state.suspects.find(s => s.id === suspectId);
  if (!suspect?.isCulprit) return false;

  const session = state.interrogationSessions[suspectId];
  if (!session || session.stressLevel < 85) return false;

  const keyEvidenceCollected = state.collectedEvidenceIds.filter(eid => {
    const ev = caseData.evidence.find(e => e.id === eid);
    return ev?.importance === 'key';
  }).length;

  return keyEvidenceCollected >= 2;
}

// ── 기소 평가 ────────────────────────────────────────────
export function evaluateAccusation(
  culpritId: string,
  motive: string,
  method: string,
  state: GameState,
  caseData: Case,
): {
  correct: boolean;
  score: number;
  ending: string;
  confession?: string;
} {
  const correct =
    culpritId === caseData.truth.culpritId &&
    motive === caseData.truth.motive &&
    method === caseData.truth.method;

  // 부분 정답 (범인만 맞춤)
  const culpritCorrect = culpritId === caseData.truth.culpritId;

  const score = calculateScore(state, culpritCorrect);
  const culprit = caseData.suspects.find(s => s.id === caseData.truth.culpritId)!;
  const accused = caseData.suspects.find(s => s.id === culpritId)!;

  let ending = '';

  if (culpritCorrect) {
    const hasConfession = state.interrogationSessions[culpritId]?.hasConfessed;
    ending =
      `[수사 결과 발표]\n\n` +
      `당신은 ${culprit.name}을(를) 범인으로 지목했습니다.\n\n` +
      (hasConfession
        ? `이미 자백을 받아낸 상태. 김철수는 법정에서 혐의를 인정했습니다.\n\n`
        : `${culprit.name}은(는) 처음엔 부인했습니다. 하지만 당신이 제시한 증거들 앞에서 더 이상 버티지 못했습니다.\n\n`) +
      `[사건 종결] 박성철 회장 살인 사건 — 범인 ${culprit.name} 체포.\n\n` +
      `${caseData.truth.story}\n\n` +
      (correct
        ? `✅ 동기와 방법까지 모두 정확히 맞추셨습니다. 완벽한 수사였습니다.`
        : `⚠️ 범인은 맞추셨지만 동기 또는 방법이 완전하지 않았습니다.`);
  } else {
    ending =
      `[오판]\n\n` +
      `당신은 ${accused?.name ?? '알 수 없음'}을(를) 범인으로 지목했습니다.\n\n` +
      `하지만 그/그녀는 무고했습니다.\n\n` +
      `실제 범인은 ${culprit.name}이었으며, 당신이 수사하는 동안 증거를 인멸하고 도주했습니다.\n\n` +
      `${caseData.truth.story}`;
  }

  return {
    correct: culpritCorrect,
    score,
    ending,
    confession: culpritCorrect ? caseData.truth.confession : undefined,
  };
}
