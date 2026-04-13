// ============================================================
// Lambda: 기소 평가 함수 (Gemini + RDS)
// POST /evaluate
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
    const { caseId, userId, accusation, gameState } = JSON.parse(event.body ?? '{}');

    if (!caseId || !accusation?.culpritId) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: 'caseId, accusation.culpritId 필요' }) };
    }

    const row = await queryOne('SELECT case_data FROM cases WHERE case_id = ?', [caseId]);
    if (!row) {
      return { statusCode: 404, headers: CORS, body: JSON.stringify({ success: false, message: '사건 없음' }) };
    }

    const caseData = typeof row.case_data === 'string' ? JSON.parse(row.case_data) : row.case_data;
    const truth = caseData.truth;

    // 정답 확인
    const culpritCorrect = accusation.culpritId === truth.culpritId;
    const motiveCorrect = accusation.motive === truth.motive;
    const methodCorrect = accusation.method === truth.method;
    const allCorrect = culpritCorrect && motiveCorrect && methodCorrect;

    // 점수 계산
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

    // Gemini로 결말 생성
    const culprit = caseData.suspects.find(s => s.id === truth.culpritId);
    const accused = caseData.suspects.find(s => s.id === accusation.culpritId);

    const prompt = culpritCorrect
      ? `한국 형사 드라마의 극적인 결말을 작성하세요.

범인 ${culprit.name}(${culprit.role})이 체포되는 장면입니다.
동기: ${truth.motive}
방법: ${truth.method}
진실: ${truth.story}

규칙: 한국어, 3인칭 내레이션, 3-4문장, 극적이고 여운 있게. 텍스트만 출력.`
      : `한국 형사 드라마의 씁쓸한 결말을 작성하세요.

탐정이 ${accused?.name || '잘못된 인물'}을 범인으로 지목했지만 틀렸습니다.
진짜 범인은 ${culprit.name}(${culprit.role})이었습니다.

규칙: 한국어, 3인칭 내레이션, 3-4문장, 아쉬움과 교훈. 텍스트만 출력.`;

    const ending = (await invokeGemini(prompt, 800)).trim();

    // RDS: 결과 저장
    await query(
      `INSERT INTO game_results (case_id, user_id, is_correct, culprit_correct, motive_correct, method_correct, score, remaining_ap, evidence_count, ending_text, confession_text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        caseId, userId || null, allCorrect ? 1 : 0,
        culpritCorrect ? 1 : 0, motiveCorrect ? 1 : 0, methodCorrect ? 1 : 0,
        score, gameState?.actionPoints ?? 0, evidenceCount,
        ending, culpritCorrect ? truth.confession : null,
      ],
    );

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        success: true,
        result: {
          correct: allCorrect,
          culpritCorrect, motiveCorrect, methodCorrect,
          score, ending,
          confession: culpritCorrect ? truth.confession : null,
          truth: { culpritId: truth.culpritId, motive: truth.motive, method: truth.method },
        },
      }),
    };
  } catch (err) {
    console.error('[evaluate]', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ success: false, message: err.message }) };
  }
};
