// ============================================================
// API: 장소 조사 (investigate)
// MVP: 더미 결과 반환
// 2단계: Bedrock으로 동적 증거 설명 생성
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { dummyCase } from '../../../lib/dummy-data';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseId, locationId, investigationId } = body;

    if (!caseId || !locationId || !investigationId) {
      return NextResponse.json(
        { success: false, message: 'caseId, locationId, investigationId 필요' },
        { status: 400 },
      );
    }

    // ── MVP: 더미 데이터 ────────────────────────────────────
    const location = dummyCase.locations.find(l => l.id === locationId);
    const investigation = location?.investigations.find(i => i.id === investigationId);

    if (!investigation) {
      return NextResponse.json(
        { success: false, message: '조사 항목을 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    const evidence = investigation.evidenceId
      ? dummyCase.evidence.find(e => e.id === investigation.evidenceId)
      : null;

    return NextResponse.json({
      success: true,
      result: {
        findingText: investigation.findingText,
        evidence: evidence ? {
          id: evidence.id,
          name: evidence.name,
          icon: evidence.icon,
          description: evidence.description,
          detail: evidence.detail,
          importance: evidence.importance,
          tags: evidence.tags,
        } : null,
      },
    });

    /* ──────────────────────────────────────────────────────
    // 2단계: Bedrock으로 동적 조사 결과 생성
    ──────────────────────────────────────────────────────

    const { BedrockRuntimeClient, InvokeModelCommand } = await import(
      '@aws-sdk/client-bedrock-runtime'
    );
    const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

    const prompt = `당신은 한국 형사 드라마의 내레이터입니다.
탐정이 ${location.name}에서 "${investigation.name}"을 조사하고 있습니다.

다음 증거와 관련된 묘사를 생성하세요:
${evidence ? `증거: ${evidence.name} - ${evidence.description}` : '특별한 증거는 없음'}

규칙:
- 형사 드라마 문체 (3인칭 내레이션)
- 2-3문장, 생동감 있게
- 증거가 있으면 그 의미를 암시
- 한국어로 작성

결과 텍스트만 출력:`;

    const response = await client.send(new InvokeModelCommand({
      modelId: process.env.BEDROCK_MODEL_ID ?? 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    }));

    const result = JSON.parse(new TextDecoder().decode(response.body));
    const findingText = result.content[0].text.trim();

    return NextResponse.json({ success: true, result: { findingText, evidence } });
    ────────────────────────────────────────────────────── */
  } catch (err) {
    console.error('[investigate]', err);
    return NextResponse.json({ success: false, message: '오류 발생' }, { status: 500 });
  }
}
