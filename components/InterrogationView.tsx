'use client';
// ── 비주얼 노벨 심문 화면 ─────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import type { GameState, Case, DialogueMessage } from '../types/game';
import { calculateStressIncrease, checkConfessionCondition } from '../lib/game-logic';

interface Props {
  suspectId: string;
  state: GameState;
  caseData: Case;
  onMessage: (suspectId: string, message: DialogueMessage, stressIncrease: number, confessed: boolean) => void;
  onClose: () => void;
  onSpendAP: (cost: number) => void;
}

// 질문 정의
const QUESTIONS = [
  { id: 'alibi', label: '알리바이 묻기', icon: '🕐', cost: 3, type: 'alibi' as const },
  { id: 'relationship', label: '피해자와 관계', icon: '💬', cost: 3, type: 'relationship' as const },
  { id: 'evidence_cctv', label: 'CCTV 증거 제시', icon: '📹', cost: 3, type: 'evidence' as const, requiresEvidenceId: 'ev_02' },
  { id: 'evidence_bottle', label: '약병 증거 제시', icon: '🧪', cost: 3, type: 'evidence' as const, requiresEvidenceId: 'ev_03' },
  { id: 'evidence_will', label: '유언장 제시', icon: '📄', cost: 3, type: 'evidence' as const, requiresEvidenceId: 'ev_04' },
  { id: 'evidence_record', label: '수술 기록 제시', icon: '📋', cost: 3, type: 'evidence' as const, requiresEvidenceId: 'ev_05' },
  { id: 'pressure', label: '압박 심문', icon: '⚡', cost: 3, type: 'pressure' as const },
];

