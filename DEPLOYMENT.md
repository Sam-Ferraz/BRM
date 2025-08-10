# 🚀 BRM Deployment Guide

## Current Deployment Status

✅ **Production Environment**  
🌍 **Region:** sa-east-1 (São Paulo, Brazil)  
🔗 **URL:** http://brm-app-production-alb-146543119.sa-east-1.elb.amazonaws.com  
💚 **Health:** http://brm-app-production-alb-146543119.sa-east-1.elb.amazonaws.com/health  

This guide explains how to deploy the BRM application to AWS using ECS Fargate with CloudFormation.

## Architecture Overview

The deployment includes:
- **ECS Fargate**: Serverless container service
- **Application Load Balancer**: Internet-facing load balancer
- **ECR**: Container registry for Docker images
- **VPC**: Isolated network environment
- **CloudWatch**: Logging and monitoring
- **Cost-optimized**: Single instance, Fargate Spot pricing

## Prerequisites

1. **AWS CLI**: Install and configure with your credentials
   ```bash
   aws configure
   ```

2. **Docker**: Install Docker and ensure it's running
   ```bash
   docker --version
   docker ps
   ```

3. **Make**: Install Make utility (if not available)

## Quick Deployment

### Option 1: Using the deployment script
```bash
chmod +x deploy.sh
./deploy.sh
```

### Option 2: Using Make commands
```bash
# Full deployment
make deploy

# Or step by step
make deploy-infrastructure
make push-image
make update-service
```

## Configuration

### Environment Variables
The application uses these environment variables in production:
- `NODE_ENV=production`
- `PORT=3002`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `JWT_SECRET`
- `CLIENT_URL`

### Custom Parameters
You can customize the deployment by setting these variables:

```bash
# Set custom values
export APP_NAME=my-brm-app
export ENVIRONMENT=staging
export AWS_REGION=us-west-2

# Deploy with custom settings
make deploy
```

## Deployment Commands

### Infrastructure Management
```bash
make deploy-infrastructure    # Deploy CloudFormation stack
make status                  # Check deployment status
make get-url                # Get application URL
make cleanup                # Delete all resources
```

### Application Deployment
```bash
make build                  # Build Docker image locally
make push-image            # Build and push to ECR
make update-service        # Update ECS service
make quick-deploy         # Push image and update service only
```

### Monitoring and Debugging
```bash
make logs                  # View application logs
make status               # Check service status
make wait-for-deployment  # Wait for deployment completion
```

### Local Testing
```bash
make run-local            # Run application locally with Docker
make test-build          # Test Docker build
```

## Cost Optimization Features

1. **Fargate Spot**: Uses Spot pricing for cost savings
2. **Minimal Resources**: 256 CPU / 512 MB memory
3. **Single Instance**: One container for simplicity
4. **Short Log Retention**: 7-day CloudWatch logs
5. **No Container Insights**: Disabled to save costs
6. **Lifecycle Policies**: ECR keeps only 5 recent images

## Estimated Monthly Costs (sa-east-1)

- **ECS Fargate (Spot)**: ~$8-12/month
- **Application Load Balancer**: ~$22/month
- **ECR Storage**: ~$1/month
- **CloudWatch Logs**: ~$1-2/month
- **Data Transfer**: ~$1-3/month
- **Total**: ~$32-39/month

## Security

- VPC with public subnets (cost-optimized setup)
- Security groups restrict access to necessary ports
- IAM roles with minimal required permissions
- ECR image scanning enabled

## Production Considerations

For production use, consider these enhancements:
1. Use RDS for database (currently configured for external DB)
2. Add HTTPS certificate and redirect HTTP to HTTPS
3. Enable Container Insights for better monitoring
4. Use private subnets with NAT Gateway
5. Implement auto-scaling based on demand
6. Add health checks and better error handling
7. Set up CI/CD pipeline

## Troubleshooting

### Common Issues

1. **Docker not running**
   ```bash
   # Start Docker service
   sudo systemctl start docker
   ```

2. **AWS credentials not configured**
   ```bash
   aws configure
   # Or set environment variables
   export AWS_ACCESS_KEY_ID=your-key
   export AWS_SECRET_ACCESS_KEY=your-secret
   ```

3. **Stack deployment fails**
   ```bash
   # Check CloudFormation events
   aws cloudformation describe-stack-events --stack-name brm-app-production
   ```

4. **Service not healthy**
   ```bash
   # Check service logs
   make logs
   
   # Check service status
   make status
   ```

5. **Cannot access application**
   ```bash
   # Get load balancer URL
   make get-url
   
   # Check target group health
   aws elbv2 describe-target-health --target-group-arn <target-group-arn>
   ```

## Cleanup

To completely remove all AWS resources:
```bash
make cleanup
```

**Warning**: This will delete everything and cannot be undone!

## Support

For issues with deployment:
1. Check the logs: `make logs`
2. Verify AWS credentials and permissions
3. Ensure Docker is running
4. Check the CloudFormation stack events in AWS Console