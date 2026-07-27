#!/usr/bin/env bash
# ============================================================================
# BRM — Bootstrap inicial do servidor Hetzner
# ----------------------------------------------------------------------------
# Roda UMA vez como root no servidor recém-criado (Ubuntu 26.04).
# Instala: Node.js 22, PostgreSQL 16, nginx, Certbot, PM2, git, ufw.
# Cria usuário 'deploy' (sem senha, login só por SSH) e a estrutura
# /opt/brm/{staging,prod}.
#
# Como rodar:
#   1. Cole TUDO isso no terminal SSH conectado como root.
#   2. Ou salve como bootstrap.sh, dê permissão e execute:
#        chmod +x bootstrap.sh && ./bootstrap.sh
# ============================================================================

set -euo pipefail

DEPLOY_USER="deploy"
APP_ROOT="/opt/brm"

echo ">>> [1/8] Atualizando sistema..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

echo ">>> [2/8] Instalando dependências base..."
apt-get install -y \
  curl wget git unzip ca-certificates gnupg lsb-release \
  build-essential ufw nginx software-properties-common

echo ">>> [3/8] Instalando Node.js 22 LTS via NodeSource..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
node --version
npm --version

echo ">>> [4/8] Instalando PostgreSQL 16..."
apt-get install -y postgresql postgresql-contrib
systemctl enable --now postgresql

# Criar bancos staging e prod
sudo -u postgres psql -v ON_ERROR_STOP=1 <<'SQL'
CREATE DATABASE brm_staging;
CREATE DATABASE brm_prod;
-- Usuário da aplicação (senha será trocada manualmente depois)
CREATE USER brm_app WITH PASSWORD 'CHANGE_ME_BEFORE_USE';
GRANT ALL PRIVILEGES ON DATABASE brm_staging TO brm_app;
GRANT ALL PRIVILEGES ON DATABASE brm_prod    TO brm_app;
SQL

echo ">>> [5/8] Instalando Certbot (Let's Encrypt) via snap..."
apt-get install -y snapd
snap install core
snap refresh core
snap install --classic certbot
ln -sf /snap/bin/certbot /usr/bin/certbot

echo ">>> [6/8] Instalando PM2 (gerenciador de processos Node)..."
npm install -g pm2

echo ">>> [7/8] Configurando firewall (UFW)..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 'Nginx Full'   # 80 + 443
ufw --force enable
ufw status

echo ">>> [8/8] Criando usuário deploy e estrutura /opt/brm..."
if ! id "${DEPLOY_USER}" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "${DEPLOY_USER}"
  usermod -aG sudo "${DEPLOY_USER}"
  # Permite sudo sem senha para o deploy user (necessário pro CI)
  echo "${DEPLOY_USER} ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/${DEPLOY_USER}
fi

# Copia chave SSH do root pro deploy user (assim o mesmo SSH funciona)
mkdir -p /home/${DEPLOY_USER}/.ssh
cp /root/.ssh/authorized_keys /home/${DEPLOY_USER}/.ssh/authorized_keys
chown -R ${DEPLOY_USER}:${DEPLOY_USER} /home/${DEPLOY_USER}/.ssh
chmod 700 /home/${DEPLOY_USER}/.ssh
chmod 600 /home/${DEPLOY_USER}/.ssh/authorized_keys

# Cria diretórios da aplicação
mkdir -p "${APP_ROOT}/staging" "${APP_ROOT}/prod"
chown -R ${DEPLOY_USER}:${DEPLOY_USER} "${APP_ROOT}"

echo ""
echo "============================================================"
echo "✅ BOOTSTRAP CONCLUÍDO COM SUCESSO"
echo "============================================================"
echo ""
echo "Próximos passos manuais (na ordem):"
echo ""
echo "  1. Trocar senha do usuário do banco:"
echo "       sudo -u postgres psql -c \"ALTER USER brm_app WITH PASSWORD 'COLOQUE_SENHA_FORTE_AQUI';\""
echo ""
echo "  2. Conectar como deploy user pra fazer git clone:"
echo "       sudo su - ${DEPLOY_USER}"
echo "       cd ${APP_ROOT}/staging  # (e depois ${APP_ROOT}/prod)"
echo "       git clone https://github.com/Sam-Ferraz/BRM.git ."
echo ""
echo "  3. Configurar nginx (depois que DNS propagar)"
echo "  4. Rodar Certbot pra HTTPS"
echo "  5. Configurar .env e iniciar PM2"
echo ""
