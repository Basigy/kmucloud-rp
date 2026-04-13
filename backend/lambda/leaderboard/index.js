// ============================================================
// Lambda: 리더보드 (RDS 버전)
// GET  /leaderboard?difficulty=all|easy|medium|hard|master
// POST /leaderboard  { playerName, caseId, ... }
// ============================================================

const { query } = require('../lib/db');

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

  try {
    if (event.httpMethod === 'GET') {
      return await handleGet(event);
    }
    if (event.httpMethod === 'POST') {
      return await handlePost(event);
    }
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ message: 'Method Not Allowed' }) };
  } catch (err) {
    console.error('[leaderboard]', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ success: false, message: err.message }) };
  }
};

async function handleGet(event) {
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

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({
      success: true,
      scores: rows.map(r => ({
        playerName: r.player_name,
        caseId: r.case_id,
        caseTitle: r.case_title,
        difficulty: r.difficulty,
        score: r.score,
        isCorrect: !!r.is_correct,
        remainingAP: r.remaining_ap,
        evidenceCount: r.evidence_count,
        timestamp: r.created_at,
      })),
    }),
  };
}

async function handlePost(event) {
  const body = JSON.parse(event.body || '{}');
  const { playerName, caseId, caseTitle, difficulty, score, isCorrect, remainingAP, evidenceCount } = body;

  if (!playerName || !difficulty || score === undefined) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ success: false, message: '필수 항목 누락' }) };
  }

  await query(
    `INSERT INTO leaderboard (player_name, case_id, case_title, difficulty, score, is_correct, remaining_ap, evidence_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [playerName, caseId || null, caseTitle || null, difficulty, score, isCorrect ? 1 : 0, remainingAP || 0, evidenceCount || 0],
  );

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({ success: true }),
  };
}
