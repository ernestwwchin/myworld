# Bootstrap Guide — First-Time Setup

This guide covers the one-time manual steps required before CI/CD can manage the infrastructure automatically.

## Prerequisites

- AWS CLI configured with admin access
- OpenTofu v1.8+ installed
- GitHub CLI (`gh`) authenticated

## Chicken-and-Egg Resources

These resources must exist **before** tofu can run, but are normally managed **by** tofu:

| Resource | Why it's needed first | Created by |
|---|---|---|
| S3 state bucket | tofu needs it to store state | Manual (step 1) |
| IAM infra role | GitHub Actions needs it to run tofu | Manual (step 2) |
| OIDC provider | Infra role trust policy depends on it | Manual (step 2) |
| GitHub environments | Workflows reference them | Manual (step 3) |

After the first `tofu apply`, these resources are imported into state and managed by tofu going forward.

## Step 1 — Create State Bucket

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

aws s3api create-bucket \
  --bucket myworld-tfstate-${ACCOUNT_ID} \
  --region ap-southeast-1 \
  --create-bucket-configuration LocationConstraint=ap-southeast-1

aws s3api put-bucket-versioning \
  --bucket myworld-tfstate-${ACCOUNT_ID} \
  --versioning-configuration Status=Enabled

aws s3api put-public-access-block \
  --bucket myworld-tfstate-${ACCOUNT_ID} \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

## Step 2 — Create OIDC Provider and Infra Role

The infra role is normally managed in `tofu/shared/`, but it must exist before CI can run.
Create it manually, then import it into tofu state.

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create OIDC provider (skip if it already exists)
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 \
  2>/dev/null || echo "OIDC provider already exists"

# Create the infra role
cat > /tmp/trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:ernestwwchin/myworld:*"
        },
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF

aws iam create-role \
  --role-name myworld-infra \
  --assume-role-policy-document file:///tmp/trust-policy.json \
  --tags Key=Project,Value=myworld

# Attach broad admin policy for initial bootstrap (will be scoped by tofu later)
aws iam attach-role-policy \
  --role-name myworld-infra \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

rm /tmp/trust-policy.json
```

> **Note:** The AdminAccess policy is temporary. After `tofu apply` on the shared stack,
> the role policy is replaced with the scoped inline policy defined in `tofu/shared/main.tf`.
> Run `aws iam detach-role-policy --role-name myworld-infra --policy-arn arn:aws:iam::aws:policy/AdministratorAccess`
> after the first successful apply.

## Step 3 — Set Up GitHub Environments

```bash
# Create environments
gh api -X PUT repos/ernestwwchin/myworld/environments/nonprod
gh api -X PUT repos/ernestwwchin/myworld/environments/prod

# Set variables — nonprod
gh variable set AWS_ACCOUNT_ID --body "<your-account-id>" --env nonprod -R ernestwwchin/myworld
gh variable set DOMAIN --body "myworld-nonprod.ernestwwchin.com" --env nonprod -R ernestwwchin/myworld
gh variable set CACHE_TTL --body "0" --env nonprod -R ernestwwchin/myworld

# Set variables — prod
gh variable set AWS_ACCOUNT_ID --body "<your-account-id>" --env prod -R ernestwwchin/myworld
gh variable set DOMAIN --body "myworld.ernestwwchin.com" --env prod -R ernestwwchin/myworld
gh variable set CACHE_TTL --body "86400" --env prod -R ernestwwchin/myworld

# Add approval gate on prod (replace USER_ID with your GitHub user ID)
USER_ID=$(gh api users/ernestwwchin --jq '.id')
gh api -X PUT repos/ernestwwchin/myworld/environments/prod \
  --input - <<EOF
{
  "reviewers": [{"type": "User", "id": ${USER_ID}}],
  "deployment_branch_policy": {
    "protected_branches": true,
    "custom_branch_policies": false
  }
}
EOF
```

## Step 4 — First Tofu Apply (Local)

Run locally using your admin profile. Order matters: shared → nonprod → prod.

```bash
export AWS_PROFILE="<your-admin-profile>"
export TF_VAR_account_id="<your-account-id>"

# 4a. Shared stack (OIDC, ACM, infra role)
cd tofu/shared
tofu init
tofu import aws_iam_openid_connect_provider.github \
  arn:aws:iam::${TF_VAR_account_id}:oidc-provider/token.actions.githubusercontent.com
tofu import aws_iam_role.infra myworld-infra
tofu apply

# 4b. Nonprod
cd ../nonprod
export TF_VAR_domain="myworld-nonprod.ernestwwchin.com"
export TF_VAR_cache_ttl=0
tofu init
tofu apply

# 4c. Prod
cd ../prod
export TF_VAR_domain="myworld.ernestwwchin.com"
export TF_VAR_cache_ttl=86400
tofu init
tofu apply
```

## Step 5 — Tighten Infra Role

After the first successful apply, remove the temporary admin policy:

```bash
aws iam detach-role-policy \
  --role-name myworld-infra \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
```

The scoped inline policy from `tofu/shared/main.tf` is now active.

## Step 6 — DNS Records

Add CNAME records for each environment pointing to the CloudFront distribution domains:

- `myworld` → prod CloudFront domain
- `myworld-nonprod` → nonprod CloudFront domain

Get the CloudFront domains from tofu output:

```bash
cd tofu/nonprod && tofu output cloudfront_url
cd ../prod && tofu output cloudfront_url
```

DNS is managed via GoDaddy. See the **my-home** repo README for API commands and current record list.

## After Bootstrap

Once all steps are complete, CI/CD handles everything:

- Push to `main` → deploy nonprod → (approve) → deploy prod
- PR with `tofu/**` changes → plan all stacks → merge → apply shared → nonprod → (approve) → prod
