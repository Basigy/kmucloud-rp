// ============================================================
// API: AI 사건 생성 (Gemini + 더미 데이터 폴백)
// POST /api/generate  { difficulty }
// → { success, caseId, caseData }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import type { Case, Difficulty } from '../../../types/game';
import { dummyCase } from '../../../lib/dummy-data';

const SUSPECT_COUNTS: Record<Difficulty, number> = { easy: 3, medium: 5, hard: 7, master: 10 };
const LOCATION_COUNTS: Record<Difficulty, number> = { easy: 5, medium: 6, hard: 7, master: 8 };
const AP_LIMITS: Record<Difficulty, number> = { easy: 40, medium: 35, hard: 30, master: 25 };

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

export async function POST(request: NextRequest) {
  try {
    const { difficulty = 'easy' } = await request.json() as { difficulty: Difficulty };

    const suspectCount = SUSPECT_COUNTS[difficulty] ?? 3;
    const locationCount = LOCATION_COUNTS[difficulty] ?? 5;
    const apLimit = AP_LIMITS[difficulty] ?? 40;

    let caseData: Case;

    if (GEMINI_API_KEY) {
      try {
        caseData = await generateWithGemini(difficulty, suspectCount, locationCount, apLimit);
      } catch (err) {
        console.warn('[generate] Gemini 실패, 더미 데이터 사용:', (err as Error).message);
        caseData = makeFallbackCase(difficulty);
      }
    } else {
      console.info('[generate] GEMINI_API_KEY 없음 — 더미 데이터 사용');
      caseData = makeFallbackCase(difficulty);
    }

    const caseId = `case_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    caseData.caseId = caseId;
    caseData.difficulty = difficulty;

    return NextResponse.json({ success: true, caseId, caseData });
  } catch (err) {
    console.error('[generate]', err);
    return NextResponse.json(
      { success: false, message: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'POST { difficulty } 로 사건을 생성하세요.' });
}

// ── Gemini 사건 생성 ───────────────────────────────────────
async function generateWithGemini(
  difficulty: Difficulty,
  suspectCount: number,
  locationCount: number,
  apLimit: number,
): Promise<Case> {
  const prompt = buildPrompt(difficulty, suspectCount, locationCount, apLimit);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 8000, temperature: 0.9 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API 오류 (${res.status}): ${errText}`);
  }

  const json = await res.json();
  const text: string = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini 응답에 텍스트가 없습니다');

  // JSON 추출
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) ?? text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) throw new Error('Gemini 응답에서 JSON을 찾을 수 없습니다');

  const parsed = JSON.parse(jsonMatch[1]) as Case;

  // 기본값 보정
  parsed.locations = parsed.locations.map(loc => ({
    ...loc,
    visited: false,
    moveCost: loc.moveCost ?? 1,
    investigations: loc.investigations.map(inv => ({
      ...inv,
      completed: false,
    })),
  }));

  parsed.suspects = parsed.suspects.map(s => ({
    ...s,
    interrogated: false,
    stressLevel: s.stressLevel ?? 20,
  }));

  return parsed;
}

// ── 폴백: 더미 데이터 ──────────────────────────────────────
function makeFallbackCase(difficulty: Difficulty): Case {
  const suspects = [...dummyCase.suspects];
  const culpritIdx = Math.floor(Math.random() * suspects.length);

  const remapped = suspects.map((s, i) => ({
    ...s,
    isCulprit: i === culpritIdx,
  }));

  const newCulprit = remapped[culpritIdx];

  return {
    ...dummyCase,
    caseId: '',
    difficulty,
    locations: dummyCase.locations.map(l => ({ ...l, visited: false })),
    suspects: remapped,
    truth: {
      ...dummyCase.truth,
      culpritId: newCulprit.id,
    },
  };
}

// ── 프롬프트 ──────────────────────────────────────────────
function buildPrompt(
  difficulty: Difficulty,
  suspectCount: number,
  locationCount: number,
  apLimit: number,
): string {
  return `당신은 서울 2033년을 배경으로 한 한국 추리 비주얼 노벨 게임 작가입니다.

난이도: ${difficulty} | 용의자: ${suspectCount}명 | 장소: ${locationCount}개 | 행동 포인트 한도: ${apLimit}

매번 완전히 새롭고 다른 사건을 생성하세요. 범인은 매번 달라야 합니다.

필수 조건:
- 범인은 반드시 초반부터 등장 (녹스의 십계)
- 범인은 완벽해 보이는 알리바이가 있지만 허점이 있음
- 레드 헤링 2개 이상
- 모든 장소를 방문하면 행동 포인트 초과 (전략적 선택 필요)
- 각 장소당 조사 항목 3-4개
- 비극적이고 이해 가능한 동기
- 실제 한국 이름 사용

유효한 JSON만 출력하세요. 코드블록(\`\`\`json)으로 감싸도 됩니다.

JSON 구조:
{
  "title": "사건 제목",
  "subtitle": "서울 2033, 지역명",
  "difficulty": "${difficulty}",
  "briefing": "경찰서 브리핑 텍스트 (3-4문장)",
  "victim": { "name": "", "role": "", "description": "" },
  "startLocationId": "loc_police",
  "locations": [
    {
      "id": "loc_police", "name": "", "shortName": "", "icon": "이모지",
      "bgFrom": "#hex", "bgVia": "#hex", "bgTo": "#hex",
      "description": "", "arrivalText": "",
      "suspectIds": [], "moveCost": 0,
      "investigations": [
        { "id": "inv_xxx", "name": "", "icon": "이모지", "cost": 1,
          "type": "quick", "isImportant": false, "completed": false,
          "evidenceId": null, "findingText": "" }
      ]
    }
  ],
  "suspects": [
    { "id": "suspect_01", "name": "", "role": "", "age": 35,
      "personality": "", "alibi": "", "isCulprit": false,
      "locationId": "loc_xxx", "stressLevel": 20,
      "portraitEmoji": "이모지", "introText": "",
      "backstory": "", "interrogated": false }
  ],
  "evidence": [
    { "id": "ev_01", "name": "", "icon": "이모지",
      "locationId": "loc_xxx", "investigationId": "inv_xxx",
      "description": "", "detail": "",
      "importance": "key|supporting|red_herring", "tags": [] }
  ],
  "truth": { "culpritId": "", "motive": "", "method": "",
             "story": "", "confession": "" },
  "accusationOptions": {
    "motives": ["5개"], "methods": ["5개"]
  },
  "interrogationResponses": {
    "suspect_01": { "alibi": "", "relationship": "", "pressure": "", "confession": "" }
  },
  "investigationResults": {}
}`;
}
