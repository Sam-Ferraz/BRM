# Setup: subdomínio `app.brm.tec.br` para o CRM + landing em `brm.tec.br`

Este passo-a-passo separa o produto (CRM) do site institucional/vendas:

```
https://brm.tec.br/          →  Landing page (vendas)
https://app.brm.tec.br/      →  Sistema CRM (produto atual)
https://test.brm.tec.br/     →  Staging (sem mudança)
```

---

## 1. Configurar DNS

No provedor onde o domínio `brm.tec.br` está registrado (Registro.br, Cloudflare,
HostGator, etc), adicione **um** registro novo:

```
Tipo:    A
Nome:    app
Valor:   178.156.148.90    (mesmo IP do servidor atual — o que brm.tec.br já
                            aponta hoje)
TTL:     3600 (ou "Auto")
```

Se o provedor usar `CNAME`, pode ser:

```
Tipo:    CNAME
Nome:    app
Valor:   brm.tec.br
TTL:     3600
```

**Propagação:** 5-30min normalmente, até 24h em casos raros. Pra conferir:

```bash
dig app.brm.tec.br +short
# Deve retornar 178.156.148.90
```

ou:

```bash
nslookup app.brm.tec.br
```

Só rode o script da seção 2 **depois** que o `dig` já retornar o IP certo.

---

## 2. Rodar o script no servidor

Com DNS propagado, SSH no servidor como `deploy@brm.tec.br`:

```bash
# Puxa a ultima versao do repo (os arquivos ja estao la depois do deploy auto)
cd /opt/brm/prod
git pull origin trunk

# Roda o script como root (ele usa sudo internamente nas partes que precisam)
sudo bash deploy/subdomain/setup-subdomain.sh
```

O script faz **nessa ordem**:

1. Valida pré-requisitos (root, nginx, certbot, DNS resolvendo)
2. **Backup** dos arquivos nginx atuais pra `/etc/nginx/_backup_subdomain_<data>/`
3. Cria `/var/www/brm-landing/` e copia o `index.html` placeholder
4. Instala vhost `app.brm.tec.br` servindo o CRM (mesma lógica do brm.tec.br atual)
5. Substitui vhost `brm.tec.br` pra servir só os arquivos da landing
6. Testa config (`nginx -t`) — aborta se falhar
7. Reload do nginx
8. Emite certificado SSL pra `app.brm.tec.br` via certbot
9. Reload final

**Se algo falhar**, o script loga o erro e pede pra rodar `restore-backup.sh` que
desfaz tudo via backup. Nenhum passo é destrutivo sem confirmação.

---

## 3. Testar

Depois do script:

```bash
curl -I https://brm.tec.br          # deve retornar 200 + servir landing
curl -I https://app.brm.tec.br      # deve retornar 200 + servir o app CRM
curl -I https://app.brm.tec.br/api/health  # backend OK?
```

Abra no navegador:
- `https://brm.tec.br` → vê a landing placeholder
- `https://app.brm.tec.br` → vê a tela de login do CRM
- Login + navegação normal, Chat, etc

---

## 4. Trocar a landing placeholder

Depois que você me passar o exemplar da landing, o fluxo é:

```bash
# No servidor:
sudo rm -rf /var/www/brm-landing/*
# Copia os arquivos novos pra lá (via scp, git ou wget):
sudo cp -r /caminho/pra/landing-nova/* /var/www/brm-landing/
sudo chown -R www-data:www-data /var/www/brm-landing
```

Nenhum reload de nginx necessário — arquivos estáticos recarregam direto.

---

## 5. Rollback (se precisar voltar)

```bash
sudo bash deploy/subdomain/restore-backup.sh
```

Isso restaura os vhosts antigos e volta tudo pra como estava — `brm.tec.br`
volta a servir o CRM e `app.brm.tec.br` deixa de resolver.

---

## O que **NÃO muda**

- Código do CRM (zero edição)
- Build, deploy auto do GitHub Actions
- Banco de dados
- Backend (porta 3001)
- Staging (`test.brm.tec.br`)
- Backups
