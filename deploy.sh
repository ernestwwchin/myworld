#!/bin/bash
set -e

BUCKET="${AWS_S3_BUCKET:-wonwong-myworld-game}"
DISTRIBUTION_ID="${AWS_CF_DISTRIBUTION_ID}"
PROFILE="${AWS_PROFILE:?Set AWS_PROFILE before running deploy.sh}"

echo "Deploying to s3://$BUCKET ..."

aws s3 sync . s3://$BUCKET/ \
  --profile "$PROFILE" \
  --exclude "*" \
  --include "index.html" \
  --include "js/*" \
  --include "assets/*" \
  --include "data/*" \
  --delete

if [ -n "$DISTRIBUTION_ID" ]; then
  echo "Invalidating CloudFront cache..."
  aws cloudfront create-invalidation \
    --profile "$PROFILE" \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text
fi

echo "Done!"
