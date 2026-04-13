// ============================================================
// The Verdict - 통합 Lambda (단일 함수로 모든 API 처리)
// API Gateway에서 {proxy+}로 연결
// ============================================================

const { invokeGemini } = require('./lib/gemini');
const { query, queryOne } = require('./lib/db');
const crypto = require('crypto');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  // 경로에서 라우팅 (예: /prod/generate → generate)
  const path = (event.path || '').replace(/^\/*(prod|dev)?\/*/, '').split('/')[0];

  try {
    switch (path) {
      case 'generate':    return await handleGenerate(event);
      case 'investigate':  return await handleInvestigate(event);
      case 'interrogate':  return await handleInterrogate(event);
      case 'evaluate':     return await handleEvaluate(event);
      case 'leaderboard':  return await handleLeaderboard(event);
      default:
        return respond(404, { success: false, message: `알 수 없는 경로: ${path}` });
    }
  } catch (err) {
    console.error(`[${path}]`, err);
    return respond(500, { success: false, message: err.message });
  }
};

function respond(statusCode, body) {
  return { statusCode, headers: CORS, body: JSON.stringify(body) };
}

// ═════════════════════════════════════════════════════════════
// 1. 사건 생성
// ═════════════════════════════════════════════════════════════
const SUSPECT_COUNTS = { easy: 3, medium: 5, hard: 7, master: 10 };
const LOCATION_COUNTS = { easy: 5, medium: 6, hard: 7, master: 8 };
const AP_LIMITS = { easy: 40, medium: 35, hard: 30, master: 25 };

async function handleGenerate(event) {
  const { difficulty = 'easy' } = JSON.parse(event.body ?? '{}');
  const suspectCount = SUSPECT_COUNTS[difficulty] ?? 3;
  const locationCount = LOCATION_COUNTS[difficulty] ?? 5;
  const apLimit = AP_LIMITS[difficulty] ?? 40;

  const prompt = buildGeneratePrompt(difficulty, suspectCount, locationCount, apLimit);
  const text = await invokeGemini(prompt, 8000);

  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) ?? text.match(/(\{[\s\S]*\})/);
  const caseData = JSON.parse(jsonMatch ? jsonMatch[1] : text);

  const caseId = `case_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  caseData.caseId = caseId;
  caseData.difficulty = difficulty;

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await query(
    'INSERT INTO cases (case_id, difficulty, title, subtitle, case_data, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
    [caseId, difficulty, caseData.title || '미제 사건', caseData.subtitle || '', JSON.stringify(caseData), expiresAt],
  );

  return respond(200, { success: true, caseId, caseData });
}

// ═════════════════════════════════════════════════════════════
// 2. 장소 조사
// ═════════════════════════════════════════════════════════════
async function handleInvestigate(event) {
  const { caseId, userId, locationId, investigationId } = JSON.parse(event.body ?? '{}');
  if (!caseId || !locationId || !investigationId) {
    return respond(400, { success: false, message: 'caseId, locationId, investigationId 필요' });
  }

  const row = await queryOne('SELECT case_data FROM cases WHERE case_id = ?', [caseId]);
  if (!row) return respond(404, { success: false, message: '사건 없음' });

  const caseData = typeof row.case_data === 'string' ? JSON.parse(row.case_data) : row.case_data;
  const location = caseData.locations.find(l => l.id === locationId);
  const investigation = location?.investigations.find(i => i.id === investigationId);
  if (!investigation) return respond(404, { success: false, message: '조사 항목 없음' });

  const evidence = investigation.evidenceId
    ? caseData.evidence.find(e => e.id === investigation.evidenceId)
    : null;

  const prompt = `당신은 서울 2033년 배경 한국 형사 드라마의 내레이터입니다.
