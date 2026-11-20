#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# setup-subdomain.sh
#
# Separa a landing (brm.tec.br) do CRM (app.brm.tec.br) sem quebrar nada:
#   - Backup dos vhosts atuais
#   - Instala /var/www/brm-landing/ com placeholder
#   - Instala vhost novo pra app.brm.tec.br (serve o CRM atual)
#   - Substitui vhost de brm.tec.br pra servir so a landing
#   - Testa nginx, emite cert SSL via certbot pra app.brm.tec.br
#   - Reload do nginx
#
# Pre-requisitos:
#   - Rodar como root (sudo)
#   - DNS app.brm.tec.br ja apontando pro servidor (confere com dig)
#   - nginx instalado
#   - certbot instalado com plugin nginx
#   - /opt/brm/prod/dist existe (build do app)
#   - Cert /etc/letsencrypt/live/brm.tec.br/ ja existe (nao vai ser recriado)
# ----------------------------------------------------------------------------
set -euo pipefail

# -------------------- Configuracao --------------------
LANDING_DOMAIN="brm.tec.br"
APP_DOMAIN="app.brm.tec.br"
CRM_DIST="/opt/brm/prod/dist"
LANDING_DIR="/var/www/brm-landing"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="/etc/nginx/_backup_subdomain_$(date +%Y%m%d_%H%M%S)"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-sferraz.professional@gmail.com}"

# -------------------- Helpers --------------------
log()  { printf "\033[0;36m[%s]\033[0m %s\n" "$(date +%H:%M:%S)" "$*"; }
ok()   { printf "\033[0;32m  OK\033[0m %s\n" "$*"; }
warn() { printf "\033[0;33m  !\033[0m %s\n" "$*"; }
die()  { printf "\033[0;31m  X\033[0m %s\n" "$*" >&2; exit 1; }

confirm() {
    local prompt="${1:-Continuar?} [y/N]: "
    read -r -p "$prompt" resp
    [[ "$resp" =~ ^[yYsS]$ ]] || { warn "Abortado pelo usuario."; exit 1; }
}

# -------------------- Validacoes --------------------
log "[1/8] Validando pre-requisitos..."

[[ $EUID -eq 0 ]] || die "Rode como root (sudo bash $0)"
command -v nginx   >/dev/null || die "nginx nao instalado. 'apt-get install nginx'"
command -v certbot >/dev/null || die "certbot nao instalado. 'apt-get install certbot python3-certbot-nginx'"
[[ -d "$CRM_DIST" ]] || die "Build do CRM nao encontrado em $CRM_DIST — rode 'npm run build' primeiro"

# Confere DNS resolvendo
log "  Resolvendo DNS de $APP_DOMAIN..."
resolved_ip=$(dig +short "$APP_DOMAIN" | head -1)
expected_ip=$(dig +short "$LANDING_DOMAIN" | head -1)
if [[ -z "$resolved_ip" ]]; then
    die "$APP_DOMAIN nao resolve. Configure o registro DNS primeiro (ver README.md)."
fi
if [[ "$resolved_ip" != "$expected_ip" ]]; then
    warn "$APP_DOMAIN resolve pra $resolved_ip mas $LANDING_DOMAIN resolve pra $expected_ip"
    warn "Deveriam apontar pro MESMO servidor. Continuar mesmo assim?"
    confirm
fi
ok "DNS resolvendo ($resolved_ip)"

# Confere cert do dominio base
[[ -d "/etc/letsencrypt/live/$LANDING_DOMAIN" ]] \
    || die "Cert de $LANDING_DOMAIN nao encontrado em /etc/letsencrypt/live/ — nao vou mexer num servidor sem SSL ja funcionando"
ok "Cert de $LANDING_DOMAIN presente"

# Confere que os arquivos do kit estao no mesmo diretorio
for f in nginx-brm-landing.conf nginx-brm-app.conf landing/index.html; do
    [[ -f "$SCRIPT_DIR/$f" ]] || die "Arquivo $f nao encontrado em $SCRIPT_DIR — rode do diretorio deploy/subdomain/"
done
ok "Arquivos de config encontrados"

# -------------------- Backup --------------------
log "[2/8] Fazendo backup dos vhosts atuais em $BACKUP_DIR..."
mkdir -p "$BACKUP_DIR"
cp -av /etc/nginx/sites-available "$BACKUP_DIR/sites-available"
cp -av /etc/nginx/sites-enabled   "$BACKUP_DIR/sites-enabled"
ok "Backup OK"

