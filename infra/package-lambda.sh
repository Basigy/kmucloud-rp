#!/bin/bash
# ============================================================
# Lambda zip 패키징 스크립트 (통합 Lambda 1개)
# 실행: bash infra/package-lambda.sh
# 결과: infra/the-verdict-api.zip
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LAMBDA_DIR="$PROJECT_ROOT/backend/lambda/api"

echo "📦 Lambda 패키징 시작..."

# 공통 모듈 복사
mkdir -p "$LAMBDA_DIR/lib"
cp "$PROJECT_ROOT/backend/lambda/lib/db.js" "$LAMBDA_DIR/lib/db.js"
cp "$PROJECT_ROOT/backend/lambda/lib/gemini.js" "$LAMBDA_DIR/lib/gemini.js"

# 의존성 설치
cd "$LAMBDA_DIR"
npm install --production

# zip 생성
ZIP_PATH="$SCRIPT_DIR/the-verdict-api.zip"
rm -f "$ZIP_PATH"
zip -r "$ZIP_PATH" . -x "*.git*" "package-lock.json"

echo ""
echo "✅ 패키징 완료: infra/the-verdict-api.zip ($(du -h "$ZIP_PATH" | cut -f1))"
echo "→ AWS Lambda 콘솔에서 이 zip을 업로드하세요"
