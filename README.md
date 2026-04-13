# 🕵️ The Verdict: 72시간의 함정

> **추리 소설의 정수를 구현한 AI 기반 동적 수사 게임**

## 🚀 즉시 실행 (1단계 MVP)

```bash
cd the-verdict
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

---

## 📁 프로젝트 구조

```
the-verdict/
├── app/
│   ├── page.tsx                    # 메인 화면 (난이도 선택)
│   ├── layout.tsx                  # 루트 레이아웃
│   ├── globals.css                 # 전역 스타일 (Noir 테마)
│   └── game/[caseId]/page.tsx      # 게임 메인 (상태 관리)
│   └── api/
│       ├── generate/route.ts       # 사건 생성 API
│       └── interrogate/route.ts    # 심문 API
├── components/
│   ├── CommandCenter.tsx           # 지휘실 (타이머, 명성, 뉴스)
│   ├── SceneInvestigation.tsx      # 현장 조사 (증거 수집)
│   ├── EvidenceBoard.tsx           # 증거 보드 (드래그앤드롭)
│   ├── InterrogationRoom.tsx       # 심문실
│   └── Accusation.tsx              # 기소 + 결과
├── lib/
│   ├── dummy-data.ts               # MVP 더미 사건 (재벌가의 비극)
│   ├── game-logic.ts               # 점수/타이머/심문 로직
│   ├── bedrock.ts                  # AWS Bedrock 연동 (2단계)
│   └── utils.ts                    # 유틸리티
├── types/
│   └── game.ts                     # TypeScript 타입 정의
└── backend/                        # AWS Lambda + SAM (3단계)
    ├── lambda/
    │   ├── generate-case/
    │   ├── interrogate/
    │   └── evaluate/
    ├── template.yaml               # SAM 템플릿
    └── deploy.sh                   # 배포 스크립트
```

---

## 🎮 게임 플레이 가이드

### 탭 구성
| 탭 | 설명 |
|---|---|
| 📡 지휘실 | 타이머, 명성 점수, 실시간 뉴스 피드, 사건 개요 |
| 🔍 현장조사 | 장소 탐색 → 증거 클릭으로 수집 |
| 🗂️ 증거보드 | 카드 드래그 배치 + 🔗 버튼으로 증거 연결 |
| 🎤 심문실 | 용의자 선택 → 질문 → 증거 제시 → 심문 |
| ⚖️ 기소 | 범인 선택 + 증거 제시 + 이유 작성 → 결과 |

### 게임 규칙
- ⏱ **30분** 안에 범인을 찾아야 합니다 (게임 내 72시간)
- ⭐ **명성 100점** 시작, 잘못된 기소 시 -30점
- 🎤 용의자당 **최대 3회** 심문 가능
- 📦 증거 수집 시 +2점, 연결 시 +3점

### 수사 팁
1. **현장조사** 탭에서 모든 장소를 탐색해 증거를 수집하세요
2. **증거보드**에서 증거 간 연관성을 파악하세요
3. 결정적 증거(CCTV, 독극물병)를 들고 **심문**하면 효과적입니다
4. 스트레스가 85% 이상이면 범인이 흔들립니다

---

## ⚙️ 단계별 설정

### 1단계 (MVP) - 즉시 실행
```bash
npm install && npm run dev
```
더미 데이터(재벌가의 비극)로 전체 게임 플레이 가능.

### 2단계 - AWS Bedrock 연동

```bash
cp .env.example .env.local
# .env.local에 AWS 자격 증명 입력
```

```.env.local
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
```

`app/api/generate/route.ts`와 `app/api/interrogate/route.ts`에서 Bedrock 코드 블록 주석 해제.

**필요한 AWS IAM 권한:**
- `bedrock:InvokeModel` on `anthropic.claude-3-5-sonnet-20241022-v2:0`

### 3단계 - AWS 배포

```bash
# AWS CLI + SAM CLI 설치 필요
pip install aws-sam-cli

cd backend
./deploy.sh
```

SAM이 자동으로:
- Lambda 함수 3개 생성 (generate-case, interrogate, evaluate)
- API Gateway 설정
- DynamoDB 테이블 생성

---

## 🧩 기술 스택

| 영역 | 기술 |
|---|---|
| 프레임워크 | Next.js 14 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS (Noir 다크 테마) |
| AI | AWS Bedrock (Claude 3.5 Sonnet) |
| 드래그앤드롭 | 네이티브 HTML5 Drag API |
| 인프라 | AWS SAM (Lambda + API GW + DynamoDB) |

---

## 💀 게임 철학: 본격 추리물의 5대 원칙

1. **페어 플레이** — 모든 단서는 공정하게 제공
2. **녹스의 십계** — 범인은 초반 등장 인물, 초자연 금지
3. **레드 헤링** — 의도적 미끼 증거로 난이도 조절
4. **반전의 쾌감** — 자백 시 극적인 순간 연출
5. **논리적 해결** — 논리적 사고로 충분히 도달 가능한 진실

---

## 📊 점수 계산

| 항목 | 점수 |
|---|---|
| 정답 기소 기본 | +1,000 |
| 남은 시간 보너스 | 최대 +500 |
| 명성 보너스 | 최대 +300 |
| 증거 수집 (개당) | +50 |
| 증거 연결 (개당) | +30 |
| 잘못된 기소 | 명성 -30 |

---

Made with ❤️ using Next.js + AWS Bedrock
