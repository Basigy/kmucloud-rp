# 🕵️ The Verdict - AI 추리 게임

Google Gemini AI가 매번 새로운 살인 사건을 생성하고, 플레이어가 제한된 행동 포인트 안에서 증거를 수집하고 용의자를 심문하여 범인을 찾아내는 비주얼 노벨 스타일 추리 게임입니다.

## � 게임 소개

### 컨셉

서울 2033년, 당신은 강력반 형사입니다. AI가 생성한 살인 사건을 수사하세요.
매 게임마다 완전히 새로운 사건이 만들어지며, 같은 사건은 두 번 다시 나오지 않습니다.

### 게임 시스템

- **행동 포인트(AP)**: 모든 행동에 AP가 소모됩니다. 장소 이동(1), 간단 조사(1), 정밀 조사(2), 심문(3). AP가 0이 되면 강제로 기소 단계로 넘어갑니다.
- **장소 탐색**: 범죄 현장, 병원, 국과수 등 여러 장소를 돌아다니며 증거를 수집합니다. 모든 장소를 다 방문할 수 없기 때문에 전략적 선택이 필요합니다.
- **심문**: 용의자에게 질문하고 증거를 제시하면 AI가 용의자의 성격과 스트레스 수준에 따라 다른 반응을 보여줍니다. 스트레스가 85% 이상이고 핵심 증거 2개 이상 제시하면 자백을 받아낼 수 있습니다.
- **기소**: 범인, 동기, 범행 방법 3가지를 모두 맞춰야 완전 정답입니다. 남은 AP와 수집한 증거 수에 따라 보너스 점수가 부여됩니다.

### 난이도

| 난이도 | 용의자 | 장소 | 행동 포인트 |
|--------|--------|------|------------|
| 🟢 초급 | 3명 | 5곳 | 40 |
| 🟡 중급 | 5명 | 6곳 | 35 |
| 🔴 고급 | 7명 | 7곳 | 30 |
| 💀 마스터 | 10명 | 8곳 | 25 |

### 점수 계산

| 항목 | 점수 |
|------|------|
| 범인 정답 | +1000 |
| 동기 정답 | +200 |
| 방법 정답 | +200 |
| 남은 AP 비율 | 최대 +300 |
| 수집한 증거 | 개당 +50 |

---

## �🌐 접속 주소

**http://107.23.137.237:3000**

---

## 사용한 AWS 리소스

| AWS 서비스 | 용도 | 상세 |
|-----------|------|------|
| **EC2** (t3.medium) | Next.js 프론트엔드 호스팅 | Amazon Linux 2023, PM2로 프로세스 관리 |
| **Lambda** (1개, 통합) | 백엔드 API 처리 | generate / investigate / interrogate / evaluate / leaderboard 5개 엔드포인트를 단일 함수에서 라우팅 |
| **API Gateway** (REST API) | Lambda 엔드포인트 노출 | `{proxy+}` 프록시 리소스로 모든 경로를 Lambda에 전달 |
| **RDS** (MySQL) | 게임 데이터 저장 | 사건 데이터, 게임 진행, 심문 이력, 결과, 리더보드 (기존 RDS 인스턴스 사용) |
| **S3** | 정적 자산 저장 | 증거 이미지 등 게임 리소스 |

### 외부 서비스

| 서비스 | 용도 |
|--------|------|
| **Google Gemini API** (gemini-2.0-flash) | AI 사건 생성, 심문 동적 응답, 결말 내레이션 생성 |

---

## 아키텍처

```
[브라우저] → [EC2 - Next.js] → [API Gateway] → [Lambda (통합)] → [Gemini AI]
                  ↓                                    ↓
                [S3]                              [RDS MySQL]
```

---

## 실행 방법

### 1. 로컬 실행 (더미 데이터 모드, AWS 불필요)

```bash
git clone https://github.com/{레포주소}.git
cd the-verdict
npm install
npm run dev
```

http://localhost:3000 접속 — Gemini API 키 없이도 더미 사건 데이터로 플레이 가능합니다.

### 2. AWS 배포 실행

상세 배포 가이드: [infra/DEPLOY-GUIDE.md](infra/DEPLOY-GUIDE.md)

**요약:**
1. Gemini API 키 준비
2. S3 버킷 생성
3. RDS에 스키마 실행 (`infra/rds-schema.sql`)
4. Lambda 패키징 (`bash infra/package-lambda.sh`) → 콘솔에서 zip 업로드
5. API Gateway 생성 → `{proxy+}` 프록시로 Lambda 연결 → prod 스테이지 배포
6. EC2 생성 → 코드 업로드 → `npm install && npm run build && pm2 start npm --name the-verdict -- start`

### 환경변수 (.env.local)

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash
AWS_REGION=us-east-1
NEXT_PUBLIC_API_URL=https://your-api-gateway.execute-api.us-east-1.amazonaws.com/prod
DB_HOST=your-rds-endpoint
DB_PORT=3306
DB_NAME=the_verdict
DB_USER=admin
DB_PASSWORD=your_password
S3_BUCKET_NAME=your-bucket-name
```

---

## 테스트 방법

### 게임 플레이 테스트

1. http://107.23.137.237:3000 접속
2. 난이도 선택 (초급 권장 — 용의자 3명, AP 40)
3. 장소를 이동하며 조사 항목 클릭 → 증거 수집
4. 용의자 심문 → 스트레스 수치 확인
5. AP 소진 또는 준비 완료 시 → 기소 (범인 + 동기 + 방법 선택)
6. 결과 확인 → 리더보드 등록

### 샘플 데이터

Gemini API 연결 없이도 더미 사건 "재벌가의 비극"으로 테스트 가능합니다:
- 피해자: 박성철 (재벌 회장)
- 용의자 3명: 박지수 (딸), 김철수 (주치의), 이영희 (가정부)
- 정답: 김철수 / 의료 과실 폭로 위협 / 염화칼륨 정맥 주사

### API 테스트

```bash
# 사건 생성
curl -X POST http://107.23.137.237:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"difficulty":"easy"}'

# 리더보드 조회
curl http://107.23.137.237:3000/api/leaderboard?difficulty=all
```
