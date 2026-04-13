// ============================================================
// API: 심문 (interrogate)
// MVP: 하드코딩 응답
// 2단계: Bedrock Claude 스트리밍 대화
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { dummyCase } from '../../../lib/dummy-data';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      caseId,
      suspectId,
      questionId,
      evidenceIds = [],
      stressLevel = 0,
    } = body;

    if (!suspectId || !questionId) {
      return NextResponse.json(
        { success: false, message: 'suspectId, questionId 필요' },
        { status: 400 },
      );
    }

    // ── MVP: 하드코딩 응답 ───────────────────────────────────
    const responses = dummyCase.interrogationResponses[suspectId];
    if (!responses) {
      return NextResponse.json({ success: false, message: '알 수 없는 용의자' }, { status: 404 });
    }

    const suspect = dummyCase.suspects.find(s => s.id === suspectId)!;

    // 자백 조건 확인
    const keyEvidenceCount = (evidenceIds as string[]).filter(eid => {
      const ev = dummyCase.evidence.find(e => e.id === eid);
      return ev?.importance === 'key';
    }).length;

    const shouldConfess = suspect.isCulprit && stressLevel >= 85 && keyEvidenceCount >= 2;
    const answer = shouldConfess
      ? responses['confession'] ?? responses[questionId] ?? '(묵묵부답)'
      : responses[questionId] ?? responses['pressure'] ?? '(묵묵부답)';

    // 스트레스 증가 계산
    const stressIncrease =
      (evidenceIds as string[]).length > 0
        ? suspect.isCulprit ? 25 : 5
        : suspect.isCulprit ? 10 : 3;

    return NextResponse.json({
      success: true,
      answer,
      stressIncrease,
      confessed: shouldConfess,
      newStressLevel: Math.min(100, stressLevel + stressIncrease),
    });

    /* ──────────────────────────────────────────────────────
    // 2단계: Bedrock 실시간 대화 생성
    ──────────────────────────────────────────────────────

    const { BedrockRuntimeClient, InvokeModelCommand } = await import(
      '@aws-sdk/client-bedrock-runtime'
    );

    // DynamoDB에서 사건 로드
    // const caseData = await getCase(caseId);
    // const suspect = caseData.suspects.find(s => s.id === suspectId);

    const presentedEvidence = (evidenceIds as string[])
      .map(eid => dummyCase.evidence.find(e => e.id === eid))
      .filter(Boolean)
      .map(e => `${e!.name}: ${e!.description}`)
      .join('\n');

    const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
    const response = await client.send(new InvokeModelCommand({
      modelId: process.env.BEDROCK_MODEL_ID ?? 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: `당신은 ${suspect.name}입니다. 성격: ${suspect.personality}. 알리바이: ${suspect.alibi}.
진실: ${suspect.isCulprit ? '당신이 범인입니다 (이것을 숨길 것)' : '무고합니다'}.
스트레스: ${stressLevel}%.
${presentedEvidence ? `제시된 증거:\n${presentedEvidence}` : ''}
${shouldConfess ? '자백할 타이밍입니다.' : ''}
형사 질문: "${questionId}"
성격에 맞는 자연스러운 한국어로 150자 이내 답변:`,
        }],
      }),
    }));

    const result = JSON.parse(new TextDecoder().decode(response.body));
    return NextResponse.json({
      success: true,
      answer: result.content[0].text.trim(),
      stressIncrease,
      confessed: shouldConfess,
      newStressLevel: Math.min(100, stressLevel + stressIncrease),
    });
    ────────────────────────────────────────────────────── */
  } catch (err) {
    console.error('[interrogate]', err);
    return NextResponse.json({ success: false, message: '오류 발생' }, { status: 500 });
  }
}
