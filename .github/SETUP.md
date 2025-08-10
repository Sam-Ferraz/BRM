# GitHub Environment Setup Guide

This guide walks you through configuring GitHub repository secrets and variables for automated deployment.

## Step 1: Configure GitHub Secrets

Go to your repository → **Settings** → **Secrets and variables** → **Actions**

### Required Secrets
Click **New repository secret** for each:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `AWS_ACCESS_KEY_ID` | `AKIA...` | Your AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | `...` | Your AWS IAM secret key |
| `DB_PASSWORD` | `fF42xseaDcTIXHiHEhoo` | RDS database password |
| `JWT_SECRET` | `4e6d0f24126b50a71a12c0765bb7c8ff` | JWT authentication secret |

## Step 2: Configure GitHub Variables  

Click **Variables** tab, then **New repository variable** for each:

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `DB_HOST` | `brm-dev.clgci46a88lk.sa-east-1.rds.amazonaws.com` | RDS endpoint |
| `DB_PORT` | `5432` | Database port |
| `DB_NAME` | `brm-dev` | Database name |
| `DB_USER` | `postgres` | Database username |
| `JWT_EXPIRES_IN` | `7d` | JWT token expiration |

## Step 3: IAM Permissions

Ensure your AWS IAM user has these permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "cloudformation:*",
                "ecs:*",
                "ecr:*",
                "logs:*",
                "iam:PassRole",
                "ec2:DescribeAvailabilityZones",
                "ec2:DescribeVpcs",
                "ec2:DescribeSubnets",
                "elasticloadbalancing:*"
            ],
            "Resource": "*"
        }
    ]
}
```

## Step 4: Verify Configuration

After setup, test with a manual deployment:

1. Go to **Actions** tab
2. Select **Manual Deployment**
3. Click **Run workflow**
4. Choose options and run

## Environment Values Reference

Based on your `.env` file:

```bash
# Database Configuration
DB_HOST=brm-dev.clgci46a88lk.sa-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=brm-dev
DB_USER=postgres
DB_PASSWORD=fF42xseaDcTIXHiHEhoo  # ← GitHub Secret

# Authentication
JWT_SECRET=4e6d0f24126b50a71a12c0765bb7c8ff  # ← GitHub Secret
JWT_EXPIRES_IN=7d

# Application
PORT=3002  # ← Hardcoded in container
```

## Troubleshooting

**Secret not found error:**
- Verify secret names match exactly (case-sensitive)
- Check they're repository secrets, not environment secrets

**AWS permissions error:**
- Ensure IAM user has required permissions
- Check AWS region is `sa-east-1`

**Database connection error:**
- Verify RDS endpoint and credentials
- Check security group allows ECS access

## Security Notes

🔐 **Never commit secrets to code**
- Secrets are masked in GitHub Actions logs
- Use GitHub secrets for sensitive values
- Use variables for non-sensitive configuration

✅ **Best Practices:**
- Rotate AWS keys regularly
- Use least privilege IAM policies  
- Monitor AWS CloudTrail for API usage