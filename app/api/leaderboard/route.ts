// ============================================================
// API: 리더보드
// GET  /api/leaderboard?difficulty=all|easy|medium|hard|master
// POST /api/leaderboard  { playerName, caseId, caseTitle,
//                          difficulty, score, isCorrect,
//                          remainingAP, evidenceCount, timestamp }
// ── DynamoDB 연동 + 인메모리 폴백 (AWS 미설정 시)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';

const TABLE = process.env.LEADERBOARD_TABLE ?? process.env.CASES_TABLE ?? 'the-verdict-cases';
const REGION = process.env.AWS_REGION ?? 'us-east-1';

// ── 인메모리 폴백 (DynamoDB 미설정 시) ─────────────────────
// 프로세스 재시작 시 초기화되는 임시 저장소
const memoryStore: ScoreEntry[] = [];

export interface ScoreEntry {
  playerName: string;
  caseId: string;
  caseTitle: string;
  difficulty: string;
  score: number;
  isCorrect: boolean;
  remainingAP: number;
  evidenceCount: number;
  timestamp: string;
}

// DynamoDB 클라이언트 (지연 초기화)
let dynamo: DynamoDBClient | null = null;
function getClient() {
  if (!dynamo) dynamo = new DynamoDBClient({ region: REGION });
  return dynamo;
}

function hasAwsCreds() {
  return !!(
    process.env.AWS_ACCESS_KEY_ID ||
    process.env.AWS_PROFILE ||
    process.env.AWS_EXECUTION_ENV
  );
}

// ── POST: 점수 저장 ──────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ScoreEntry;
    const { playerName, difficulty, score, isCorrect, timestamp } = body;

    if (!playerName || !difficulty || score === undefined) {
      return NextResponse.json({ success: false, message: '필수 항목 누락' }, { status: 400 });
    }

    if (hasAwsCreds()) {
      try {
        await getClient().send(new PutItemCommand({
          TableName: TABLE,
          Item: {
            PK: { S: 'LEADERBOARD' },
            SK: { S: `${difficulty}#${new Date(timestamp).getTime()}#${playerName}` },
            playerName: { S: playerName },
            caseId: { S: body.caseId ?? '' },
            caseTitle: { S: body.caseTitle ?? '' },
            difficulty: { S: difficulty },
            score: { N: String(score) },
            isCorrect: { BOOL: isCorrect },
            remainingAP: { N: String(body.remainingAP ?? 0) },
            evidenceCount: { N: String(body.evidenceCount ?? 0) },
            timestamp: { S: timestamp },
            TTL: { N: String(Math.floor(Date.now() / 1000) + 86400 * 90) },
          },
        }));
        return NextResponse.json({ success: true, store: 'dynamodb' });
      } catch (err) {
        console.warn('[leaderboard POST] DynamoDB 실패, 인메모리로 폴백:', (err as Error).message);
      }
    }

    // 인메모리 저장
    memoryStore.push(body);
    // 최대 500개 유지
    if (memoryStore.length > 500) memoryStore.splice(0, memoryStore.length - 500);

    return NextResponse.json({ success: true, store: 'memory' });
  } catch (err) {
    console.error('[leaderboard POST]', err);
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 500 });
  }
}

// ── GET: 랭킹 조회 ───────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const difficulty = searchParams.get('difficulty') ?? 'all';

  try {
    if (hasAwsCreds()) {
      try {
        const result = await getClient().send(new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: {
            ':pk': { S: 'LEADERBOARD' },
            ':prefix': { S: difficulty === 'all' ? '' : difficulty },
          },
          ScanIndexForward: false,
          Limit: 200,
        }));

        const items: ScoreEntry[] = (result.Items ?? []).map(item => ({
          playerName: item.playerName?.S ?? '',
          caseId: item.caseId?.S ?? '',
          caseTitle: item.caseTitle?.S ?? '',
          difficulty: item.difficulty?.S ?? '',
          score: Number(item.score?.N ?? 0),
          isCorrect: item.isCorrect?.BOOL ?? false,
          remainingAP: Number(item.remainingAP?.N ?? 0),
          evidenceCount: Number(item.evidenceCount?.N ?? 0),
          timestamp: item.timestamp?.S ?? '',
        }));

        const sorted = items.sort((a, b) => b.score - a.score).slice(0, 100);
        return NextResponse.json({ success: true, scores: sorted, store: 'dynamodb' });
      } catch (err) {
        console.warn('[leaderboard GET] DynamoDB 실패, 인메모리로 폴백:', (err as Error).message);
      }
    }

    // 인메모리 폴백
    let scores = [...memoryStore];
    if (difficulty !== 'all') {
      scores = scores.filter(s => s.difficulty === difficulty);
    }
    scores.sort((a, b) => b.score - a.score);

    return NextResponse.json({ success: true, scores: scores.slice(0, 100), store: 'memory' });
  } catch (err) {
    console.error('[leaderboard GET]', err);
    return NextResponse.json({ success: false, scores: [], message: (err as Error).message }, { status: 500 });
  }
}
