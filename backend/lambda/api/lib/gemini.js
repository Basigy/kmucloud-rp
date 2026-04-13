// ============================================================
// 공통 Gemini API 호출 모듈 - 모든 Lambda에서 공유
// ============================================================

const https = require('https');

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

/**
 * Gemini API 호출
 * @param {string} prompt - 프롬프트 텍스트
 * @param {number} maxTokens - 최대 출력 토큰
 * @returns {Promise<string>} 응답 텍스트
 */
async function invokeGemini(prompt, maxTokens = 4000) {
  if (!API_KEY) throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.8,
    },
  });

  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(`Gemini API 오류: ${json.error.message}`));
            return;
          }
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) {
            reject(new Error('Gemini 응답에 텍스트가 없습니다'));
            return;
          }
          resolve(text);
        } catch (e) {
          reject(new Error(`Gemini 응답 파싱 실패: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = { invokeGemini };
