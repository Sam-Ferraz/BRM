# BRM - Business Relationship Management

[![Deploy to AWS](https://github.com/swordmaster/brm/actions/workflows/deploy.yml/badge.svg?branch=trunk)](https://github.com/swordmaster/brm/actions/workflows/deploy.yml)
[![AWS ECS](https://img.shields.io/badge/Deployed%20on-AWS%20ECS-orange?style=flat&logo=amazonaws)](http://brm-app-production-alb-1432108016.us-east-1.elb.amazonaws.com)
[![Health Check](https://img.shields.io/badge/Health-Check-brightgreen?style=flat)](http://brm-app-production-alb-1432108016.us-east-1.elb.amazonaws.com/health)

A comprehensive Business Relationship Management (CRM) system built with **Vite + React** and deployed on **AWS ECS Fargate**.

## 🚀 Live Application

**Production:** http://brm-app-production-alb-1432108016.us-east-1.elb.amazonaws.com

## 📋 Overview

This is a comprehensive CRM application that manages customers, deals, products, service tickets, and sales agendas with a modern React/TypeScript stack running on AWS.

**Features:**
- 👥 Customer Management (Clientes)
- 💼 Deal Tracking (Negócios) 
- 📦 Product Catalog (Produtos)
- 🎧 Service Tickets (Atendimentos)
- 📅 Sales Agenda (Pauta de Vendas)
- 🔐 Authentication & Authorization
- 📊 Dashboard with Analytics

## 🛠 Technology Stack

**Frontend:**
- ⚛️ React 18 with TypeScript
- ⚡ Vite for build tooling
- 🎨 TailwindCSS + shadcn/ui components
- 📊 Recharts for data visualization
- 🧭 React Router for navigation

**Backend:**
- 🟢 Node.js + Express
- 🗄️ SQLite database
- 🔐 JWT authentication
- 🐳 Docker containerization

**Infrastructure:**
- ☁️ AWS ECS Fargate
- 🔄 Application Load Balancer
- 🗂️ ECR for Docker images
- ☁️ CloudFormation for IaC
- 🤖 GitHub Actions for CI/CD

## 🚀 Deployment

### Automated Deployment
Every push to the `trunk` branch automatically triggers deployment via GitHub Actions.

### Manual Deployment
1. Go to **Actions** tab
2. Select **Manual Deployment** 
3. Choose components to deploy
4. Select environment

See [GitHub Actions Documentation](.github/README.md) for detailed workflow information.

## Build your app

Continue building your app on:

**[https://v0.dev/chat/projects/CKueJQGAnjG](https://v0.dev/chat/projects/CKueJQGAnjG)**

## How It Works

1. Create and modify your project using [v0.dev](https://v0.dev)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository
