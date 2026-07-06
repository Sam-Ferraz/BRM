import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { LanguageSelector } from "@/components/language-selector"
import { useMobileDetection } from "@/lib/mobile-utils"
import { toast } from "sonner"
import { Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const { t } = useTranslation()
  const [credentials, setCredentials] = useState({ email: "", password: "" })
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { login, isAuthenticated } = useAuth()
  const isMobile = useMobileDetection()
  const navigate = useNavigate()
  const location = useLocation()
  const emailRef = useRef<HTMLInputElement>(null)

  const from = location.state?.from?.pathname || "/dashboard"

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, from])

  useEffect(() => {
    // Auto-focus email field when component mounts, but not on mobile to prevent keyboard popup
    if (emailRef.current && !isMobile) {
      emailRef.current.focus()
    }
  }, [isMobile])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!credentials.email || !credentials.password) {
      toast.error(t('pleaseFillAllFields'), {
        style: {
          background: '#dc2626',
          color: 'white',
          fontSize: '16px',
          padding: '16px',
          borderRadius: '8px'
        }
      })
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(credentials.email)) {
      toast.error(t('invalidEmailFormat'), {
        style: {
          background: '#dc2626',
          color: 'white',
          fontSize: '16px',
          padding: '16px',
          borderRadius: '8px'
        }
      })
      return
    }

    setIsLoading(true)
    
    try {
      const result = await login(credentials.email, credentials.password)
      
      if (result.success) {
        toast.success(t('successMessages.loginSuccess'))
        navigate(from, { replace: true })
      } else {
        // Generic error message for security - don't reveal if user exists or not
        if (result.error?.includes('conexão') || result.error?.includes('connection')) {
          toast.error(t('connectionError'), {
            style: {
              background: '#dc2626',
              color: 'white',
              fontSize: '16px',
              padding: '16px',
              borderRadius: '8px'
            }
          })
        } else {
          toast.error(t('invalidCredentials'), {
            style: {
              background: '#dc2626',
              color: 'white',
              fontSize: '16px',
              padding: '16px',
              borderRadius: '8px'
            }
          })
        }
      }
    } catch (error) {
      toast.error(t('connectionError'), {
        style: {
          background: '#dc2626',
          color: 'white',
          fontSize: '16px',
          padding: '16px',
          borderRadius: '8px'
        }
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-8">
          <CardTitle className="text-2xl font-bold text-foreground">{t('businessManagement')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                ref={emailRef}
                id="email"
                type="email"
                placeholder={t('email')}
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                className="h-12"
                disabled={isLoading}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t('password')}
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="h-12 pr-12"
                  disabled={isLoading}
                  required
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-12 px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('login')}...
                </>
              ) : (
                t('login')
              )}
            </Button>
            
            <div className="flex items-center justify-center">
              <Link 
                to="/forgot-password" 
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                {t('forgotPassword')}
              </Link>
            </div>
          </form>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">{t('dontHaveAccount')}</p>
              <Link to="/register">
                <Button variant="outline" className="w-full">
                  {t('createAccount')}
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}