탐정이 "${location.name}"에서 "${investigation.name}"을 조사 중입니다.
장소: ${location.description}
${evidence ? `발견될 증거: ${evidence.name} — ${evidence.description}` : '특별한 증거 없음'}
중요도: ${investigation.isImportant ? '높음' : '보통'}
탐정 시점 발견 묘사 2-3문장. 한국어, 형사 드라마 문체. 텍스트만:`;

  const findingText = (await invokeGemini(prompt, 300)).trim();

  if (userId) {
    const existing = await queryOne(
      'SELECT completed_investigations, collected_evidence FROM game_progress WHERE case_id = ? AND user_id = ?',
      [caseId, userId],
    );
    if (existing) {
      const ci = JSON.parse(existing.completed_investigations || '[]');
      const ce = JSON.parse(existing.collected_evidence || '[]');
      if (!ci.includes(investigationId)) ci.push(investigationId);
      if (evidence && !ce.includes(evidence.id)) ce.push(evidence.id);
      await query('UPDATE game_progress SET completed_investigations = ?, collected_evidence = ? WHERE case_id = ? AND user_id = ?',
        [JSON.stringify(ci), JSON.stringify(ce), caseId, userId]);
    } else {
      await query('INSERT INTO game_progress (case_id, user_id, completed_investigations, collected_evidence) VALUES (?, ?, ?, ?)',
        [caseId, userId, JSON.stringify([investigationId]), JSON.stringify(evidence ? [evidence.id] : [])]);
    }
  }

  return respond(200, {
    success: true,
    result: {
      findingText,
      evidence: evidence ? { id: evidence.id, name: evidence.name, icon: evidence.icon, description: evidence.description, detail: evidence.detail, importance: evidence.importance, tags: evidence.tags } : null,
    },
  });
}

// ═════════════════════════════════════════════════════════════
// 3. 심문
// ═════════════════════════════════════════════════════════════
async function handleInterrogate(event) {
  const { caseId, userId, suspectId, questionId, questionText, evidenceIds = [], stressLevel = 0 } = JSON.parse(event.body ?? '{}');
  if (!caseId || !suspectId || !questionId) {
    return respond(400, { success: false, message: 'caseId, suspectId, questionId 필요' });
  }

  const row = await queryOne('SELECT case_data FROM cases WHERE case_id = ?', [caseId]);
  if (!row) return respond(404, { success: false, message: '사건 없음' });

  const caseData = typeof row.case_data === 'string' ? JSON.parse(row.case_data) : row.case_data;
  const suspect = caseData.suspects.find(s => s.id === suspectId);
  if (!suspect) return respond(404, { success: false, message: '용의자 없음' });

  const history = await query(
    'SELECT question_text, answer_text FROM interrogation_history WHERE case_id = ? AND suspect_id = ? ORDER BY created_at DESC LIMIT 10',
    [caseId, suspectId],
  );

  const presentedEvidence = evidenceIds.map(eid => caseData.evidence.find(e => e.id === eid)).filter(Boolean);
  const keyEvidenceCount = presentedEvidence.filter(e => e.importance === 'key').length;
  const isConfession = suspect.isCulprit && stressLevel >= 85 && keyEvidenceCount >= 2;

  const historyText = history.length > 0
    ? `\n이전 대화:\n${history.map(h => `Q: ${h.question_text}\nA: ${h.answer_text}`).join('\n')}` : '';
  const evidenceText = presentedEvidence.length > 0
    ? `\n제시된 증거:\n${presentedEvidence.map(e => `- ${e.name}: ${e.detail}`).join('\n')}` : '';

  const prompt = `한국 형사 드라마 심문 장면의 용의자입니다.
