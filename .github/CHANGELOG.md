# 📝 Changelog

## [1.1.0] - 2025-08-10 - sa-east-1 Migration & Documentation Update

### 🌍 Regional Migration
- **BREAKING:** Migrated from us-east-1 to sa-east-1 (São Paulo)
- Updated all ECR repository URIs to sa-east-1
- Updated CloudFormation templates for sa-east-1 deployment
- Updated Makefile with sa-east-1 configuration

### 📚 Documentation Overhaul
- **Fixed:** Updated README.md with correct sa-east-1 URLs
- **Fixed:** Corrected database technology (PostgreSQL instead of SQLite)
- **Added:** Live application URL and health check links
- **Added:** Architecture diagram with Mermaid
- **Added:** Comprehensive deployment documentation
- **Added:** Quick start guide with code examples
- **Added:** Monitoring and troubleshooting sections

### 🚀 Deployment Improvements
- **Fixed:** Environment variables now properly passed to containers
- **Added:** ECR repository auto-creation in GitHub Actions
- **Enhanced:** Health check configuration and validation
- **Added:** Dynamic URL generation in GitHub Actions summaries
- **Improved:** Deployment sequence and error handling

### 📊 Infrastructure Updates
- **Enhanced:** Cost estimation updated for sa-east-1 pricing
- **Added:** Proper PostgreSQL RDS configuration
- **Updated:** Security group configurations
- **Added:** Comprehensive monitoring setup

### 🔧 GitHub Actions Enhancements
- **Fixed:** Workflows now use correct region (sa-east-1)
- **Added:** Environment variable injection from GitHub Secrets/Variables
- **Enhanced:** Deployment status reporting with live URLs
- **Added:** ECR lifecycle policies management
- **Improved:** Error handling and validation steps

### 📖 New Documentation Files
- `DEPLOYMENT.md` - Comprehensive deployment guide
- `.github/SETUP.md` - Environment setup instructions
- `.github/CHANGELOG.md` - This changelog
- Updated `.github/README.md` - GitHub Actions documentation

### 🔗 URL Updates
- **Application:** http://brm-app-production-alb-146543119.sa-east-1.elb.amazonaws.com
- **Health Check:** http://brm-app-production-alb-146543119.sa-east-1.elb.amazonaws.com/health
- **Region:** sa-east-1 (São Paulo, Brazil)

### ✅ Verification
- All URLs tested and working
- Health checks passing
- ECS service running healthy
- Database connectivity confirmed
- GitHub Actions workflows functional

---

## [1.0.0] - Initial Release

### 🎉 Initial Features
- React + TypeScript frontend with Vite
- Node.js + Express backend
- Docker containerization
- AWS ECS Fargate deployment
- CloudFormation Infrastructure as Code
- GitHub Actions CI/CD pipeline
- Comprehensive CRM functionality

### 📋 Core Modules
- Customer Management (Clientes)
- Deal Tracking (Negócios)
- Product Catalog (Produtos)  
- Service Tickets (Atendimentos)
- Sales Agenda (Pauta de Vendas)

### 🏗️ Infrastructure
- AWS ECS Fargate
- Application Load Balancer
- Amazon ECR
- CloudWatch Logging
- Cost-optimized configuration