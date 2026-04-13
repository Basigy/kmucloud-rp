#!/bin/bash
# ============================================================
# The Verdict 백엔드 배포 스크립트 (AWS SAM)
# 사전 요구사항:
#   - AWS CLI 설치 및 자격 증명 설정
#   - SAM CLI 설치 (pip install aws-sam-cli)
# ============================================================

set -e  # 오류 시 중단

echo "🕵️ The Verdict 백엔드 배포 시작..."
echo "========================================"

# 작업 디렉토리 확인
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# AWS 리전 설정
REGION=${AWS_REGION:-us-east-1}
STACK_NAME="the-verdict"

echo "📦 Lambda 의존성 설치..."
for dir in lambda/generate-case lambda/investigate lambda/interrogate lambda/evaluate; do
  echo "  → $dir"
  cd "$dir"
  npm install --production --silent
  cd "$SCRIPT_DIR"
done

echo ""
echo "🔨 SAM 빌드..."
sam build --region "$REGION"

echo ""
echo "🚀 SAM 배포..."
sam deploy \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --no-fail-on-empty-changeset \
  --parameter-overrides \
    "ParameterKey=Environment,ParameterValue=prod"

echo ""
echo "📋 배포 결과:"
API_URL=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

echo "  API Gateway URL: $API_URL"
echo ""
echo "🔧 .env.local 업데이트:"
echo "  NEXT_PUBLIC_API_URL=$API_URL"
echo ""

# 자동으로 .env.local 업데이트 (프로젝트 루트)
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$ROOT_DIR/.env.local"

if [ -f "$ENV_FILE" ]; then
  if grep -q "NEXT_PUBLIC_API_URL" "$ENV_FILE"; then
    sed -i.bak "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=$API_URL|" "$ENV_FILE"
  else
    echo "NEXT_PUBLIC_API_URL=$API_URL" >> "$ENV_FILE"
  fi
  echo "✅ .env.local 업데이트 완료"
else
  echo "⚠️  .env.local이 없습니다. 직접 추가하세요:"
  echo "   echo 'NEXT_PUBLIC_API_URL=$API_URL' >> $ROOT_DIR/.env.local"
fi

echo ""
echo "✅ 배포 완료!"
echo "========================================"
echo "🎮 로컬 개발 서버: npm run dev"
echo "🌐 API 테스트: curl -X POST $API_URL/generate -d '{\"difficulty\":\"easy\"}'"
