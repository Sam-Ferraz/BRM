## Setup Guide

### Infrastructure

- **Dominio** - Domain registration
  - [Registro.br](https://registro.br) - Brazilian domain registration

- **Proxy e DNS** - Reverse proxy and DNS management
  - [Cloudflare](https://www.cloudflare.com) - DNS management and CDN

- **Hospedagem** - Application hosting and deployment
  - [Hetzner](https://www.hetzner.com) - VPS hosting
  - [Coolify](https://coolify.io) - Self-hosted deployment platform
  - PostgreSQL database via Coolify
  - [Cloudflare R2](https://www.cloudflare.com/products/r2/) - S3-compatible object storage

### Development

- **Repositorio** - Source code repository
  - [GitHub Repository](https://github.com) - Code hosting and version control
  - See [CLAUDE.md](./CLAUDE.md) for development guidelines

  **Quick Start:**
  ```bash
  # Terminal 1: Start backend server (development mode with watch)
  npm run server:dev

  # Terminal 2: Start frontend development server
  npm run dev
  ```

- **IA** - AI-powered development assistance
  - [Claude Code Pro](https://claude.ai/code) - AI coding assistant
