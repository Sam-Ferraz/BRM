# Hardening pré-demo — checklist manual

Este documento cobre os **itens que NÃO podem ser feitos via código** e
precisam ser executados no servidor. Todo o resto (rate-limit, helmet,
JWT default, remoção de /register) já está no commit desta entrega e
sobe sozinho via GitHub Actions.

Ordem sugerida: 4 → 3 (env) → 5.

---

## 4. Trocar senha do admin em produção

O usuário `admin@brm.com` foi criado com senha `admin123` no bootstrap
e essa senha está documentada em `CLAUDE.md`, `setup-auth.js`,
`setup-db.js`. Trocar imediatamente.

```bash
# SSH no servidor de produção
ssh deploy@brm.tec.br

# Rodar o script de reset (existente no repo)
cd /opt/brm/prod
node reset-password.cjs admin@brm.com '<SENHA_FORTE_NOVA_AQUI>'
```

Ou direto por SQL:

```bash
sudo -u postgres psql brm_prod
```

```sql
-- Precisa gerar o hash bcrypt em Node antes:
--   node -e "console.log(require('bcryptjs').hashSync('SUA_SENHA', 10))"
UPDATE users
   SET password_hash = '<hash_gerado_no_passo_acima>'
 WHERE email = 'admin@brm.com';
```

Faça o mesmo em staging (`brm_staging`) se lá também for exposto pra
cliente durante demo.

---

## 3. Reduzir JWT_EXPIRES_IN em produção

O default do código já foi baixado de `7d` pra `1d`, mas se o `.env`
de prod tiver `JWT_EXPIRES_IN=7d` explícito, ele vence o default.
Verificar e ajustar:

```bash
ssh deploy@brm.tec.br
cd /opt/brm/prod
grep JWT_EXPIRES_IN .env
# Se estiver 7d, mudar pra 1d:
sed -i 's/^JWT_EXPIRES_IN=.*/JWT_EXPIRES_IN=1d/' .env
# Ou remover a linha inteira pra herdar o default do código

# Reinicia o PM2 pra carregar o novo .env
pm2 restart brm-prod
```

**Efeito colateral:** todos os tokens JWT emitidos antes ficam válidos
até expirarem no tempo antigo. Novos logins usam o novo tempo. Não
há invalidação retroativa (é a natureza do JWT stateless).

Se quiser forçar todos a re-logar (recomendado antes da demo): trocar
o `JWT_SECRET` no `.env` — invalida qualquer token emitido antes.

```bash
NEW_SECRET=$(openssl rand -base64 48)
sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${NEW_SECRET}|" .env
pm2 restart brm-prod
```

---

## 5. Configurar backup diário do PostgreSQL

Copiar `deploy/02-setup-backup-cron.sh` pro servidor e rodar:

```bash
# Do seu terminal local
scp deploy/02-setup-backup-cron.sh deploy@brm.tec.br:/tmp/

# SSH no servidor
ssh deploy@brm.tec.br

# Roda pra o banco de produção
sudo bash /tmp/02-setup-backup-cron.sh brm_prod

# Repete pra staging (opcional mas recomendado)
sudo bash /tmp/02-setup-backup-cron.sh brm_staging
```

O script:
- Cria `/opt/brm/backups/pg-backup.sh`
- Roda um dump imediato como teste
- Instala cron do usuário `postgres` pra rodar 03:00 UTC diário
- Retém últimos 14 dumps (limpa os antigos automaticamente)
- Loga em `/opt/brm/backups/pg-backup.log`

### ⚠️ PRÓXIMO PASSO CRÍTICO: replicar backup pra fora

Se o servidor pegar fogo (incêndio no datacenter, RAID falhar, alguém
`rm -rf /`), os backups queimam junto. Configurar réplica em OUTRO
provedor:

**Opção A (recomendada, R$ 20/mês):** Hetzner Storage Box
```bash
# No servidor, adicionar ao cron do postgres:
0 4 * * * rclone sync /opt/brm/backups/dumps hetzner-storage:brm-backups >> /var/log/rclone.log 2>&1
```

**Opção B (mais barato, R$ 5/mês):** Backblaze B2 ou AWS S3 (Glacier)
via `rclone` ou `aws s3 sync`.

Isso não bloqueia demo, mas em produção não é opcional.

---

## Verificação pós-hardening

Depois de rodar tudo, confirmar:

```bash
# 1. /api/auth/register REALMENTE morreu (deve retornar 404)
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST https://brm.tec.br/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"hax","email":"hax@evil.com","password":"123"}'
# Esperado: 404

# 2. Rate limit no login (11 tentativas rápidas → última bloqueada)
for i in $(seq 1 11); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://brm.tec.br/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"a@a.com","password":"x"}'
done
# Esperado: 10x com 200 (login inválido), 1x com 429 (rate limited)

# 3. Helmet ligado (headers de segurança presentes)
curl -sI https://brm.tec.br/health | grep -Ei 'x-content-type|x-frame|strict-transport'
# Esperado: X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security

# 4. Backup rodou hoje
sudo -u postgres ls -lh /opt/brm/backups/dumps/ | tail
```