이름: ${suspect.name}, 역할: ${suspect.role}, 나이: ${suspect.age}세
성격: ${suspect.personality}, 알리바이: ${suspect.alibi}
${suspect.isCulprit ? '당신이 범인. 숨기면서 답변.' : '무고. 솔직하게 협조.'}
스트레스: ${stressLevel}%
${isConfession ? '⚠️ 결정적 증거+극도 스트레스. 자백 고려.' : ''}
${historyText}
형사 질문: ${questionText || questionId}
${evidenceText}
성격에 맞는 말투, 한국어 150자 이내, 답변만:`;

  const answer = (await invokeGemini(prompt, 400)).trim();

  let stressIncrease = 5;
  if (keyEvidenceCount > 0) stressIncrease += keyEvidenceCount * 10;
  if (questionId === 'pressure') stressIncrease += 10;
  const newStressLevel = Math.min(100, stressLevel + stressIncrease);

  await query(
    'INSERT INTO interrogation_history (case_id, user_id, suspect_id, question_id, question_text, answer_text, stress_level, confessed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [caseId, userId || null, suspectId, questionId, questionText || questionId, answer, newStressLevel, isConfession ? 1 : 0],
  );

  return respond(200, { success: true, result: { answer, stressIncrease, confessed: isConfession, newStressLevel } });
}

// ═════════════════════════════════════════════════════════════
// 4. 기소 평가
// ═════════════════════════════════════════════════════════════
async function handleEvaluate(event) {
  const { caseId, userId, accusation, gameState } = JSON.parse(event.body ?? '{}');
  if (!caseId || !accusation?.culpritId) {
    return respond(400, { success: false, message: 'caseId, accusation.culpritId 필요' });
  }

  const row = await queryOne('SELECT case_data FROM cases WHERE case_id = ?', [caseId]);
  if (!row) return respond(404, { success: false, message: '사건 없음' });

  const caseData = typeof row.case_data === 'string' ? JSON.parse(row.case_data) : row.case_data;
  const truth = caseData.truth;

  const culpritCorrect = accusation.culpritId === truth.culpritId;
  const motiveCorrect = accusation.motive === truth.motive;
  const methodCorrect = accusation.method === truth.method;
  const allCorrect = culpritCorrect && motiveCorrect && methodCorrect;

  let score = 0;
  if (culpritCorrect) {
    score += 1000;
    if (motiveCorrect) score += 200;
    if (methodCorrect) score += 200;
    const ap = gameState?.actionPoints ?? 0;
    const maxAp = gameState?.maxActionPoints ?? 40;
    score += Math.round((ap / maxAp) * 300);
  }
  const evidenceCount = gameState?.collectedEvidenceIds?.length ?? 0;
  score += evidenceCount * 50;

  const culprit = caseData.suspects.find(s => s.id === truth.culpritId);
  const accused = caseData.suspects.find(s => s.id === accusation.culpritId);

  const prompt = culpritCorrect
    ? `한국 형사 드라마 극적 결말. 범인 ${culprit.name}(${culprit.role}) 체포 장면. 동기: ${truth.motive}. 방법: ${truth.method}. 진실: ${truth.story}. 한국어 3-4문장, 텍스트만:`
    : `한국 형사 드라마 씁쓸한 결말. 탐정이 ${accused?.name || '잘못된 인물'}을 지목했지만 틀림. 진범은 ${culprit.name}. 한국어 3-4문장, 텍스트만:`;

  const ending = (await invokeGemini(prompt, 800)).trim();

  await query(
    'INSERT INTO game_results (case_id, user_id, is_correct, culprit_correct, motive_correct, method_correct, score, remaining_ap, evidence_count, ending_text, confession_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [caseId, userId || null, allCorrect ? 1 : 0, culpritCorrect ? 1 : 0, motiveCorrect ? 1 : 0, methodCorrect ? 1 : 0, score, gameState?.actionPoints ?? 0, evidenceCount, ending, culpritCorrect ? truth.confession : null],
  );

  return respond(200, {
    success: true,
    result: { correct: allCorrect, culpritCorrect, motiveCorrect, methodCorrect, score, ending, confession: culpritCorrect ? truth.confession : null, truth: { culpritId: truth.culpritId, motive: truth.motive, method: truth.method } },
  });
}

// ═════════════════════════════════════════════════════════════
// 5. 리더보드
// ═════════════════════════════════════════════════════════════
async function handleLeaderboard(event) {
  if (event.httpMethod === 'GET') {
    const difficulty = event.queryStringParameters?.difficulty || 'all';
    let sql, params;
    if (difficulty === 'all') {
      sql = 'SELECT * FROM leaderboard ORDER BY score DESC LIMIT 100';
      params = [];
    } else {
      sql = 'SELECT * FROM leaderboard WHERE difficulty = ? ORDER BY score DESC LIMIT 100';
      params = [difficulty];
    }
    const rows = await query(sql, params);
    return respond(200, {
      success: true,
      scores: rows.map(r => ({
        playerName: r.player_name, caseId: r.case_id, caseTitle: r.case_title,
        difficulty: r.difficulty, score: r.score, isCorrect: !!r.is_correct,
        remainingAP: r.remaining_ap, evidenceCount: r.evidence_count, timestamp: r.created_at,
      })),
    });
  }

  // POST
  const { playerName, caseId, caseTitle, difficulty, score, isCorrect, remainingAP, evidenceCount } = JSON.parse(event.body || '{}');
  if (!playerName || !difficulty || score === undefined) {
    return respond(400, { success: false, message: '필수 항목 누락' });
  }
  await query(
    'INSERT INTO leaderboard (player_name, case_id, case_title, difficulty, score, is_correct, remaining_ap, evidence_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [playerName, caseId || null, caseTitle || null, difficulty, score, isCorrect ? 1 : 0, remainingAP || 0, evidenceCount || 0],
  );
  return respond(200, { success: true });
}

// ═════════════════════════════════════════════════════════════
// 프롬프트
// ═════════════════════════════════════════════════════════════
function buildGeneratePrompt(difficulty, suspectCount, locationCount, apLimit) {
  return `당신은 한국 추리 소설 작가입니다. 다음 조건으로 살인 사건을 JSON으로 생성하세요.

