// ============================================================
// Lambda: 장소 조사 함수 (Gemini + RDS)
// POST /investigate
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
    const { caseId, userId, locationId, investigationId } = JSON.parse(event.body ?? '{}');

    if (!caseId || !locationId || !investigationId) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: 'caseId, locationId, investigationId 필요' }) };
    }

    const row = await queryOne('SELECT case_data FROM cases WHERE case_id = ?', [caseId]);
    if (!row) {
      return { statusCode: 404, headers: CORS, body: JSON.stringify({ success: false, message: '사건 없음' }) };
    }

    const caseData = typeof row.case_data === 'string' ? JSON.parse(row.case_data) : row.case_data;
    const location = caseData.locations.find(l => l.id === locationId);
    const investigation = location?.investigations.find(i => i.id === investigationId);

    if (!investigation) {
      return { statusCode: 404, headers: CORS, body: JSON.stringify({ success: false, message: '조사 항목 없음' }) };
    }

    const evidence = investigation.evidenceId
      ? caseData.evidence.find(e => e.id === investigation.evidenceId)
      : null;

    // Gemini로 조사 결과 생성
    const prompt = `당신은 서울 2033년을 배경으로 한 한국 형사 드라마의 내레이터입니다.

탐정이 "${location.name}"에서 "${investigation.name}"을 조사하고 있습니다.

장소 분위기: ${location.description}
${evidence ? `발견될 증거: ${evidence.name} — ${evidence.description}` : '특별한 증거 없음'}
조사 중요도: ${investigation.isImportant ? '높음 (핵심 단서)' : '보통'}

다음을 생성하세요:
1. 탐정 시점의 발견 묘사 (2-3문장, 긴장감 있게)
2. 증거가 있다면 그 의미를 암시 (직접적으로 답은 주지 말 것)

한국어, 형사 드라마 문체, 결과 텍스트만:`;

    const findingText = (await invokeGemini(prompt, 300)).trim();

    // RDS: 진행 저장
    if (userId) {
      const existing = await queryOne(
        'SELECT completed_investigations, collected_evidence FROM game_progress WHERE case_id = ? AND user_id = ?',
        [caseId, userId],
      );

      if (existing) {
        const completedInv = JSON.parse(existing.completed_investigations || '[]');
        const collectedEv = JSON.parse(existing.collected_evidence || '[]');
        if (!completedInv.includes(investigationId)) completedInv.push(investigationId);
        if (evidence && !collectedEv.includes(evidence.id)) collectedEv.push(evidence.id);

        await query(
          'UPDATE game_progress SET completed_investigations = ?, collected_evidence = ? WHERE case_id = ? AND user_id = ?',
          [JSON.stringify(completedInv), JSON.stringify(collectedEv), caseId, userId],
        );
      } else {
        await query(
          'INSERT INTO game_progress (case_id, user_id, completed_investigations, collected_evidence) VALUES (?, ?, ?, ?)',
          [caseId, userId, JSON.stringify([investigationId]), JSON.stringify(evidence ? [evidence.id] : [])],
        );
      }
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        success: true,
        result: {
          findingText,
          evidence: evidence ? {
            id: evidence.id, name: evidence.name, icon: evidence.icon,
            description: evidence.description, detail: evidence.detail,
            importance: evidence.importance, tags: evidence.tags,
          } : null,
        },
      }),
    };
  } catch (err) {
    console.error('[investigate]', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ success: false, message: err.message }) };
  }
};