# -------------------- Landing dir --------------------
log "[3/8] Criando $LANDING_DIR com placeholder..."
mkdir -p "$LANDING_DIR"
cp -v "$SCRIPT_DIR/landing/index.html" "$LANDING_DIR/index.html"
chown -R www-data:www-data "$LANDING_DIR"
ok "Landing instalada"

# -------------------- Vhost do app --------------------
log "[4/8] Instalando vhost de $APP_DOMAIN (sem SSL ainda — certbot adiciona)..."

# Primeiro cria uma versao SOMENTE-HTTP pra o certbot conseguir o challenge
# (nao tem cert pra app.brm.tec.br ainda — o bloco 443 iria quebrar).
cat > /etc/nginx/sites-available/$APP_DOMAIN <<'TMPEOF'
server {
    listen 80;
    listen [::]:80;
    server_name app.brm.tec.br;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 200 "aguardando certbot — rode 'certbot --nginx -d app.brm.tec.br'";
        add_header Content-Type text/plain;
    }
}
TMPEOF
ln -sf /etc/nginx/sites-available/$APP_DOMAIN /etc/nginx/sites-enabled/$APP_DOMAIN
nginx -t
systemctl reload nginx
ok "Vhost temporario HTTP instalado pra $APP_DOMAIN"

# -------------------- Certbot --------------------
log "[5/8] Emitindo cert SSL pra $APP_DOMAIN via certbot..."
warn "Isso vai modificar o vhost automaticamente. Depois reescreveremos com nossa config final."
confirm "Rodar certbot agora?"

certbot --nginx \
    -d "$APP_DOMAIN" \
    --non-interactive --agree-tos \
    --email "$LETSENCRYPT_EMAIL" \
    --redirect
ok "Cert emitido"

# -------------------- Vhost FINAL (substitui o que o certbot editou) --------------------
log "[6/8] Substituindo vhost de $APP_DOMAIN com nossa config final..."
cp -v "$SCRIPT_DIR/nginx-brm-app.conf" /etc/nginx/sites-available/$APP_DOMAIN
ok "Config final do $APP_DOMAIN aplicada"

# -------------------- Vhost da landing --------------------
log "[7/8] Substituindo vhost de $LANDING_DOMAIN pra servir a landing..."
cp -v "$SCRIPT_DIR/nginx-brm-landing.conf" /etc/nginx/sites-available/$LANDING_DOMAIN
# Garante enable
ln -sf /etc/nginx/sites-available/$LANDING_DOMAIN /etc/nginx/sites-enabled/$LANDING_DOMAIN
ok "Config do $LANDING_DOMAIN atualizada pra landing"

# -------------------- Reload final --------------------
log "[8/8] Testando config final e reload..."
if ! nginx -t; then
    warn "Config invalida. Restaurando backup..."
    rm -f /etc/nginx/sites-enabled/$APP_DOMAIN
    cp -av "$BACKUP_DIR/sites-available/." /etc/nginx/sites-available/
    cp -av "$BACKUP_DIR/sites-enabled/." /etc/nginx/sites-enabled/
    nginx -t && systemctl reload nginx
    die "Config final invalida — backup restaurado. Veja o log acima."
fi
systemctl reload nginx
ok "Nginx reloadado com sucesso"

# -------------------- Sumario --------------------
printf "\n\033[1;32m==========================================\n"
printf "  SUBDOMINIO CONFIGURADO COM SUCESSO!\n"
printf "==========================================\033[0m\n\n"
printf "  Landing:  https://%s\n" "$LANDING_DOMAIN"
printf "  App CRM:  https://%s\n" "$APP_DOMAIN"
printf "  Staging:  https://test.brm.tec.br (inalterado)\n\n"
printf "  Backup:   %s\n\n" "$BACKUP_DIR"
printf "  Teste agora:\n"
printf "    curl -I https://%s\n" "$LANDING_DOMAIN"
printf "    curl -I https://%s\n" "$APP_DOMAIN"
printf "    curl -I https://%s/api/health\n\n" "$APP_DOMAIN"
printf "  Rollback (se precisar): sudo bash %s/restore-backup.sh %s\n\n" \
    "$SCRIPT_DIR" "$BACKUP_DIR"