난이도: ${difficulty} (용의자 ${suspectCount}명, 장소 ${locationCount}곳, 행동포인트 ${apLimit})

필수 조건:
1. 범인은 반드시 초반부터 등장하는 인물
2. 범인은 완벽해 보이는 알리바이를 가지고 있지만 허점이 있음
3. 레드 헤링 최소 2개 포함
4. 논리적으로 연결 가능한 증거 체인
5. 비극적이지만 이해 가능한 동기

JSON 구조:
{
  "title": "사건 제목",
  "subtitle": "부제",
  "briefing": "사건 개요 (3-4문장)",
  "victim": { "name": "", "role": "", "description": "" },
  "startLocationId": "loc_police",
  "locations": [
    { "id": "loc_xxx", "name": "", "shortName": "", "icon": "이모지",
      "bgFrom": "#hex", "bgVia": "#hex", "bgTo": "#hex",
      "description": "", "arrivalText": "",
      "suspectIds": [], "moveCost": 1, "visited": false,
      "investigations": [
        { "id": "inv_xxx", "name": "", "icon": "이모지", "cost": 1-2,
          "type": "quick|detailed", "isImportant": true/false,
          "completed": false, "evidenceId": "ev_xxx 또는 null",
          "findingText": "발견 텍스트" }
      ] }
  ],
  "suspects": [
    { "id": "suspect_xx", "name": "", "role": "", "age": 숫자,
      "personality": "", "alibi": "", "isCulprit": true/false,
      "locationId": "loc_xxx", "stressLevel": 0-35,
      "portraitEmoji": "이모지", "introText": "",
      "backstory": "", "interrogated": false }
  ],
  "evidence": [
    { "id": "ev_xx", "name": "", "icon": "이모지",
      "locationId": "loc_xxx", "investigationId": "inv_xxx",
      "description": "", "detail": "",
      "importance": "key|supporting|red_herring", "tags": [] }
  ],
  "truth": { "culpritId": "", "motive": "", "method": "",
             "story": "", "confession": "" },
  "accusationOptions": { "motives": ["5개"], "methods": ["5개"] },
  "interrogationResponses": {
    "suspect_xx": { "alibi": "", "relationship": "", "pressure": "" }
  },
  "investigationResults": {}
}

JSON만 출력하세요.`;
}
