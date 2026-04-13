// ============================================================
// The Verdict v2 - 비주얼 노벨 + 행동 포인트 시스템
// ============================================================

export type Difficulty = 'easy' | 'medium' | 'hard' | 'master';
export type GamePhase = 'explore' | 'interrogating' | 'traveling' | 'accuse' | 'result';

// ── 행동 포인트 설정 ──────────────────────────────────────
export const INITIAL_AP: Record<Difficulty, number> = {
  easy: 40,
  medium: 35,
  hard: 30,
  master: 25,
};

export const AP_COST = {
  move: 1,
  quick_investigate: 1,
  investigate: 2,
  light_question: 2,
  interrogate: 3,
  analyze: 2,
  call: 1,
} as const;

export type APAction = keyof typeof AP_COST;

// ── 장소 ─────────────────────────────────────────────────
export interface Investigation {
  id: string;
  name: string;
  icon: string;
  cost: number;
  type: 'quick' | 'detailed';
  isImportant: boolean;  // ⭐ 중요 증거 힌트
  completed: boolean;
  evidenceId?: string;   // 발견되는 증거 ID
  // MVP 더미: 발견 시 보여줄 텍스트
  findingText: string;
}

export interface Location {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  bgFrom: string;      // Tailwind gradient from
  bgVia: string;       // Tailwind gradient via
  bgTo: string;        // Tailwind gradient to
  description: string; // 현장 묘사
  arrivalText: string; // 도착 시 내레이션
  suspectIds: string[];
  investigations: Investigation[];
  visited: boolean;
  moveCost: number;
}

// ── 용의자 ────────────────────────────────────────────────
export interface Suspect {
  id: string;
  name: string;
  role: string;
  age: number;
  personality: string;
  alibi: string;
  isCulprit: boolean;
  locationId: string;
  stressLevel: number;   // 0-100
  portraitEmoji: string;
  introText: string;     // 처음 만났을 때
  backstory: string;
  motive?: string;
  interrogated: boolean;
}

// ── 증거 ─────────────────────────────────────────────────
export interface Evidence {
  id: string;
  name: string;
  icon: string;
  locationId: string;
  investigationId: string;
  description: string;  // 짧은 설명
  detail: string;       // 수집 후 상세
  importance: 'key' | 'supporting' | 'red_herring';
  collectedAt?: string;
  tags: string[];
}

// ── 심문 대화 ─────────────────────────────────────────────
export interface DialogueMessage {
  role: 'detective' | 'suspect' | 'narration';
  text: string;
}

export interface InterrogationQuestion {
  id: string;
  text: string;
  shortLabel: string;
  cost: number;
  requiresEvidenceId?: string;   // 특정 증거가 있어야 함
  evidencePresented?: string[];  // 제시할 증거 목록
}

export interface InterrogationSession {
  suspectId: string;
  messages: DialogueMessage[];
  stressLevel: number;
  hasConfessed: boolean;
  questionsAsked: string[];
}

// ── 사건 ─────────────────────────────────────────────────
export interface Case {
  caseId: string;
  title: string;
  subtitle: string;
  difficulty: Difficulty;
  briefing: string;      // 사건 브리핑 (경찰서에서)
  victim: {
    name: string;
    role: string;
    description: string;
  };
  startLocationId: string;
  locations: Location[];
  suspects: Suspect[];
  evidence: Evidence[];
  truth: {
    culpritId: string;
    motive: string;
    method: string;
    story: string;       // 범행 경위
    confession: string;  // 범인 고백
  };
  // 기소 선택지
  accusationOptions: {
    motives: string[];
    methods: string[];
  };
  // MVP: 하드코딩 심문 응답
  interrogationResponses: Record<string, Record<string, string>>;
  // MVP: 조사 결과 텍스트 (investigationId → text)
  investigationResults: Record<string, string>;
}

// ── 게임 상태 ─────────────────────────────────────────────
export interface GameState {
  caseId: string;
  difficulty: Difficulty;
  phase: GamePhase;

  // 행동 포인트
  actionPoints: number;
  maxActionPoints: number;

  // 탐색
  currentLocationId: string;
  locations: Location[];   // mutable copy (visited 추적)
  suspects: Suspect[];     // mutable copy (stress 추적)

  // 증거
  collectedEvidenceIds: string[];

  // 심문 세션
  interrogationSessions: Record<string, InterrogationSession>;
  activeInterrogationId: string | null;

  // UI 상태
  notebookOpen: boolean;
  mapOpen: boolean;
  lastFinding: {           // 조사 결과 팝업
    evidenceId?: string;
    text: string;
    icon: string;
  } | null;

  // 기소
  accusation?: {
    culpritId: string;
    motive: string;
    method: string;
  };

  // 결과
  result?: {
    correct: boolean;
    score: number;
    ending: string;
    confession?: string;
  };
}
