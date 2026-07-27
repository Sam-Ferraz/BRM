import React, { useCallback, useEffect, useState } from 'react'
import { Account, AccountContext, AccountCustomConfig } from './account-context'
import { useAuth } from '@/hooks/use-auth'

/**
 * AccountProvider — hidrata a account do user logado via /api/accounts/me
 * assim que a autenticação é confirmada. Aplica tema/branding/browser title
 * automaticamente via CSS variables e document.title.
 *
 * Se o user não estiver autenticado, mantém account=null.
 * Se falhar o fetch (rede/500), tenta silencioso — não bloqueia app.
 */
export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token } = useAuth()
  const [account, setAccount] = useState<Account | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const applyThemeAndBranding = useCallback((acc: Account) => {
    const cfg = acc.custom_config || {}

    // Aplica CSS variables — o Tailwind já usa var(--primary), etc no theme
    const root = document.documentElement
    if (cfg.theme?.primary_color) {
      root.style.setProperty('--primary-custom', cfg.theme.primary_color)
    }
    if (cfg.theme?.sidebar_color) {
      root.style.setProperty('--sidebar-custom', cfg.theme.sidebar_color)
    }

    // Aplica título da aba
    if (cfg.branding?.browser_title) {
      document.title = cfg.branding.browser_title
    } else if (cfg.branding?.company_name) {
      document.title = `${cfg.branding.company_name} — BRM`
    } else {
      document.title = `${acc.name} — BRM`
    }

    // Favicon custom não altera aqui (requer download+troca do link) —
    // deixa pra iteração futura se pedirem
  }, [])

  const fetchAccount = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setAccount(null)
      setIsLoading(false)
      return
    }
    try {
      const res = await fetch('/api/accounts/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        console.warn('[AccountContext] falha ao buscar account:', res.status)
        setAccount(null)
        return
      }
      const data = await res.json()
      setAccount(data.data)
      applyThemeAndBranding(data.data)
    } catch (err) {
      console.warn('[AccountContext] erro:', err)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, token, applyThemeAndBranding])

  useEffect(() => {
    fetchAccount()
  }, [fetchAccount])

  const updateConfig = useCallback(async (config: AccountCustomConfig) => {
    if (!token) return
    const res = await fetch('/api/accounts/me/config', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ custom_config: config }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || 'Falha ao atualizar configuração')
    }
    const data = await res.json()
    setAccount(data.data)
    applyThemeAndBranding(data.data)
  }, [token, applyThemeAndBranding])

  const value = { account, isLoading, refresh: fetchAccount, updateConfig }

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}
