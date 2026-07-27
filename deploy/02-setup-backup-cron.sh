#!/usr/bin/env bash
# ============================================================================
# BRM — Configuração de backup automatizado do PostgreSQL
# ----------------------------------------------------------------------------
# Roda como root no servidor Hetzner (staging OU prod, um de cada vez).
#
# O que faz:
#   1. Cria o script /opt/brm/backups/pg-backup.sh
#   2. Cria diretório /opt/brm/backups/dumps/ para armazenar os dumps
#   3. Instala cron diário do usuário 'postgres' (roda às 03:00 UTC)
#   4. Retention: mantém últimos 14 dumps + a limpeza automática
#
# Não usa senha em texto plano — o pg_dump roda como usuário postgres do
# sistema, que tem trust local no PostgreSQL (peer authentication).
#
# Como rodar:
#   ssh deploy@brm.tec.br
#   sudo bash 02-setup-backup-cron.sh brm_prod        # ou brm_staging
#
# Restauração (referência rápida):
#   sudo -u postgres dropdb brm_prod
#   sudo -u postgres createdb brm_prod
#   sudo -u postgres pg_restore -d brm_prod \
#     /opt/brm/backups/dumps/brm_prod_2026-07-27.dump
# ============================================================================

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Uso: sudo bash $0 <nome_do_banco>"
  echo "Ex.: sudo bash $0 brm_prod"
  exit 1
fi

DB_NAME="$1"
BACKUP_ROOT="/opt/brm/backups"
BACKUP_DIR="${BACKUP_ROOT}/dumps"
SCRIPT_PATH="${BACKUP_ROOT}/pg-backup.sh"
LOG_PATH="${BACKUP_ROOT}/pg-backup.log"
RETENTION_DAYS=14

echo ">>> [1/4] Criando diretórios de backup..."
mkdir -p "${BACKUP_DIR}"
chown -R postgres:postgres "${BACKUP_ROOT}"
chmod 750 "${BACKUP_ROOT}"

echo ">>> [2/4] Escrevendo script /opt/brm/backups/pg-backup.sh..."
cat > "${SCRIPT_PATH}" <<'SCRIPT'
#!/usr/bin/env bash
# pg-backup.sh — chamado pelo cron. Dumpa DB_NAME e limpa dumps antigos.
set -euo pipefail

DB_NAME="${1:?Uso: pg-backup.sh <db_name>}"
BACKUP_DIR="/opt/brm/backups/dumps"
RETENTION_DAYS=14
STAMP="$(date -u +%Y-%m-%d_%H%M)"
OUT="${BACKUP_DIR}/${DB_NAME}_${STAMP}.dump"

# Formato -Fc (custom) permite pg_restore seletivo (só tabelas, só dados, etc)
# e comprime automaticamente (~5-10x menor que .sql plano).
pg_dump -Fc -f "${OUT}" "${DB_NAME}"

# Verifica se o arquivo tem tamanho razoável (evita commit de dump vazio)
if [ ! -s "${OUT}" ]; then
  echo "ERRO: dump vazio, algo deu errado" >&2
  exit 1
fi

# Limpa dumps mais antigos que RETENTION_DAYS
find "${BACKUP_DIR}" -name "${DB_NAME}_*.dump" -mtime "+${RETENTION_DAYS}" -delete

echo "[$(date -u +%FT%TZ)] backup OK: ${OUT} ($(du -h "${OUT}" | cut -f1))"
SCRIPT

chmod +x "${SCRIPT_PATH}"
chown postgres:postgres "${SCRIPT_PATH}"

echo ">>> [3/4] Rodando um dump agora pra validar setup..."
sudo -u postgres bash "${SCRIPT_PATH}" "${DB_NAME}" | tee -a "${LOG_PATH}"

echo ">>> [4/4] Instalando cron do usuário postgres (03:00 UTC diário)..."
CRON_LINE="0 3 * * * ${SCRIPT_PATH} ${DB_NAME} >> ${LOG_PATH} 2>&1"

# Idempotente: só adiciona se ainda não existe
CURRENT=$(sudo -u postgres crontab -l 2>/dev/null || true)
if echo "${CURRENT}" | grep -qF "${SCRIPT_PATH} ${DB_NAME}"; then
  echo "  cron já instalado — não altero"
else
  (echo "${CURRENT}"; echo "${CRON_LINE}") | sudo -u postgres crontab -
  echo "  cron adicionado: ${CRON_LINE}"
fi

echo ""
echo "============================================================"
echo "✅ BACKUP AUTOMATIZADO CONFIGURADO"
echo "============================================================"
echo ""
echo "  DB:       ${DB_NAME}"
echo "  Destino:  ${BACKUP_DIR}"
echo "  Horário:  03:00 UTC diário"
echo "  Retenção: ${RETENTION_DAYS} dias"
echo "  Log:      ${LOG_PATH}"
echo ""
echo "Testes úteis:"
echo "  # Forçar backup agora:"
echo "  sudo -u postgres ${SCRIPT_PATH} ${DB_NAME}"
echo ""
echo "  # Ver crons instalados:"
echo "  sudo -u postgres crontab -l"
echo ""
echo "  # Ver últimos dumps:"
echo "  ls -lh ${BACKUP_DIR}"
echo ""
echo "  # Restaurar (destrutivo — cuidado):"
echo "  sudo -u postgres dropdb ${DB_NAME}"
echo "  sudo -u postgres createdb ${DB_NAME}"
echo "  sudo -u postgres pg_restore -d ${DB_NAME} ${BACKUP_DIR}/<arquivo>.dump"
echo ""
echo "⚠️  PRÓXIMO PASSO CRÍTICO: replicar dumps pra fora do servidor!"
echo "    Se o servidor pegar fogo, o backup queima junto."
echo "    Opções: Storage Box da Hetzner (barato), S3 backup bucket,"
echo "    ou rsync/rclone pra outro provedor."
echo ""
