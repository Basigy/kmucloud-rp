// ============================================================
// Gemini API 연동 (Bedrock 대체)
// 사건 생성 + 동적 심문 응답 생성
// ============================================================
// .env.local에 GEMINI_API_KEY 설정 필요
// ============================================================

import type { Case, Suspect, Evidence } from '../types/game';

const API_KEY = process.env.GEMINI_API_KEY ?? '';
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

// ── Gemini 호출 유틸 ──────────────────────────────────────
async function invokeModel(prompt: string, maxTokens: number = 4000): Promise<string> {
  if (!API_KEY) throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.8 },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API 오류 (${res.status}): ${err}`);
  }

  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini 응답에 텍스트가 없습니다');
  return text;
}

// ── 사건 생성 ─────────────────────────────────────────────
export async function generateCase(difficulty: string): Promise<Case> {
  const suspectCount =
    difficulty === 'easy' ? 3 : difficulty === 'medium' ? 5 : difficulty === 'hard' ? 7 : 10;

  const prompt = `당신은 한국 추리 소설 작가입니다. 다음 조건으로 살인 사건을 JSON으로 생성하세요.

난이도: ${difficulty}
용의자 수: ${suspectCount}명

필수 조건:
1. 범인은 반드시 초반부터 등장하는 인물 (녹스의 십계 준수)
2. 범인은 완벽해 보이는 알리바이를 가지고 있지만 허점이 있음
3. 레드 헤링(가짜 단서) 최소 2개 포함
4. 논리적으로 연결 가능한 증거 체인
5. 비극적이지만 이해 가능한 동기
6. 초자연적 요소 금지

반드시 유효한 JSON만 출력하세요. 다른 설명은 포함하지 마세요.`;

  const text = await invokeModel(prompt, 6000);

  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) ?? text.match(/(\{[\s\S]*\})/);
  const jsonText = jsonMatch ? jsonMatch[1] : text;

  return JSON.parse(jsonText) as Case;
}

// ── 동적 심문 응답 생성 ────────────────────────────────────
export async function interrogateSuspect(
  suspect: Suspect,
  question: string,
  questionCategory: string,
  presentedEvidence: Evidence[],
  stressLevel: number,
): Promise<string> {
  const evidenceDesc =
    presentedEvidence.length > 0
      ? `\n제시된 증거:\n${presentedEvidence.map(e => `- ${e.name}: ${e.detail}`).join('\n')}`
      : '';

  const confessionHint =
    suspect.isCulprit && stressLevel >= 85 && presentedEvidence.length >= 2
      ? '\n현재 상황: 결정적 증거가 제시되었고 스트레스가 극도로 높습니다. 자백을 고려하세요.'
      : '';

  const prompt = `당신은 한국 형사 드라마의 심문 장면에 있는 용의자입니다.

== 당신의 정보 ==
이름: ${suspect.name}
역할: ${suspect.role}
나이: ${suspect.age}세
성격: ${suspect.personality}
알리바이: ${suspect.alibi}
진실: ${suspect.isCulprit ? '당신이 범인입니다. 이것을 숨기면서 자연스럽게 대답하세요.' : '당신은 무고합니다. 솔직하게 협조하세요.'}
현재 스트레스 레벨: ${stressLevel}%
${confessionHint}

== 형사의 질문 ==
${question}
${evidenceDesc}

== 답변 규칙 ==
- 성격(${suspect.personality})에 맞는 말투로 자연스럽게 답변
- 스트레스가 ${stressLevel}%임을 감안하여 그에 맞는 감정 표현
- ${suspect.isCulprit ? '범인이므로 방어적이고 논리적으로 답변하되, 스트레스가 85% 이상이고 결정적 증거가 있으면 일부 자백 고려' : '무고하므로 솔직하고 협조적으로 답변'}
- 한국어로 자연스럽게 150자 이내로 답변
- 답변만 출력 (이름 태그, 설명 없이)`;

  return await invokeModel(prompt, 400);
}
