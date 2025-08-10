# BRM Application Deployment Makefile
# AWS ECS Fargate deployment with CloudFormation

# Default values
APP_NAME ?= brm-app
ENVIRONMENT ?= production
AWS_REGION ?= us-east-1
AWS_PROFILE ?= default

# Derived values
STACK_NAME = $(APP_NAME)-$(ENVIRONMENT)
ECR_REPO_NAME = $(APP_NAME)-$(ENVIRONMENT)
IMAGE_TAG ?= latest

# Colors for output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[1;33m
NC = \033[0m # No Color

.PHONY: help
help: ## Show this help message
	@echo "BRM Application Deployment Commands"
	@echo "=================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

.PHONY: check-aws-cli
check-aws-cli: ## Check if AWS CLI is configured
	@echo "$(YELLOW)Checking AWS CLI configuration...$(NC)"
	@aws --version || (echo "$(RED)AWS CLI not found. Please install AWS CLI$(NC)" && exit 1)
	@aws sts get-caller-identity --profile $(AWS_PROFILE) > /dev/null || (echo "$(RED)AWS CLI not configured. Please run 'aws configure'$(NC)" && exit 1)
	@echo "$(GREEN)AWS CLI is configured$(NC)"

.PHONY: check-docker
check-docker: ## Check if Docker is running
	@echo "$(YELLOW)Checking Docker...$(NC)"
	@docker --version || (echo "$(RED)Docker not found. Please install Docker$(NC)" && exit 1)
	@docker ps > /dev/null || (echo "$(RED)Docker is not running. Please start Docker$(NC)" && exit 1)
	@echo "$(GREEN)Docker is running$(NC)"

.PHONY: build
build: check-docker ## Build the Docker image locally
	@echo "$(YELLOW)Building Docker image...$(NC)"
	docker build -t $(APP_NAME):$(IMAGE_TAG) .
	@echo "$(GREEN)Docker image built successfully$(NC)"

.PHONY: run-local
run-local: build ## Run the application locally with Docker
	@echo "$(YELLOW)Running application locally...$(NC)"
	docker run -p 3002:3002 \
		-e NODE_ENV=production \
		-e PORT=3002 \
		-e DB_HOST=localhost \
		-e DB_PORT=5432 \
		-e DB_NAME=brm_db \
		-e DB_USER=postgres \
		-e DB_PASSWORD=changeme123 \
		-e JWT_SECRET=$(APP_NAME)-jwt-secret-local \
		$(APP_NAME):$(IMAGE_TAG)

.PHONY: deploy-infrastructure
deploy-infrastructure: check-aws-cli ## Deploy the CloudFormation infrastructure stack
	@echo "$(YELLOW)Deploying infrastructure stack...$(NC)"
	@aws cloudformation deploy \
		--template-file cloudformation/infrastructure.yaml \
		--stack-name $(STACK_NAME) \
		--parameter-overrides \
			AppName=$(APP_NAME) \
			Environment=$(ENVIRONMENT) \
			ImageTag=$(IMAGE_TAG) \
		--capabilities CAPABILITY_NAMED_IAM \
		--region $(AWS_REGION) \
		--profile $(AWS_PROFILE) \
		--no-fail-on-empty-changeset
	@echo "$(GREEN)Infrastructure deployed successfully$(NC)"

.PHONY: get-ecr-uri
get-ecr-uri: check-aws-cli ## Get the ECR repository URI
	@aws cloudformation describe-stacks \
		--stack-name $(STACK_NAME) \
		--query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryURI`].OutputValue' \
		--output text \
		--region $(AWS_REGION) \
		--profile $(AWS_PROFILE)

.PHONY: docker-login
docker-login: check-aws-cli check-docker ## Login to AWS ECR
	@echo "$(YELLOW)Logging in to ECR...$(NC)"
	@aws ecr get-login-password --region $(AWS_REGION) --profile $(AWS_PROFILE) | docker login --username AWS --password-stdin $$(aws sts get-caller-identity --query Account --output text --profile $(AWS_PROFILE)).dkr.ecr.$(AWS_REGION).amazonaws.com
	@echo "$(GREEN)Successfully logged in to ECR$(NC)"

.PHONY: push-image
push-image: check-aws-cli check-docker build docker-login ## Build and push Docker image to ECR
	@echo "$(YELLOW)Pushing image to ECR...$(NC)"
	$(eval ECR_URI := $(shell make get-ecr-uri))
	docker tag $(APP_NAME):$(IMAGE_TAG) $(ECR_URI):$(IMAGE_TAG)
	docker push $(ECR_URI):$(IMAGE_TAG)
	@echo "$(GREEN)Image pushed successfully$(NC)"

.PHONY: update-service
update-service: check-aws-cli ## Force update ECS service to deploy new image
	@echo "$(YELLOW)Updating ECS service...$(NC)"
	@aws ecs update-service \
		--cluster $(STACK_NAME)-cluster \
		--service $(STACK_NAME)-service \
		--force-new-deployment \
		--region $(AWS_REGION) \
		--profile $(AWS_PROFILE) > /dev/null
	@echo "$(GREEN)Service update initiated$(NC)"

.PHONY: deploy
deploy: deploy-infrastructure push-image update-service ## Full deployment: infrastructure + application
	@echo "$(GREEN)Deployment completed successfully!$(NC)"
	@echo "$(YELLOW)Getting application URL...$(NC)"
	@aws cloudformation describe-stacks \
		--stack-name $(STACK_NAME) \
		--query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerURL`].OutputValue' \
		--output text \
		--region $(AWS_REGION) \
		--profile $(AWS_PROFILE)

