// ============================================================
// Lambda: 심문 응답 생성 함수 (Gemini + RDS)
// POST /interrogate
// ============================================================

const { invokeGemini } = require('../lib/gemini');
const { query, queryOne } = require('../lib/db');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

  try {
    const {
      caseId, userId, suspectId, questionId,
      questionText, evidenceIds = [], stressLevel = 0,
    } = JSON.parse(event.body ?? '{}');

    if (!caseId || !suspectId || !questionId) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: 'caseId, suspectId, questionId 필요' }) };
    }

    const row = await queryOne('SELECT case_data FROM cases WHERE case_id = ?', [caseId]);
    if (!row) {
      return { statusCode: 404, headers: CORS, body: JSON.stringify({ success: false, message: '사건 없음' }) };
    }

    const caseData = typeof row.case_data === 'string' ? JSON.parse(row.case_data) : row.case_data;
    const suspect = caseData.suspects.find(s => s.id === suspectId);
    if (!suspect) {
      return { statusCode: 404, headers: CORS, body: JSON.stringify({ success: false, message: '용의자 없음' }) };
    }

    // 대화 이력 로드
    const history = await query(
      'SELECT question_text, answer_text FROM interrogation_history WHERE case_id = ? AND suspect_id = ? ORDER BY created_at DESC LIMIT 10',
      [caseId, suspectId],
    );

    const presentedEvidence = evidenceIds
      .map(eid => caseData.evidence.find(e => e.id === eid))
      .filter(Boolean);

    const keyEvidenceCount = presentedEvidence.filter(e => e.importance === 'key').length;
    const isConfessionCondition = suspect.isCulprit && stressLevel >= 85 && keyEvidenceCount >= 2;

    const historyText = history.length > 0
      ? `\n이전 대화:\n${history.map(h => `Q: ${h.question_text}\nA: ${h.answer_text}`).join('\n')}`
      : '';

    const evidenceText = presentedEvidence.length > 0
      ? `\n제시된 증거:\n${presentedEvidence.map(e => `- ${e.name}: ${e.detail}`).join('\n')}`
      : '';

    const prompt = `당신은 한국 형사 드라마의 심문 장면에 있는 용의자입니다.

== 당신의 정보 ==
이름: ${suspect.name}
역할: ${suspect.role}
나이: ${suspect.age}세
성격: ${suspect.personality}
알리바이: ${suspect.alibi}
진실: ${suspect.isCulprit ? '당신이 범인입니다. 숨기면서 자연스럽게 대답하세요.' : '당신은 무고합니다.'}
스트레스: ${stressLevel}%
${isConfessionCondition ? '⚠️ 결정적 증거가 제시되었고 스트레스가 극도로 높습니다. 자백을 고려하세요.' : ''}
${historyText}

== 형사의 질문 ==
${questionText || questionId}
${evidenceText}

== 규칙 ==
- 성격에 맞는 말투로 자연스럽게 답변
- 한국어 150자 이내
- 답변만 출력`;

    const answer = (await invokeGemini(prompt, 400)).trim();

    // 스트레스 증가 계산
    let stressIncrease = 5;
    if (keyEvidenceCount > 0) stressIncrease += keyEvidenceCount * 10;
    if (questionId === 'pressure') stressIncrease += 10;
    const newStressLevel = Math.min(100, stressLevel + stressIncrease);
    const confessed = isConfessionCondition;

    // RDS: 대화 이력 저장
    await query(
      `INSERT INTO interrogation_history (case_id, user_id, suspect_id, question_id, question_text, answer_text, stress_level, confessed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [caseId, userId || null, suspectId, questionId, questionText || questionId, answer, newStressLevel, confessed ? 1 : 0],
    );

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        success: true,
        result: { answer, stressIncrease, confessed, newStressLevel },
      }),
    };
  } catch (err) {
    console.error('[interrogate]', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ success: false, message: err.message }) };
  }
};