export default function InterrogationView({
  suspectId,
  state,
  caseData,
  onMessage,
  onClose,
  onSpendAP,
}: Props) {
  const [isTyping, setIsTyping] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [currentFullText, setCurrentFullText] = useState('');
  const dialogueEndRef = useRef<HTMLDivElement>(null);

  const suspect = caseData.suspects.find(s => s.id === suspectId)!;
  const suspectState = state.suspects.find(s => s.id === suspectId)!;
  const session = state.interrogationSessions[suspectId];
  const messages = session?.messages ?? [];
  const currentStress = session?.stressLevel ?? suspectState.stressLevel;
  const hasConfessed = session?.hasConfessed ?? false;

  // 타이핑 효과
  useEffect(() => {
    if (!currentFullText || displayedText === currentFullText) return;
    let i = displayedText.length;
    const timer = setInterval(() => {
      if (i < currentFullText.length) {
        setDisplayedText(currentFullText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
        setIsTyping(false);
      }
    }, 18);
    return () => clearInterval(timer);
  }, [currentFullText]);

  // 스크롤 유지
  useEffect(() => {
    dialogueEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, displayedText]);

  const handleQuestion = async (questionId: string) => {
    if (isTyping || state.actionPoints < 3) return;
    const q = QUESTIONS.find(qu => qu.id === questionId)!;

    // 증거 필요 확인
    if (q.requiresEvidenceId && !state.collectedEvidenceIds.includes(q.requiresEvidenceId)) {
      return; // 증거 없으면 클릭 불가 (버튼 disable)
    }

    // AP 소모
    onSpendAP(q.cost);

    // 하드코딩 응답 조회
    const responses = caseData.interrogationResponses[suspectId];
    let responseText = responses?.[questionId] ?? responses?.['pressure'] ?? '(묵묵부답)';

    // 자백 조건 확인
    const stressIncrease = calculateStressIncrease(
      suspect.isCulprit,
      q.type,
      q.requiresEvidenceId ? 1 : 0,
    );
    const newStress = Math.min(100, currentStress + stressIncrease);

    const shouldConfess =
      suspect.isCulprit &&
      newStress >= 85 &&
      state.collectedEvidenceIds.filter(eid => {
        const ev = caseData.evidence.find(e => e.id === eid);
        return ev?.importance === 'key';
      }).length >= 2;

    if (shouldConfess && !hasConfessed) {
      responseText = responses?.['confession'] ?? responseText;
    }

    // 플레이어 메시지
    const playerMsg: DialogueMessage = { role: 'detective', text: q.label };
    onMessage(suspectId, playerMsg, 0, false);

    // 타이핑 애니메이션
    setIsTyping(true);
    setDisplayedText('');
    setCurrentFullText(responseText);

    // 용의자 응답 메시지
    const suspectMsg: DialogueMessage = { role: 'suspect', text: responseText };
    onMessage(suspectId, suspectMsg, stressIncrease, shouldConfess && !hasConfessed);
  };

  const stressColor =
    currentStress >= 70 ? 'text-red-400' : currentStress >= 40 ? 'text-orange-400' : 'text-yellow-400';
  const stressBarColor =
    currentStress >= 70 ? 'bg-red-500' : currentStress >= 40 ? 'bg-orange-500' : 'bg-yellow-500';

  return (
    <div className="fixed inset-0 z-40 bg-black/90 backdrop-blur-sm flex flex-col">
      {/* ── 배경: 심문실 분위기 ──────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #0a0505 0%, #1a0a0a 40%, #0d0000 100%)',
        }}
      />
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 48px, rgba(255,255,255,0.02) 48px, rgba(255,255,255,0.02) 49px)' }}
      />

      <div className="relative flex flex-col h-full max-w-2xl mx-auto w-full">
        {/* ── 상단: 용의자 프로필 ──────────────────── */}
        <div className="flex items-center gap-4 px-4 pt-20 pb-4 border-b border-zinc-800">
          {/* 초상화 */}
          <div className="relative">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-4xl border-2 ${
              currentStress >= 70 ? 'border-red-600' : 'border-zinc-600'
            } bg-zinc-900`}>
              {suspect.portraitEmoji}
            </div>
            {/* 긴장 표시 */}
            {currentStress >= 70 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-white font-black text-lg">{suspect.name}</h2>
              <span className="text-zinc-500 text-sm">{suspect.role}</span>
              {hasConfessed && (
                <span className="text-red-300 text-xs bg-red-950 border border-red-700 rounded px-2 py-0.5">자백</span>
              )}
            </div>
            {/* 스트레스 바 */}
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 text-xs">긴장도</span>
              <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-700 ${stressBarColor}`}
                  style={{ width: `${currentStress}%` }}
                />
              </div>
              <span className={`text-xs font-mono font-bold ${stressColor}`}>
                {currentStress}%
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white text-2xl leading-none shrink-0"
          >
            ✕
          </button>
        </div>

        {/* ── 대화 로그 ───────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-none">
          {/* 첫 등장 메시지 */}
          {messages.length === 0 && (
            <div className="text-center py-6">
              <div className="text-5xl mb-3">{suspect.portraitEmoji}</div>
              <div className="bg-zinc-900/80 border border-zinc-700 rounded-2xl px-4 py-3 inline-block max-w-sm text-left">
                <p className="text-zinc-300 text-sm leading-relaxed italic">{suspect.introText}</p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => {
            const isLast = i === messages.length - 1;
            if (msg.role === 'detective') {
              return (
                <div key={i} className="flex justify-end">
                  <div className="bg-blue-900/60 border border-blue-700/50 rounded-2xl rounded-tr-sm px-3 py-2 max-w-xs">
                    <p className="text-blue-100 text-sm">{msg.text}</p>
                  </div>
                </div>
              );
            }
            if (msg.role === 'narration') {
              return (
                <div key={i} className="text-center">
                  <p className="text-zinc-500 text-xs italic">{msg.text}</p>
                </div>
              );
            }
            return (
              <div key={i} className="flex gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xl bg-zinc-900 shrink-0 mt-1">
                  {suspect.portraitEmoji}
                </div>
                <div className={`bg-zinc-900/80 border rounded-2xl rounded-tl-sm px-3 py-2 max-w-xs ${
                  isTyping && isLast ? 'border-zinc-500' : 'border-zinc-700/50'
                }`}>
                  <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-line">
                    {isLast && isTyping ? displayedText : msg.text}
                    {isLast && isTyping && <span className="animate-pulse">|</span>}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={dialogueEndRef} />
        </div>

        {/* ── 질문 선택지 ─────────────────────────── */}
        <div className="border-t border-zinc-800 px-4 py-3 bg-zinc-950/90 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-zinc-500 text-xs uppercase tracking-widest">질문 선택</span>
            <span className="text-zinc-500 text-xs">
              행동 포인트: <span className="text-yellow-400 font-mono font-bold">{state.actionPoints}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto scrollbar-none">
            {QUESTIONS.map(q => {
              const alreadyAsked = session?.questionsAsked.includes(q.id) ?? false;
              const needsEvidence = q.requiresEvidenceId && !state.collectedEvidenceIds.includes(q.requiresEvidenceId);
              const canAfford = state.actionPoints >= q.cost;
              const disabled = alreadyAsked || isTyping || !canAfford || !!needsEvidence;

              return (
                <button
                  key={q.id}
                  onClick={() => !disabled && handleQuestion(q.id)}
                  disabled={disabled}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-sm transition-all ${
                    alreadyAsked
                      ? 'bg-zinc-900/20 border-zinc-800/30 text-zinc-600 line-through cursor-default'
                      : needsEvidence
                        ? 'bg-zinc-900/30 border-zinc-800/50 text-zinc-600 cursor-not-allowed'
                        : !canAfford
                          ? 'bg-zinc-900/30 border-zinc-800/50 text-zinc-600 cursor-not-allowed'
                          : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-200 hover:bg-zinc-700/60 hover:border-zinc-500 active:scale-[0.98]'
                  }`}
                >
                  <span>{q.icon}</span>
                  <span className="flex-1">{q.label}</span>
                  {needsEvidence && (
                    <span className="text-zinc-600 text-xs">[증거 필요]</span>
                  )}
                  <span className={`text-xs font-mono font-bold ml-auto ${
                    !canAfford && !alreadyAsked ? 'text-red-600' : 'text-zinc-500'
                  }`}>
                    {alreadyAsked ? '완료' : `-${q.cost}`}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={onClose}
            className="w-full py-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
          >
            대화 종료 (0점) →
          </button>
        </div>
      </div>
    </div>
  );
}
