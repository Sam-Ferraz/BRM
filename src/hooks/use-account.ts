import { useContext } from 'react'
import { AccountContext } from '@/contexts/account-context'

export function useAccount() {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccount must be used within AccountProvider')
  return ctx
}