.PHONY: logs
logs: check-aws-cli ## View ECS service logs
	@echo "$(YELLOW)Fetching logs...$(NC)"
	@aws logs describe-log-streams \
		--log-group-name /ecs/$(STACK_NAME) \
		--order-by LastEventTime \
		--descending \
		--max-items 1 \
		--query 'logStreams[0].logStreamName' \
		--output text \
		--region $(AWS_REGION) \
		--profile $(AWS_PROFILE) | \
	xargs -I {} aws logs get-log-events \
		--log-group-name /ecs/$(STACK_NAME) \
		--log-stream-name {} \
		--query 'events[*].message' \
		--output text \
		--region $(AWS_REGION) \
		--profile $(AWS_PROFILE)

.PHONY: status
status: check-aws-cli ## Check deployment status
	@echo "$(YELLOW)Checking deployment status...$(NC)"
	@echo "$(YELLOW)Stack Status:$(NC)"
	@aws cloudformation describe-stacks \
		--stack-name $(STACK_NAME) \
		--query 'Stacks[0].StackStatus' \
		--output text \
		--region $(AWS_REGION) \
		--profile $(AWS_PROFILE) 2>/dev/null || echo "Stack not found"
	@echo "$(YELLOW)Service Status:$(NC)"
	@aws ecs describe-services \
		--cluster $(STACK_NAME)-cluster \
		--services $(STACK_NAME)-service \
		--query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount}' \
		--output table \
		--region $(AWS_REGION) \
		--profile $(AWS_PROFILE) 2>/dev/null || echo "Service not found"

.PHONY: get-url
get-url: check-aws-cli ## Get the application URL
	@aws cloudformation describe-stacks \
		--stack-name $(STACK_NAME) \
		--query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerURL`].OutputValue' \
		--output text \
		--region $(AWS_REGION) \
		--profile $(AWS_PROFILE) 2>/dev/null || echo "Stack not deployed"

.PHONY: cleanup
cleanup: check-aws-cli ## Delete the CloudFormation stack and ECR images
	@echo "$(YELLOW)Warning: This will delete all resources and cannot be undone!$(NC)"
	@read -p "Are you sure you want to cleanup? (y/N): " confirm && [ "$$confirm" = "y" ]
	@echo "$(YELLOW)Cleaning up ECR images...$(NC)"
	-@aws ecr list-images --repository-name $(ECR_REPO_NAME) \
		--query 'imageIds[?type(imageTag) == `string`]' \
		--region $(AWS_REGION) \
		--profile $(AWS_PROFILE) | \
	jq -r '.[] | "--image-ids imageTag=" + .imageTag' | \
	xargs -r aws ecr batch-delete-image \
		--repository-name $(ECR_REPO_NAME) \
		--region $(AWS_REGION) \
		--profile $(AWS_PROFILE)
	@echo "$(YELLOW)Deleting CloudFormation stack...$(NC)"
	@aws cloudformation delete-stack \
		--stack-name $(STACK_NAME) \
		--region $(AWS_REGION) \
		--profile $(AWS_PROFILE)
	@echo "$(GREEN)Cleanup initiated. Stack deletion in progress...$(NC)"

.PHONY: wait-for-deployment
wait-for-deployment: check-aws-cli ## Wait for ECS service deployment to complete
	@echo "$(YELLOW)Waiting for deployment to complete...$(NC)"
	@aws ecs wait services-stable \
		--cluster $(STACK_NAME)-cluster \
		--services $(STACK_NAME)-service \
		--region $(AWS_REGION) \
		--profile $(AWS_PROFILE)
	@echo "$(GREEN)Deployment completed$(NC)"

# Quick commands
.PHONY: quick-deploy
quick-deploy: push-image update-service ## Quick deployment (just push image and update service)
	@echo "$(GREEN)Quick deployment completed$(NC)"

.PHONY: dev
dev: ## Run development environment
	npm run dev

.PHONY: lint
lint: ## Run linting
	npm run lint

.PHONY: test-build
test-build: build ## Test build locally
	@echo "$(GREEN)Build test completed$(NC)"

# Default target
.DEFAULT_GOAL := help