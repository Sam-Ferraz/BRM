import { useCallback, useEffect, useState } from "react"

/**
 * Preferência do usuário: mostrar ou não a bottom nav com widgets no rodapé.
 * Persistido em localStorage — vai por conta do BROWSER, não do backend
 * (é preferência puramente visual). Se um dia quisermos sincronizar entre
 * dispositivos, migra pra account.custom_config no backend.
 *
 * Default: LIGADO. Usuário desliga em Configurações se preferir a UI
 * clean sem o rodapé sobrevoando.
 */

const STORAGE_KEY = "brm:bottomNav:enabled"

function readInitial(): boolean {
  if (typeof window === "undefined") return true
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === null) return true
  return raw === "true"
}

// Event bus simples pra propagar mudança entre instâncias do hook (Config
// muda → BottomNav no ProtectedRoute re-renderiza automaticamente).
const listeners = new Set<(v: boolean) => void>()

export function useBottomNavPreference(): { enabled: boolean; setEnabled: (v: boolean) => void } {
  const [enabled, setLocal] = useState<boolean>(readInitial)

  useEffect(() => {
    const listener = (v: boolean) => setLocal(v)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  const setEnabled = useCallback((v: boolean) => {
    localStorage.setItem(STORAGE_KEY, String(v))
    setLocal(v)
    listeners.forEach((fn) => fn(v))
  }, [])

  return { enabled, setEnabled }
}
