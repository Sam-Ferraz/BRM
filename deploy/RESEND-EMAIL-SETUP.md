# Configuração do envio de email (Resend)

O BRM manda emails transacionais (convite pra novo cliente, reset de senha)
via Resend. Este documento cobre o setup mínimo pra funcionar em prod.

## 1. Criar conta no Resend (5 min)

1. Vai em https://resend.com → **Sign up** (grátis)
2. Confirma email
3. Menu lateral → **API Keys** → **Create API Key**
4. Nome: `BRM Production` — permissão: `Full access`
5. Copia a chave que aparece (`re_XXXXXXXX...`) — só é mostrada UMA vez

## 2. Configurar .env em staging e prod

SSH em cada servidor e adiciona as variáveis:

```bash
ssh deploy@brm.tec.br
cd /opt/brm/prod   # ou /opt/brm/staging

# Backup do .env atual
cp .env .env.bak.$(date +%Y%m%d-%H%M%S)

# Adiciona as 3 variáveis novas
cat >> .env << 'EOF'

# Resend — envio de email transacional
RESEND_API_KEY=re_XXXXXXXX_COLE_AQUI
EMAIL_FROM=onboarding@resend.dev
APP_URL=https://brm.tec.br
EOF

# Confere
grep -E "RESEND|EMAIL_FROM|APP_URL" .env

# Restart PM2 pra carregar as novas envs
pm2 restart brm-prod
```

Em **staging** troca `APP_URL=https://test.brm.tec.br` e `pm2 restart brm-staging`.

## 3. Testar (2 min)

Loga como super-admin (BRM Demo) → Configurações → **Contas cliente** →
"Nova conta cliente":

- Empresa: **Teste Email**
- Admin nome: **Você**
- Admin email: **seu email real** (Gmail)

Salva. Se aparecer banner verde "Conta criada e email enviado" → funciona.
Verifica seu Gmail (pode cair em Promoções ou Spam nas primeiras tentativas).

## 4. Usar domínio próprio (opcional, mas recomendado depois)

Usando `onboarding@resend.dev` funciona mas parece amador e cai em spam.
Pra usar `noreply@brm.tec.br`:

1. Menu Resend → **Domains** → **Add Domain** → `brm.tec.br`
2. Resend te mostra 3 registros DNS pra criar (TXT e MX pra SPF, DKIM, DMARC)
3. No painel DNS onde `brm.tec.br` está registrado, cria esses 3 registros
4. Volta no Resend e clica em **Verify Domain** (leva 5-30min pra propagar)
5. Quando ficar verde, muda no `.env` do servidor:
   ```
   EMAIL_FROM=noreply@brm.tec.br
   ```
6. `pm2 restart brm-prod`

## 5. Limites do plano grátis

- **100 emails/dia** grátis
- **3000 emails/mês** grátis
- Suficiente pra até ~30 clientes/mês. Depois disso plano pago começa em $20/mês (50k emails).

Ver uso em https://resend.com/emails.

## 6. Se der problema

**Cliente não recebeu email:**
- Cheque `pm2 logs brm-prod --lines 50` — busca "[EmailService]"
- Cheque https://resend.com/emails — mostra cada envio + status
- Cheque spam do cliente

**Email caiu em spam:**
- Configura domínio próprio (passo 4)
- Assunto atual "Configure sua senha — BRM (empresa)" é seguro, não é gatilho
- Reputação melhora com o tempo — os primeiros clientes ajudam

**Se Resend fora do ar:**
- BRM cria a conta mesmo assim, mostra banner âmbar "Email falhou"
- Você usa botão **"Reenviar email"** quando Resend voltar
- Ou muda pra outro provider trocando `EmailService` (SendGrid, AWS SES)
