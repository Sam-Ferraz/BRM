#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# restore-backup.sh
#
# Desfaz o que o setup-subdomain.sh fez — restaura os vhosts antigos a partir
# do backup criado em /etc/nginx/_backup_subdomain_<data>/.
#
# Uso:
#   sudo bash restore-backup.sh [caminho/do/backup]
#
# Se nao passar o caminho, pega o backup MAIS RECENTE automaticamente.
# ----------------------------------------------------------------------------
set -euo pipefail

[[ $EUID -eq 0 ]] || { echo "Rode como root" >&2; exit 1; }

BACKUP_DIR="${1:-}"
if [[ -z "$BACKUP_DIR" ]]; then
    BACKUP_DIR=$(ls -1dt /etc/nginx/_backup_subdomain_* 2>/dev/null | head -1 || true)
    [[ -n "$BACKUP_DIR" ]] || { echo "Nenhum backup encontrado em /etc/nginx/_backup_subdomain_*" >&2; exit 1; }
    echo "Usando backup mais recente: $BACKUP_DIR"
fi

[[ -d "$BACKUP_DIR/sites-available" ]] || { echo "Backup invalido: $BACKUP_DIR" >&2; exit 1; }

echo "Restaurando vhosts a partir de $BACKUP_DIR..."

# Remove sites-enabled novos que possam ter sido criados
rm -f /etc/nginx/sites-enabled/app.brm.tec.br || true

# Restaura available + enabled (sobrescreve)
cp -av "$BACKUP_DIR/sites-available/." /etc/nginx/sites-available/
# Cuidado: sites-enabled sao symlinks. Vou limpar e recriar a partir do backup.
find /etc/nginx/sites-enabled -mindepth 1 -delete
cp -av "$BACKUP_DIR/sites-enabled/." /etc/nginx/sites-enabled/

echo "Testando config restaurada..."
nginx -t
systemctl reload nginx

echo ""
echo "Backup restaurado com sucesso."
echo "Nota: o certificado SSL de app.brm.tec.br continua emitido mas sem uso —"
echo "      pode ser removido com 'certbot delete --cert-name app.brm.tec.br' se quiser."
