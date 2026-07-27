# Guia de integração da LP com o BRM

Documento pra você (Sam) usar quando estiver conectando sua landing page
com o backend do BRM. Cobre validação de cupom (já pronto) e o fluxo de
checkout (Camada C, futuro).

## Endpoints públicos disponíveis (não precisam auth)

### `POST /api/coupons/validate`

Valida um cupom antes do checkout. LP deve chamar quando o visitante
clicar em "Aplicar cupom".

**Request:**
```json
POST https://brm.tec.br/api/coupons/validate
Content-Type: application/json

{
  "code": "LANCAMENTO50",
  "plan": "pro"            // opcional — filtra cupons que só valem pra planos específicos
}
```

**Response — cupom válido:**
```json
{
  "valid": true,
  "coupon": {
    "code": "LANCAMENTO50",
    "discount_type": "percent",
    "discount_value": 50,
    "description": "Cupom de lançamento"
  },
  "discount_display": "50% de desconto em todas as mensalidades"
}
```

**Response — cupom inválido/expirado/esgotado:**
```json
{
  "valid": false,
  "error": "Cupom expirado"     // ou "Cupom esgotado", "Cupom inválido", etc
}
```

**Exemplo de uso no seu frontend (React/Next):**

```typescript
async function validateCoupon(code: string, plan: string) {
  const res = await fetch('https://brm.tec.br/api/coupons/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, plan }),
  })
  return res.json()
}

// No handler do form:
const result = await validateCoupon(code, 'pro')
if (result.valid) {
  setDiscount(result.discount_display)
  applyCoupon(result.coupon)
} else {
  showError(result.error)
}
```

## Cálculo de preço com desconto (client-side)

Se o cupom valida OK, você calcula o preço final assim:

```typescript
function applyDiscount(basePrice: number, coupon: { discount_type: 'percent' | 'fixed_brl', discount_value: number }) {
  if (coupon.discount_type === 'percent') {
    return basePrice * (1 - coupon.discount_value / 100)
  }
  // fixed_brl vem em CENTAVOS (ex: 5000 = R$50)
  const discountReais = coupon.discount_value / 100
  return Math.max(0, basePrice - discountReais)
}

// Exemplo: plano Pro = R$499/mês, cupom LANCAMENTO50 (50%)
applyDiscount(499, { discount_type: 'percent', discount_value: 50 })
// → 249.50
```

## Fluxo Camada C (a fazer — depois que sua LP tiver checkout Stripe)

Quando implementarmos a Camada C, o fluxo vai ser:

```
[Visitante na LP]
   ↓
1. Preenche: nome da empresa, seu nome, seu email, escolhe plano, aplica cupom
   ↓
2. LP chama POST https://brm.tec.br/api/checkout/create-session
   Body: { plan, coupon_code, admin_name, admin_email, account_name }
   ↓
3. Backend valida cupom + cria Stripe Checkout Session
   Retorna: { url: 'https://checkout.stripe.com/...' }
   ↓
4. LP redireciona pra essa URL
   ↓
5. Cliente paga no Stripe (hospedado)
   ↓
6. Stripe → webhook POST https://brm.tec.br/api/checkout/webhook
   ↓
7. Backend: cria account + user admin + gera token de setup + envia email
   ↓
8. Cliente recebe email do BRM → clica → define senha → cai no dashboard
```

## Checklist pra você implementar na LP agora (Camada B pronta)

- [ ] Página `/planos` com cards dos planos (Trial/Basic/Pro/Enterprise)
- [ ] Cada plano tem botão "Contratar"
- [ ] Ao clicar, abre modal/página com form: nome empresa, seu nome, seu email
- [ ] Campo "cupom de desconto" com botão "Aplicar"
- [ ] Ao aplicar cupom, chama `POST /api/coupons/validate` → mostra desconto
- [ ] Botão final "Finalizar" — **por enquanto** desabilita ou avisa "Em breve" (aguarda Camada C)
- [ ] Alternativa temporária: o botão "Finalizar" faz POST pra um Google Form ou envia email pra você — você recebe os dados e cria a conta manualmente no `/admin/accounts`

## CORS

Se sua LP roda em domínio diferente (ex: `brm.tec.br` LP e `app.brm.tec.br`
BRM), o CORS do backend precisa aceitar. Hoje ele aceita apenas
`CLIENT_URL` do `.env`. Ajustamos quando você tiver os domínios definidos.

## Setup de cupom-teste

No BRM (`https://brm.tec.br/admin/coupons`):

- Código: `TESTE100`
- Tipo: Percentual
- Valor: 100
- Ativo: sim

Depois na sua LP local, chama:
```bash
curl -X POST https://brm.tec.br/api/coupons/validate \
  -H "Content-Type: application/json" \
  -d '{"code":"TESTE100"}'
```

Deve retornar `valid: true`.
