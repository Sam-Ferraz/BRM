import { createContext } from 'react'

// Multi-tenancy: cada empresa/cliente é uma account. Custom config guarda
// tema, branding, feature flags. Frontend lê no boot e aplica.

export interface AccountCustomConfig {
  theme?: {
    primary_color?: string
    secondary_color?: string
    sidebar_color?: string
  }
  branding?: {
    logo_url?: string
    company_name?: string
    browser_title?: string
  }
  features?: {
    contracts_enabled?: boolean
    google_calendar_enabled?: boolean
    whatsapp_enabled?: boolean
    leads_module_enabled?: boolean
  }
  defaults?: {
    timezone?: string
    currency?: string
    language?: string
  }
  // Override por-account das colunas do Kanban de Negocios. Chave = key
  // da PhaseColumn ('service', 'visit_foreseen', 'proposal', etc). Deixar
  // qualquer campo vazio = mantem o default do sistema.
  pipeline_columns?: {
    [key: string]: {
      label?: string
      color?: string  // hex background do header (ex: '#dbeafe')
      hidden?: boolean
      position?: number
    }
  }
}

export interface Account {
  id: number
  name: string
  plan: 'trial' | 'basic' | 'pro' | 'enterprise'
  custom_config: AccountCustomConfig
  is_active: boolean
  created_at?: string
  updated_at?: string
}

interface AccountContextType {
  account: Account | null
  isLoading: boolean
  refresh: () => Promise<void>
  updateConfig: (config: AccountCustomConfig) => Promise<void>
}

export const AccountContext = createContext<AccountContextType | undefined>(undefined)
