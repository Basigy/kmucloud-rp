# The Verdict - AWS 수동 배포 가이드 (콘솔 기반)

## 아키텍처

```
[사용자 브라우저]
      ↓
[EC2 - Next.js 프론트엔드] ←→ [S3 - 정적 자산]
      ↓
[API Gateway (REST API)]
      ↓
[Lambda 1개 (통합)] ←→ [Google Gemini API]
      ↓
[RDS MySQL (기존)]
```

## 배포 순서 요약

1. Gemini API 키 준비
2. S3 버킷 생성
3. Lambda 함수 1개 생성 (기존 Role 연결)
4. API Gateway 생성 + Lambda 연결
5. RDS 스키마 실행
6. EC2 인스턴스 생성 + Next.js 배포

---

## Step 1: Gemini API 키 확인

> Lambda에서 Gemini API를 HTTPS로 직접 호출합니다.
> AWS 쪽 AI 권한은 필요 없습니다.

1. [Google AI Studio](https://aistudio.google.com/apikey) 에서 API 키 발급 (이미 있으면 그대로 사용)
2. 이 키를 Lambda 환경변수 `GEMINI_API_KEY`에 넣으면 됩니다

---

## Step 2: S3 버킷 생성

1. AWS 콘솔 → **S3** → **Create bucket**
2. 설정:
   - Bucket name: `the-verdict-assets-{본인학번}` (고유해야 함)
   - Region: **us-east-1**
   - **Block all public access** → 체크 해제 → "I acknowledge..." 체크
3. **Create bucket**

### CORS 설정
1. 버킷 클릭 → **Permissions** → **CORS** → Edit:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET"],
    "AllowedOrigins": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## Step 3: RDS 스키마 실행

기존 RDS에 접속해서 테이블을 만듭니다.

```bash
mysql -h <RDS_ENDPOINT> -P 3306 -u <USERNAME> -p < infra/rds-schema.sql
```

또는 MySQL Workbench / DBeaver에서 `infra/rds-schema.sql` 내용을 실행하세요.

생성되는 테이블 5개:
- `cases` — AI 생성 사건 데이터
- `game_progress` — 유저별 조사 진행
- `interrogation_history` — 심문 대화 이력
- `game_results` — 게임 결과
- `leaderboard` — 리더보드

---

## Step 4: Lambda 함수 생성 (1개)

### 4-1. 코드 패키징 (로컬에서)

```bash
# 프로젝트 루트에서 실행
bash infra/package-lambda.sh
```

`infra/the-verdict-api.zip` 파일이 생성됩니다.

### 4-2. Lambda 함수 생성 (콘솔)

1. AWS 콘솔 → **Lambda** → **Create function**
2. **Author from scratch** 선택
3. 설정:

| 항목 | 값 |
|------|-----|
| Function name | `the-verdict-api` |
| Runtime | **Node.js 18.x** |
| Architecture | x86_64 |
| Execution role | **Use an existing role** → 기존 Role 선택 |

4. **Create function**
5. **Code** 탭 → **Upload from** → **.zip file** → `the-verdict-api.zip` 업로드
6. **Configuration** → **General configuration** → Edit:
   - Timeout: **60초**
   - Memory: **512MB**

### 4-3. 환경변수 설정

**Configuration** → **Environment variables** → Edit:

| Key | Value |
|-----|-------|
| `GEMINI_API_KEY` | `본인 Gemini API 키` |
| `GEMINI_MODEL` | `gemini-2.0-flash` |
| `DB_HOST` | `기존 RDS 엔드포인트` |
| `DB_PORT` | `3306` |
| `DB_NAME` | `the_verdict` |
| `DB_USER` | `RDS 사용자명` |
| `DB_PASSWORD` | `RDS 비밀번호` |
| `S3_BUCKET` | `the-verdict-assets-{본인학번}` |

### 4-4. Lambda → RDS 네트워크 설정

Lambda가 RDS에 접근하려면 같은 네트워크에 있어야 합니다.

**방법 A: Lambda를 VPC에 넣기 (NAT Gateway 필요)**
1. **Configuration** → **VPC** → Edit
2. VPC: RDS와 같은 VPC
3. Subnets: 프라이빗 서브넷 2개
4. Security group: 새로 만든 Lambda 보안 그룹

> ⚠️ VPC에 넣으면 Gemini API(외부 HTTPS) 호출에 NAT Gateway가 필요합니다.

**방법 B: RDS를 퍼블릭으로 열기 (수업용 간편 방법, 권장)**
1. RDS 콘솔 → DB 인스턴스 → **Modify**
2. **Publicly accessible** → **Yes**
3. RDS 보안 그룹 → Inbound에 `0.0.0.0/0` 포트 3306 허용 (수업용만)
4. Lambda는 VPC 설정 안 함 → Gemini도 RDS도 둘 다 접근 가능

---

## Step 5: API Gateway 생성

### 5-1. REST API 생성

1. AWS 콘솔 → **API Gateway** → **Create API**
2. **REST API** → **Build**
3. API name: `the-verdict-api` → **Create API**

### 5-2. 프록시 리소스 생성 (한 번에 모든 경로 처리)

1. **Resources** → **/** 선택 → **Create Resource**
2. ✅ **Configure as proxy resource** 체크
3. Resource path: `{proxy+}` (자동 입력됨)
4. ✅ **Enable API Gateway CORS** 체크
5. **Create Resource**

### 5-3. Lambda 연결

1. `{proxy+}` 아래 **ANY** 메서드가 자동 생성됨
2. Integration type: **Lambda Function Proxy**
3. Lambda function: `the-verdict-api`
4. **Save** → 권한 추가 확인 → **OK**

### 5-4. 루트 경로도 연결

1. **/** 리소스 선택 → **Create Method**
2. Method: **ANY**
3. Integration type: **Lambda Function Proxy**
4. Lambda function: `the-verdict-api`
5. **Save**

### 5-5. CORS 설정

1. `{proxy+}` 리소스 선택 → **Enable CORS**
2. Access-Control-Allow-Origin: `*`
3. Access-Control-Allow-Headers: `Content-Type`
4. **Save**

### 5-6. API 배포

1. **Deploy API** 클릭
2. Stage: **New Stage** → Stage name: `prod`
3. **Deploy**
4. 상단 **Invoke URL** 복사

```
예: https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod
```

### 5-7. 테스트

```bash
# 사건 생성
curl -X POST https://{API_URL}/prod/generate \
  -H "Content-Type: application/json" \
  -d '{"difficulty":"easy"}'

# 리더보드
curl https://{API_URL}/prod/leaderboard?difficulty=all
```

---

## Step 6: EC2 인스턴스 생성 + Next.js 배포

### 6-1. EC2 보안 그룹 생성

1. **VPC** 콘솔 → **Security Groups** → **Create**
2. Name: `the-verdict-ec2-sg`
3. Inbound rules:

| Type | Port | Source |
|------|------|--------|
| SSH | 22 | My IP |
| HTTP | 80 | 0.0.0.0/0 |
| Custom TCP | 3000 | 0.0.0.0/0 |

### 6-2. EC2 인스턴스 생성

1. **EC2** → **Launch instances**
2. 설정:

| 항목 | 값 |
|------|-----|
| Name | `the-verdict-web` |
| AMI | **Amazon Linux 2023** |
| Instance type | **t3.medium** (또는 t2.micro) |
| Key pair | 기존 키페어 또는 새로 생성 |
| Network | 퍼블릭 서브넷 |
| Auto-assign public IP | **Enable** |
| Security group | `the-verdict-ec2-sg` |
| IAM instance profile | 기존 Role 선택 |
| Storage | 20GB gp3 |

3. **Launch instance**

### 6-3. EC2에 코드 배포

```bash
EC2_IP="<EC2_PUBLIC_IP>"
KEY="<키페어>.pem"

# 코드 업로드
scp -i $KEY -r \
  app components lib types public \
  package.json package-lock.json \
  next.config.js tailwind.config.ts \
  postcss.config.js tsconfig.json \
  next-env.d.ts \
  ec2-user@$EC2_IP:/home/ec2-user/the-verdict/
```

```bash
# EC2 접속
ssh -i $KEY ec2-user@$EC2_IP

# Node.js 설치
sudo dnf install -y nodejs20 npm git
sudo npm install -g pm2

cd /home/ec2-user/the-verdict

# 환경변수 파일 생성
cat > .env.local << 'EOF'
GEMINI_API_KEY={본인_GEMINI_API_KEY}
GEMINI_MODEL=gemini-2.0-flash
AWS_REGION=us-east-1
NEXT_PUBLIC_API_URL=https://{API_GATEWAY_URL}/prod
DB_HOST={RDS_ENDPOINT}
DB_PORT=3306
DB_NAME=the_verdict
DB_USER={RDS_USERNAME}
DB_PASSWORD={RDS_PASSWORD}
S3_BUCKET_NAME=the-verdict-assets-{본인학번}
EOF

# 빌드 & 실행
npm install
npm run build
pm2 start npm --name "the-verdict" -- start
pm2 save
```

### 6-4. 접속 확인

```
http://<EC2_PUBLIC_IP>:3000
```

---

## 체크리스트

| # | 항목 | ☐ |
|---|------|---|
| 1 | Gemini API 키 준비 | |
| 2 | S3 버킷 생성 + CORS | |
| 3 | RDS 스키마 실행 (5개 테이블) | |
| 4 | Lambda zip 패키징 (`bash infra/package-lambda.sh`) | |
| 5 | Lambda 함수 1개 생성 + zip 업로드 | |
| 6 | Lambda 환경변수 8개 설정 | |
| 7 | Lambda → RDS 네트워크 설정 | |
| 8 | API Gateway 생성 + {proxy+} + Lambda 연결 | |
| 9 | API Gateway 배포 (prod) | |
| 10 | API 테스트 (curl) | |
| 11 | EC2 보안 그룹 생성 | |
| 12 | EC2 인스턴스 생성 | |
| 13 | EC2에 코드 업로드 + .env.local 작성 | |
| 14 | npm install → build → pm2 start | |
| 15 | 브라우저 접속 확인 | |

---

## 트러블슈팅

### Lambda가 RDS에 연결 안 됨
- RDS가 퍼블릭이면: Lambda VPC 설정 안 해도 됨
- RDS가 프라이빗이면: Lambda를 같은 VPC에 넣고, RDS 보안 그룹에 Lambda SG 허용
- Lambda Role에 `AWSLambdaVPCAccessExecutionRole` 정책 필요 (VPC 사용 시)

### Lambda에서 Gemini API 호출 실패
- `GEMINI_API_KEY` 환경변수 확인
- Lambda가 VPC 안에 있으면 인터넷 접근 불가 → NAT Gateway 필요
- 수업용이면 RDS 퍼블릭 + Lambda VPC 밖이 가장 간단

### API Gateway 502 에러
- Lambda 로그 확인: CloudWatch → `/aws/lambda/the-verdict-api`
- Lambda timeout이 60초인지 확인
- **Lambda Proxy integration** 이 켜져 있는지 확인

### EC2에서 npm run build 실패 (메모리 부족)
```bash
sudo dd if=/dev/zero of=/swapfile bs=128M count=16
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### API Gateway에서 경로가 안 먹힘
- `{proxy+}` 리소스가 제대로 생성되었는지 확인
- Deploy를 다시 했는지 확인 (리소스 변경 후 반드시 재배포)
