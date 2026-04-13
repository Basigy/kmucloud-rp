// ============================================================
// Lambda: 사건 생성 함수 (Gemini + RDS)
// POST /generate
// ============================================================

const { invokeGemini } = require('../lib/gemini');
const { query } = require('../lib/db');
const crypto = require('crypto');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const SUSPECT_COUNTS = { easy: 3, medium: 5, hard: 7, master: 10 };
const LOCATION_COUNTS = { easy: 5, medium: 6, hard: 7, master: 8 };
const AP_LIMITS = { easy: 40, medium: 35, hard: 30, master: 25 };

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

  try {
    const { difficulty = 'easy' } = JSON.parse(event.body ?? '{}');
    const suspectCount = SUSPECT_COUNTS[difficulty] ?? 3;
    const locationCount = LOCATION_COUNTS[difficulty] ?? 5;
    const apLimit = AP_LIMITS[difficulty] ?? 40;

    const prompt = buildPrompt(difficulty, suspectCount, locationCount, apLimit);
    const text = await invokeGemini(prompt, 8000);

    // JSON 추출
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) ?? text.match(/(\{[\s\S]*\})/);
    const caseData = JSON.parse(jsonMatch ? jsonMatch[1] : text);

    const caseId = `case_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    caseData.caseId = caseId;
    caseData.difficulty = difficulty;

    // RDS 저장
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      `INSERT INTO cases (case_id, difficulty, title, subtitle, case_data, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [caseId, difficulty, caseData.title || '미제 사건', caseData.subtitle || '', JSON.stringify(caseData), expiresAt],
    );

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ success: true, caseId, caseData }),
    };
  } catch (err) {
    console.error('[generate-case]', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ success: false, message: err.message }) };
  }
};

function buildPrompt(difficulty, suspectCount, locationCount, apLimit) {
  return `당신은 한국 추리 소설 작가입니다. 다음 조건으로 살인 사건을 JSON으로 생성하세요.

난이도: ${difficulty} (용의자 ${suspectCount}명, 장소 ${locationCount}곳, 행동포인트 ${apLimit})

필수 조건:
1. 범인은 반드시 초반부터 등장하는 인물 (녹스의 십계 준수)
2. 범인은 완벽해 보이는 알리바이를 가지고 있지만 허점이 있음
3. 레드 헤링(가짜 단서) 최소 2개 포함
4. 논리적으로 연결 가능한 증거 체인
5. 비극적이지만 이해 가능한 동기
6. 초자연적 요소 금지

JSON 구조:
{
  "title": "사건 제목",
  "subtitle": "부제",
  "briefing": "사건 개요 (3-4문장)",
  "victim": { "name": "", "role": "", "description": "" },
  "startLocationId": "첫 장소 ID",
  "locations": [
    {
      "id": "loc_xxx", "name": "", "shortName": "", "icon": "이모지",
      "bgFrom": "#hex", "bgVia": "#hex", "bgTo": "#hex",
      "description": "", "arrivalText": "",
      "suspectIds": [], "moveCost": 1, "visited": false,
      "investigations": [
        { "id": "inv_xxx", "name": "", "icon": "이모지", "cost": 1-2,
          "type": "quick|detailed", "isImportant": true/false,
          "completed": false, "evidenceId": "ev_xxx 또는 없음",
          "findingText": "발견 텍스트" }
      ]
    }
  ],
  "suspects": [
    { "id": "suspect_xx", "name": "", "role": "", "age": 숫자,
      "personality": "", "alibi": "", "isCulprit": true/false,
      "locationId": "loc_xxx", "stressLevel": 0-35,
      "portraitEmoji": "이모지", "introText": "",
      "backstory": "", "motive": "범인만", "interrogated": false }
  ],
  "evidence": [
    { "id": "ev_xx", "name": "", "icon": "이모지",
      "locationId": "loc_xxx", "investigationId": "inv_xxx",
      "description": "", "detail": "",
      "importance": "key|supporting|red_herring",
      "tags": ["태그"] }
  ],
  "truth": { "culpritId": "", "motive": "", "method": "",
             "story": "진실 스토리", "confession": "자백 대사" },
  "accusationOptions": {
    "motives": ["동기1", "동기2", "동기3", "동기4", "동기5"],
    "methods": ["방법1", "방법2", "방법3", "방법4", "방법5"]
  },
  "interrogationResponses": {
    "suspect_xx": {
      "alibi": "알리바이 질문 응답",
      "relationship": "관계 질문 응답",
      "pressure": "압박 질문 응답"
    }
  }
}

JSON만 출력하고 다른 설명은 포함하지 마세요.`;
}
