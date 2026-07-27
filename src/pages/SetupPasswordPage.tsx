import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Eye, EyeOff, KeyRound, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

/**
 * SetupPasswordPage — página pública que recebe o token do email e permite
 * ao user definir sua senha (primeiro acesso OU reset).
 *
 * Ao aplicar a senha com sucesso, o backend devolve o JWT — salvamos no
 * localStorage e redirecionamos pro dashboard (auto-login).
 */

type ValidationState =
  | { status: 'validating' }
  | { status: 'invalid'; error: string }
  | { status: 'valid'; email: string; name: string; purpose: 'setup' | 'reset' }

export default function SetupPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const token = params.get('token') || ''

  const [validation, setValidation] = useState<ValidationState>({ status: 'validating' })
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setValidation({ status: 'invalid', error: 'Link inválido — token ausente.' })
      return
    }
    let cancelled = false
    fetch(`/api/auth/validate-setup-token?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.valid) {
          setValidation({
            status: 'valid',
            email: data.email,
            name: data.name,
            purpose: data.purpose,
          })
        } else {
          setValidation({
            status: 'invalid',
            error: 'Este link é inválido ou já expirou. Peça um novo pro administrador da sua conta.',
          })
        }
      })
      .catch(() => {
        if (cancelled) return
        setValidation({ status: 'invalid', error: 'Erro ao validar o link. Tente novamente.' })
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      toast({ title: 'Senha muito curta', description: 'Mínimo 8 caracteres', variant: 'destructive' })
      return
    }
    if (password !== confirmPassword) {
      toast({ title: 'Senhas não conferem', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!data.success) {
        toast({ title: 'Erro', description: data.error || 'Falha ao definir senha', variant: 'destructive' })
        return
      }
      // Auto-login: salva token/user no localStorage e vai pro dashboard
      localStorage.setItem('auth-token', data.token)
      localStorage.setItem('auth-user', JSON.stringify(data.user))
      toast({ title: 'Senha definida', description: 'Bem-vindo ao BRM!' })
      // Reload pra AuthContext re-hidratar do localStorage
      window.location.href = '/dashboard'
    } catch {
      toast({ title: 'Erro de conexão', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            Configure sua senha
          </CardTitle>
        </CardHeader>
        <CardContent>
          {validation.status === 'validating' && (
            <div className="flex items-center gap-3 py-8 justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Validando link...</span>
            </div>
          )}

          {validation.status === 'invalid' && (
            <div className="text-center py-6 space-y-3">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
              <p className="text-sm text-muted-foreground">{validation.error}</p>
              <Button variant="outline" onClick={() => navigate('/')}>
                Ir para o login
              </Button>
            </div>
          )}

          {validation.status === 'valid' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="text-muted-foreground text-xs mb-1">
                  {validation.purpose === 'reset' ? 'Redefinindo senha para:' : 'Definindo senha para:'}
                </p>
                <p className="font-medium">
                  {validation.name} <span className="text-muted-foreground">({validation.email})</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Nova senha *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirme a senha *</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Digite a senha novamente"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
                {confirmPassword && password === confirmPassword && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Senhas conferem
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Definindo...' : 'Definir senha e entrar'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
