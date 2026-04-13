// ============================================================
// API: 기소 평가 + AI 결말 생성
// MVP: 정답 확인 + 하드코딩 결말
// 2단계: Bedrock으로 극적인 결말 생성
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { dummyCase } from '../../../lib/dummy-data';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseId, accusation, gameState } = body;

    if (!caseId || !accusation) {
      return NextResponse.json(
        { success: false, message: 'caseId, accusation 필요' },
        { status: 400 },
      );
    }

    const { culpritId, motive, method } = accusation;

    // ── 정답 확인 ────────────────────────────────────────────
    const culpritCorrect = culpritId === dummyCase.truth.culpritId;
    const motiveCorrect = motive === dummyCase.truth.motive;
    const methodCorrect = method === dummyCase.truth.method;
    const allCorrect = culpritCorrect && motiveCorrect && methodCorrect;

    const culprit = dummyCase.suspects.find(s => s.id === dummyCase.truth.culpritId)!;
    const accused = dummyCase.suspects.find(s => s.id === culpritId)!;

    // ── 점수 계산 ────────────────────────────────────────────
    let score = 0;
    if (culpritCorrect) {
      score += 1000;
      if (motiveCorrect) score += 200;
      if (methodCorrect) score += 200;
      const ap = gameState?.actionPoints ?? 0;
      const maxAp = gameState?.maxActionPoints ?? 40;
      score += Math.floor((ap / maxAp) * 600);
      const evCount = gameState?.collectedEvidenceIds?.length ?? 0;
      score += evCount * 50;
    }

    // ── MVP: 하드코딩 결말 텍스트 ───────────────────────────
    let ending = '';
    if (culpritCorrect) {
      ending =
        `[수사 결과 보고]\n\n` +
        `당신은 ${culprit.name}(${culprit.role})을(를) 범인으로 지목했습니다.\n\n` +
        `${culprit.name}은(는) 처음엔 부인했습니다. 그러나 당신이 제시한 증거들 — ` +
        `CCTV 영상, 수술 변경 기록, 독극물 분석 결과 — 앞에서 더 이상 버티지 못했습니다.\n\n` +
        `[2033.04.15 오후 11시 43분]\n` +
        `김철수는 강남경찰서 심문실에서 범행을 인정했습니다.\n\n` +
        (allCorrect
          ? `✅ 범인, 동기, 방법 모두 정확합니다. 완벽한 수사였습니다.`
          : `⚠️ 범인은 맞추셨지만 동기 또는 방법이 완전히 일치하지 않았습니다.`);
    } else {
      ending =
        `[오판]\n\n` +
        `당신은 ${accused?.name}을(를) 범인으로 지목했습니다.\n\n` +
        `하지만 그/그녀는 무고했습니다.\n\n` +
        `실제 범인 ${culprit.name}은(는) 당신이 수사하는 동안 결정적 증거를 인멸하고 도주했습니다.\n\n` +
        `사건은 미제로 남겨졌습니다.`;
    }

    return NextResponse.json({
      success: true,
      result: {
        correct: culpritCorrect,
        allCorrect,
        score,
        ending,
        confession: culpritCorrect ? dummyCase.truth.confession : undefined,
        truth: culpritCorrect ? {
          culpritName: culprit.name,
          motive: dummyCase.truth.motive,
          method: dummyCase.truth.method,
          story: dummyCase.truth.story,
        } : undefined,
      },
    });

    /* ──────────────────────────────────────────────────────
    // 2단계: Bedrock으로 극적인 결말 생성
    ──────────────────────────────────────────────────────

    const { BedrockRuntimeClient, InvokeModelCommand } = await import(
      '@aws-sdk/client-bedrock-runtime'
    );
    const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

    const endingPrompt = `당신은 한국 형사 드라마 작가입니다.
사건: ${dummyCase.title}
플레이어 지목: ${accused?.name}
실제 범인: ${culprit.name}
정답 여부: ${culpritCorrect ? '정답' : '오답'}

${culpritCorrect
  ? `범인 자백 장면을 극적으로 묘사하세요. 진실: ${dummyCase.truth.story}`
  : `억울한 사람이 누명을 쓰고, 진짜 범인이 도주하는 장면을 묘사하세요.`}

3-4단락, 영화 엔딩 자막 스타일:`;

    const response = await client.send(new InvokeModelCommand({
      modelId: process.env.BEDROCK_MODEL_ID ?? 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 800,
        messages: [{ role: 'user', content: endingPrompt }],
      }),
    }));

    const bedrockResult = JSON.parse(new TextDecoder().decode(response.body));
    ending = bedrockResult.content[0].text.trim();

    return NextResponse.json({ success: true, result: { correct: culpritCorrect, score, ending, ... } });
    ────────────────────────────────────────────────────── */
  } catch (err) {
    console.error('[evaluate]', err);
    return NextResponse.json({ success: false, message: '오류 발생' }, { status: 500 });
  }
}
