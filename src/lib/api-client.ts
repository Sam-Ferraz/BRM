// API client with authentication support

class ApiClient {
  private baseUrl: string
  
  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl
  }
  
  private getAuthHeaders() {
    const token = localStorage.getItem('auth-token')
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    }
  }
  
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers = this.getAuthHeaders()
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    })
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('auth-token')
        localStorage.removeItem('auth-user')
        window.location.href = '/'
        throw new Error('Authentication required')
      }
      
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }
    
    return response.json()
  }
  
  // Generic CRUD methods
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint)
  }
  
  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
  
  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async patch<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    })
  }
}

export const apiClient = new ApiClient()

// API endpoints with type safety

// ---------------------------------------------------------------------------
// Módulo Usuários + Permissões (isolado — endpoints /api/user-mgmt/*)
// ---------------------------------------------------------------------------

export type ManagedUserRole = 'admin' | 'manager' | 'broker' | 'sdr' | 'administrative'

export interface ManagedUser {
  id: number
  name: string
  email: string
  role: ManagedUserRole
  active: boolean
  last_login_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface PermissionsMatrix {
  modules: {
    module: string
    label: string
    permissions: {
      id: number
      key: string
      label: string
      description?: string | null
      allowed: Record<ManagedUserRole, boolean>
    }[]
  }[]
}

export interface UserPermissionsView {
  modules: {
    module: string
    label: string
    permissions: {
      id: number
      key: string
      label: string
      description?: string | null
      role_default: boolean
      override: boolean | null
      effective: boolean
    }[]
  }[]
}

// ---------------------------------------------------------------------------
// Módulo Contrato (entre Proposta e Venda)
// ---------------------------------------------------------------------------

export type ContractStatus =
  | 'pending_docs'
  | 'awaiting_legal'
  | 'legal_rejected'
  | 'awaiting_manager'
  | 'manager_rejected'
  | 'approved'

export type ContractDocumentType = 'client_doc' | 'contract'

export interface Contract {
  id: number
  deal_id: number
  proposal_id: number
  user_id: number
  status: ContractStatus
  final_value?: string | number | null
  signed_at?: string | null
  legal_notes?: string | null
  manager_notes?: string | null
  legal_reviewed_by?: number | null
  legal_reviewed_at?: string | null
  manager_reviewed_by?: number | null
  manager_reviewed_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface ContractDocument {
  id: number
  contract_id: number
  uploader_id: number
  doc_type: ContractDocumentType
  filename: string
  file_url: string
  file_size?: number | null
  mime_type?: string | null
  display_order: number
  notes?: string | null
  created_at?: string
}

export interface ContractWithDetails extends Contract {
  deal_client?: string
  deal_property_name?: string | null
  broker_name?: string
  legal_reviewer_name?: string | null
  manager_reviewer_name?: string | null
  proposal_value?: string | number
  documents_count?: number
  contract_files_count?: number
}

export interface Deal {
  id: number
  client: string
  origin_date: string
  description?: string
  client_phone?: string
  client_origin?: 'online_lead' | 'own_portfolio' | 'duty_shift' | 'referral' | 'street_client'
  purpose?: 'investment' | 'recreation' | 'both'
  deal_type?: 'purchase' | 'purchase_exchange' | 'exchange'
  gsv: string
  property_name?: string
  status: 'service_cold' | 'service_mild' | 'service_warm' | 'visit_foreseen_cold' | 'visit_foreseen_mild' | 'visit_foreseen_warm' | 'visit_done_cold' | 'visit_done_mild' | 'visit_done_warm' | 'proposal' | 'contract' | 'sold' | 'discarded_no_profile' | 'discarded_no_interest' | 'discarded_competitor' | 'discarded_error'
}

export interface Client {
  id: number
  name: string
  email: string
  phone: string
  city: string
  address?: string
  origin?: 'online_lead' | 'own_portfolio' | 'duty_shift' | 'referral' | 'street_client'
}

export interface Appointment {
  id: number
  client: string
  type: "chat" | "call" | "in_person" | "visit"
  scheduled_datetime: string
  description?: string
  answered: boolean
  property_name?: string | null
}

export interface ProductImage {
  id: number
  product_id: number
  image_url: string
  display_order: number
  is_thumbnail: boolean
  alt_text?: string
  created_at: string
  updated_at: string
}

export interface Product {
  id: number
  name: string
  price?: number
  type?: string
  category?: 'off-plan' | 'completed'
  description?: string
  capture_date?: string | null
  capturer?: string | null
  payment_condition?: string | null
  exchange_car?: boolean
  exchange_property?: boolean
  exclusivity?: boolean
  bedrooms?: number | null
  suites?: number | null
  parking_spots?: number | null
  bathrooms?: number | null
  total_area?: string | null
  private_area?: string | null
  condo_fee?: string | null
  address?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  available_for_sale?: boolean
  status?: ProductStatus
  user_id?: number
  images?: ProductImage[]
  thumbnail?: ProductImage
  has_thumbnail: boolean
  created_at?: string
  updated_at?: string
}

export type ProductStatus = 'available' | 'inactive' | 'sold'

// ---------------------------------------------------------------------------
// Módulo Agenda
// ---------------------------------------------------------------------------

export type CalendarEventStatus = 'scheduled' | 'completed' | 'cancelled'

export interface CalendarEvent {
  id: number
  user_id: number
  title: string
  description?: string | null
  location?: string | null
  start_at: string
  end_at?: string | null
  all_day: boolean
  color?: string | null
  client_id?: number | null
  deal_id?: number | null
  product_id?: number | null
  status: CalendarEventStatus
  created_at?: string
  updated_at?: string
}

export interface CalendarEventWithDetails extends CalendarEvent {
  user_name?: string
  client_name?: string | null
  deal_client?: string | null
  product_name?: string | null
}

export type AgendaItemKind = 'event' | 'followup' | 'google'

export interface AgendaItem {
  kind: AgendaItemKind
  id: number | string
  user_id: number
  user_name?: string | null
  title: string
  description?: string | null
  start_at: string
  end_at?: string | null
  all_day: boolean
  color?: string | null
  status: string
  client_name?: string | null
  deal_client?: string | null
  product_name?: string | null
  followup_next_action?: string | null
  location?: string | null
  html_link?: string | null
}

export interface GoogleCalendarStatus {
  connected: boolean
  email?: string
  last_sync_at?: string | null
}

export interface SalesAgenda {
  id: number
  title: string
  product_name: string
  product_id?: number
  date: string
  status: "Ativa" | "Concluída" | "Cancelada"
  // Campos opcionais vindos do JOIN com products na listagem da vitrine
  product_price?: string | number | null
  product_type?: string | null
  product_category?: string | null
  product_bedrooms?: number | null
  product_suites?: number | null
  product_parking_spots?: number | null
  product_bathrooms?: number | null
  product_total_area?: string | null
  product_private_area?: string | null
  product_neighborhood?: string | null
  product_city?: string | null
  product_state?: string | null
  product_description?: string | null
  has_thumbnail?: boolean
}

export interface SalesAgendaCreateInput {
  title: string
  product_name: string
  product_id?: number
  status: "Ativa" | "Concluída" | "Cancelada"
}

export interface FollowUp {
  id: number
  appointment_id: number | null
  client_name: string
  next_action: string
  next_action_date: string
  completed: boolean
  completed_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface FollowUpWithDetails extends FollowUp {
  appointment?: Appointment
  followup_status: 'open' | 'pending' | 'overdue'
}

export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'counter_proposal' | 'expired'

export interface Proposal {
  id: number
  deal_id: number
  proposal_value: string | number
  payment_condition?: string | null
  proposal_date: string
  validity_date?: string | null
  status: ProposalStatus
  notes?: string | null
  // Campos financeiros (decimal/moeda em BRL):
  vgv?: string | number | null                  // Valor Geral de Vendas
  vgc?: string | number | null                  // Volume Geral de Comissão
  intermediation_rate?: string | number | null  // Taxa de Intermediação em % (ex: 6 = 6%)
  user_id?: number
  created_at?: string
  updated_at?: string
}

export interface ProposalWithDetails extends Proposal {
  deal_client?: string
  deal_property_name?: string | null
  deal_property_price?: string | number | null  // preço do imóvel vinculado (JOIN)
}

// ---------------------------------------------------------------------------
// Módulo Vendas
// ---------------------------------------------------------------------------

export type SaleStatus = 'pending_approval' | 'approved' | 'rejected'

export interface Sale {
  id: number
  proposal_id: number
  deal_id: number
  seller_user_id: number
  sale_date?: string | null
  contract_url?: string | null
  contract_filename?: string | null
  status: SaleStatus
  approved_by_user_id?: number | null
  approved_at?: string | null
  approval_notes?: string | null
  last_modified_by_user_id?: number | null
  last_modified_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface SaleWithDetails extends Sale {
  last_modifier_name?: string | null
  deal_client?: string
  deal_property_name?: string | null
  deal_property_price?: string | number | null
  seller_name?: string
  approver_name?: string | null
  proposal_value?: string | number | null
  proposal_date?: string | null
  proposal_validity_date?: string | null
  proposal_payment_condition?: string | null
  proposal_vgv?: string | number | null
  proposal_vgc?: string | number | null
  proposal_intermediation_rate?: string | number | null
}

// ---------------------------------------------------------------------------
// Módulo Chat (WhatsApp)
// ---------------------------------------------------------------------------

export type WhatsAppSessionStatus = 'connected' | 'disconnected' | 'pending_setup' | 'invalid_credentials'

// Estado vindo do provedor (Baileys) durante o pareamento
export type WhatsAppProviderStatus =
  | 'idle'
  | 'pending_qr'
  | 'connecting'
  | 'connected'
  | 'disconnected'

export interface WhatsAppProviderState {
  status: WhatsAppProviderStatus
  qrCode?: string | null       // data URL PNG (presente quando status === 'pending_qr')
  phoneNumber?: string | null
  displayName?: string | null
}

export interface WhatsAppSession {
  id: number
  user_id: number
  phone_number: string
  display_name?: string | null
  status: WhatsAppSessionStatus
  connected_at?: string | null
  // Cloud API (Meta): campos do BYOK. access_token e app_secret são mascarados ("****") na resposta da API.
  provider?: 'baileys' | 'cloud_api'
  phone_number_id?: string | null
  access_token?: string | null
  app_secret?: string | null
  verify_token?: string | null
  business_account_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface Conversation {
  id: number
  owner_user_id: number
  contact_phone: string
  contact_name?: string | null
  client_id?: number | null
  last_message_at?: string | null
  unread_count: number
  created_at?: string
  updated_at?: string
}

export interface ConversationWithDetails extends Conversation {
  client_name?: string | null
  owner_user_name?: string | null
  last_message_preview?: string | null
  last_message_direction?: 'inbound' | 'outbound' | null
}

// ---------------------------------------------------------------------------
// Módulo Leads
// ---------------------------------------------------------------------------

export type LeadSourceType = 'meta' | 'webhook_generic' | 'manual'
export type LeadSourceStatus = 'active' | 'paused'
export type LeadStatus = 'novo' | 'aceito' | 'descartado'

export interface LeadSource {
  id: number
  name: string
  type: LeadSourceType
  config?: Record<string, any> | null
  webhook_token: string
  status: LeadSourceStatus
  last_lead_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface Lead {
  id: number
  source_id?: number | null
  external_id?: string | null
  name?: string | null
  email?: string | null
  phone?: string | null
  form_data?: Record<string, any> | null
  status: LeadStatus
  client_id?: number | null
  deal_id?: number | null
  accepted_by_user_id?: number | null
  accepted_at?: string | null
  notes?: string | null
  received_at?: string
  created_at?: string
  updated_at?: string
}

export interface LeadWithDetails extends Lead {
  source_name?: string | null
  source_type?: LeadSourceType | null
  accepted_by_user_name?: string | null
  client_name?: string | null
}

export type MessageDirection = 'inbound' | 'outbound'
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed' | 'received'

export interface Message {
  id: number
  conversation_id: number
  direction: MessageDirection
  content: string
  media_url?: string | null
  status: MessageStatus
  provider_message_id?: string | null
  sent_at?: string
  created_at?: string
}

export interface ApiResponse<T> {
  data: T[]
  total: number
}

export interface DashboardStats {
  totalDeals: number
  totalClients: number
  totalProducts: number
  totalAppointments: number
  totalSalesAgenda: number
  // Imóveis visíveis na Vitrine (available_for_sale = true)
  totalShowcaseProducts: number
  totalFollowUps: number
  totalProposals: number
  // Total de vendas (todos os status)
  totalSales: number
  // Contratos em andamento (todos exceto approved, que virou Sale)
  totalContracts: number
  // Conversas não respondidas + ligações não atendidas
  pendingChatAndCalls: number
  // Leads aguardando triagem (status='novo')
  newLeads: number
}

export interface AppointmentAnalytics {
  date: string
  answered: number
  not_answered: number
}

export interface AppointmentAnalyticsByType {
  [appointmentType: string]: AppointmentAnalytics[]
}

export interface DealFunnelStage {
  status: string
  count: number
}

// API service methods
export const api = {
  // Users
  users: {
    list: async (): Promise<{ id: number; name: string; email: string }[]> => {
      const result = await apiClient.get<{ success: boolean; users: { id: number; name: string; email: string }[] }>('/auth/users')
      return result.users || []
    },
  },

  // Dashboard
  dashboard: {
    getStats: async (): Promise<DashboardStats> => {
      return apiClient.get<DashboardStats>('/dashboard/stats')
    },
  },

  // Deals
  deals: {
    getAll: async (filters?: { search?: string; status?: string; sortBy?: string; sortOrder?: "asc" | "desc" }): Promise<ApiResponse<Deal>> => {
      const params = new URLSearchParams()
      if (filters?.search) params.append('search', filters.search)
      if (filters?.status) params.append('status', filters.status)
      if (filters?.sortBy) params.append('sortBy', filters.sortBy)
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder)
      
      const query = params.toString()
      return apiClient.get<ApiResponse<Deal>>(`/deals${query ? `?${query}` : ''}`)
    },

    create: async (data: Omit<Deal, "id">): Promise<Deal> => {
      return apiClient.post<Deal>('/deals', data)
    },

    update: async (id: number, data: Partial<Deal>): Promise<Deal> => {
      return apiClient.put<Deal>(`/deals/${id}`, data)
    },

    delete: async (id: number): Promise<{ success: boolean }> => {
      return apiClient.delete<{ success: boolean }>(`/deals/${id}`)
    },

    getWithoutFollowUps: async (): Promise<ApiResponse<Deal>> => {
      return apiClient.get<ApiResponse<Deal>>('/deals/without-followups')
    },

    getFunnel: async (params?: {
      from?: string
      to?: string
      timezone?: string
      dateField?: 'origin_date' | 'created_at'
    }): Promise<{ data: DealFunnelStage[] }> => {
      const search = new URLSearchParams()
      if (params?.from) search.append('from', params.from)
      if (params?.to) search.append('to', params.to)
      if (params?.timezone) search.append('timezone', params.timezone)
      if (params?.dateField) search.append('dateField', params.dateField)
      const query = search.toString()
      return apiClient.get<{ data: DealFunnelStage[] }>(`/deals/analytics/funnel${query ? `?${query}` : ''}`)
    },
  },

  // Clients
  clients: {
    getAll: async (filters?: { search?: string; sortBy?: string; sortOrder?: "asc" | "desc" }): Promise<ApiResponse<Client>> => {
      const params = new URLSearchParams()
      if (filters?.search) params.append('search', filters.search)
      if (filters?.sortBy) params.append('sortBy', filters.sortBy)
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder)
      
      const query = params.toString()
      return apiClient.get<ApiResponse<Client>>(`/clients${query ? `?${query}` : ''}`)
    },

    create: async (data: Omit<Client, "id">): Promise<Client> => {
      return apiClient.post<Client>('/clients', data)
    },

    update: async (id: number, data: Partial<Client>): Promise<Client> => {
      return apiClient.put<Client>(`/clients/${id}`, data)
    },

    delete: async (id: number): Promise<{ success: boolean }> => {
      return apiClient.delete<{ success: boolean }>(`/clients/${id}`)
    },
  },

  // Products
  products: {
    getAll: async (filters?: {
      search?: string
      type?: string
      category?: string
      sortBy?: string
      sortOrder?: "asc" | "desc"
    }): Promise<ApiResponse<Product>> => {
      const params = new URLSearchParams()
      if (filters?.search) params.append('search', filters.search)
      if (filters?.type) params.append('type', filters.type)
      if (filters?.category) params.append('category', filters.category)
      if (filters?.sortBy) params.append('sortBy', filters.sortBy)
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder)
      
      const query = params.toString()
      return apiClient.get<ApiResponse<Product>>(`/products${query ? `?${query}` : ''}`)
    },

    create: async (data: Omit<Product, "id">): Promise<Product> => {
      return apiClient.post<Product>('/products', data)
    },

    update: async (id: number, data: Partial<Product>): Promise<Product> => {
      return apiClient.put<Product>(`/products/${id}`, data)
    },

    delete: async (id: number): Promise<{ success: boolean }> => {
      return apiClient.delete<{ success: boolean }>(`/products/${id}`)
    },

    // Toggle dedicado pra visibilidade na Vitrine, sem precisar enviar o
    // produto inteiro no PUT (que falha porque a rota PUT exige campos NOT NULL).
    setAvailability: async (id: number, available: boolean): Promise<Product> => {
      return apiClient.patch<Product>(`/products/${id}/availability`, { available_for_sale: available })
    },

    // Multiple images management methods
    getImages: async (id: number): Promise<{ images: ProductImage[] }> => {
      return apiClient.get<{ images: ProductImage[] }>(`/products/${id}/images`)
    },

    uploadImage: async (id: number, imageFile: File, altText?: string): Promise<{ success: boolean; image: ProductImage; message: string }> => {
      const formData = new FormData()
      formData.append('image', imageFile)
      if (altText) {
        formData.append('alt_text', altText)
      }
      
      const response = await fetch(`/api/products/${id}/images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: formData
      })

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('auth-token')
          localStorage.removeItem('auth-user')
          window.location.href = '/'
          throw new Error('Authentication required')
        }
        
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      return response.json()
    },

    uploadMultipleImages: async (id: number, imageFiles: File[]): Promise<{ success: boolean; uploaded: number; total: number; images: ProductImage[]; errors: any[]; message: string }> => {
      const formData = new FormData()
      
      // Append all files with the same field name that multer expects
      imageFiles.forEach((file) => {
        formData.append('images', file)
      })
      
      const response = await fetch(`/api/products/${id}/images/bulk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: formData
      })

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('auth-token')
          localStorage.removeItem('auth-user')
          window.location.href = '/'
          throw new Error('Authentication required')
        }
        
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      return response.json()
    },

    getImageUrl: (id: number, imageId: number): string => {
      return `/api/products/${id}/images/${imageId}`
    },

    // Cache-busting: como a URL do thumbnail é fixa por produto, sem `version`
    // o navegador serve a versão antiga até o cache expirar (24h por padrão).
    // Passe `updated_at` do produto para forçar o navegador a buscar a foto
    // nova sempre que ele for atualizado.
    getThumbnailUrl: (id: number, version?: string | null): string => {
      const v = version ? `?v=${encodeURIComponent(version)}` : ''
      return `/api/products/${id}/thumbnail${v}`
    },

    updateImage: async (id: number, imageId: number, updates: { is_thumbnail?: boolean; display_order?: number; alt_text?: string }): Promise<{ success: boolean; image: ProductImage; message: string }> => {
      return apiClient.put<{ success: boolean; image: ProductImage; message: string }>(`/products/${id}/images/${imageId}`, updates)
    },

    deleteImage: async (id: number, imageId: number): Promise<{ success: boolean; message: string }> => {
      return apiClient.delete<{ success: boolean; message: string }>(`/products/${id}/images/${imageId}`)
    },
  },

  // Appointments
  appointments: {
    getAll: async (filters?: {
      search?: string
      type?: string
      sortBy?: string
      sortOrder?: "asc" | "desc"
    }): Promise<ApiResponse<Appointment>> => {
      const params = new URLSearchParams()
      if (filters?.search) params.append('search', filters.search)
      if (filters?.type) params.append('type', filters.type)
      if (filters?.sortBy) params.append('sortBy', filters.sortBy)
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder)
      
      const query = params.toString()
      return apiClient.get<ApiResponse<Appointment>>(`/appointments${query ? `?${query}` : ''}`)
    },

    getAnalyticsLast7Days: async (timezone?: string): Promise<{ data: AppointmentAnalytics[] }> => {
      const params = new URLSearchParams()
      if (timezone) params.append('timezone', timezone)
      const query = params.toString()
      return apiClient.get<{ data: AppointmentAnalytics[] }>(`/appointments/analytics/last-7-days${query ? `?${query}` : ''}`)
    },

    getAnalyticsByTypeLast7Days: async (timezone?: string): Promise<{ data: AppointmentAnalyticsByType }> => {
      const params = new URLSearchParams()
      if (timezone) params.append('timezone', timezone)
      const query = params.toString()
      return apiClient.get<{ data: AppointmentAnalyticsByType }>(`/appointments/analytics/by-type/last-7-days${query ? `?${query}` : ''}`)
    },

    getAnalyticsByDateRange: async (input: {
      from: string
      to: string
      timezone?: string
      dateField?: 'scheduled_datetime' | 'created_at'
    }): Promise<{ data: AppointmentAnalytics[] }> => {
      const params = new URLSearchParams()
      params.append('from', input.from)
      params.append('to', input.to)
      if (input.timezone) params.append('timezone', input.timezone)
      if (input.dateField) params.append('dateField', input.dateField)
      return apiClient.get<{ data: AppointmentAnalytics[] }>(`/appointments/analytics/by-date-range?${params.toString()}`)
    },

    getAnalyticsByTypeByDateRange: async (input: {
      from: string
      to: string
      timezone?: string
      dateField?: 'scheduled_datetime' | 'created_at'
    }): Promise<{ data: AppointmentAnalyticsByType }> => {
      const params = new URLSearchParams()
      params.append('from', input.from)
      params.append('to', input.to)
      if (input.timezone) params.append('timezone', input.timezone)
      if (input.dateField) params.append('dateField', input.dateField)
      return apiClient.get<{ data: AppointmentAnalyticsByType }>(`/appointments/analytics/by-type/by-date-range?${params.toString()}`)
    },

    create: async (data: Omit<Appointment, "id">): Promise<Appointment> => {
      return apiClient.post<Appointment>('/appointments', data)
    },

    update: async (id: number, data: Partial<Appointment>): Promise<Appointment> => {
      return apiClient.put<Appointment>(`/appointments/${id}`, data)
    },

    delete: async (id: number): Promise<{ success: boolean }> => {
      return apiClient.delete<{ success: boolean }>(`/appointments/${id}`)
    },
  },

  // Sales Agenda
  salesAgenda: {
    getAll: async (filters?: { search?: string; status?: string; sortBy?: string; sortOrder?: "asc" | "desc" }): Promise<ApiResponse<SalesAgenda>> => {
      const params = new URLSearchParams()
      if (filters?.search) params.append('search', filters.search)
      if (filters?.status) params.append('status', filters.status)
      if (filters?.sortBy) params.append('sortBy', filters.sortBy)
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder)

      const query = params.toString()
      return apiClient.get<ApiResponse<SalesAgenda>>(`/sales-agenda${query ? `?${query}` : ''}`)
    },

    create: async (data: Omit<SalesAgenda, "id">): Promise<SalesAgenda> => {
      return apiClient.post<SalesAgenda>('/sales-agenda', data)
    },

    update: async (id: number, data: Partial<SalesAgenda>): Promise<SalesAgenda> => {
      return apiClient.put<SalesAgenda>(`/sales-agenda/${id}`, data)
    },

    delete: async (id: number): Promise<{ success: boolean }> => {
      return apiClient.delete<{ success: boolean }>(`/sales-agenda/${id}`)
    },
  },

  // Follow-ups
  followUps: {
    getAll: async (filters?: {
      search?: string
      sortBy?: string
      sortOrder?: "asc" | "desc"
    }): Promise<ApiResponse<FollowUpWithDetails>> => {
      const params = new URLSearchParams()
      if (filters?.search) params.append('search', filters.search)
      if (filters?.sortBy) params.append('sortBy', filters.sortBy)
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder)

      const query = params.toString()
      return apiClient.get<ApiResponse<FollowUpWithDetails>>(`/follow-ups${query ? `?${query}` : ''}`)
    },

    getById: async (id: number): Promise<FollowUpWithDetails> => {
      return apiClient.get<FollowUpWithDetails>(`/follow-ups/${id}`)
    },

    getByAppointmentId: async (appointmentId: number): Promise<ApiResponse<FollowUp>> => {
      return apiClient.get<ApiResponse<FollowUp>>(`/follow-ups/appointment/${appointmentId}`)
    },

    getStats: async (): Promise<{ data: { open: number; pending: number; overdue: number } }> => {
      return apiClient.get<{ data: { open: number; pending: number; overdue: number } }>('/follow-ups/stats')
    },

    create: async (data: Omit<FollowUp, "id" | "created_at" | "updated_at" | "completed_at">): Promise<FollowUp> => {
      return apiClient.post<FollowUp>('/follow-ups', data)
    },

    update: async (id: number, data: Partial<Omit<FollowUp, "id" | "created_at" | "updated_at">>): Promise<FollowUp> => {
      return apiClient.put<FollowUp>(`/follow-ups/${id}`, data)
    },

    markAsCompleted: async (id: number): Promise<FollowUp> => {
      return apiClient.request<FollowUp>(`/follow-ups/${id}/complete`, {
        method: 'PATCH'
      })
    },

    delete: async (id: number): Promise<{ success: boolean }> => {
      return apiClient.delete<{ success: boolean }>(`/follow-ups/${id}`)
    },
  },

  // Proposals
  proposals: {
    getAll: async (filters?: {
      search?: string
      status?: string
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
      createdFrom?: string
      createdTo?: string
    }): Promise<ApiResponse<ProposalWithDetails>> => {
      const params = new URLSearchParams()
      if (filters?.search) params.append('search', filters.search)
      if (filters?.status) params.append('status', filters.status)
      if (filters?.sortBy) params.append('sortBy', filters.sortBy)
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder)
      if (filters?.createdFrom) params.append('createdFrom', filters.createdFrom)
      if (filters?.createdTo) params.append('createdTo', filters.createdTo)
      const query = params.toString()
      return apiClient.get<ApiResponse<ProposalWithDetails>>(`/proposals${query ? `?${query}` : ''}`)
    },

    getById: async (id: number): Promise<ProposalWithDetails> => {
      return apiClient.get<ProposalWithDetails>(`/proposals/${id}`)
    },

    create: async (data: Omit<Proposal, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Proposal> => {
      return apiClient.post<Proposal>('/proposals', data)
    },

    update: async (id: number, data: Partial<Omit<Proposal, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<Proposal> => {
      return apiClient.put<Proposal>(`/proposals/${id}`, data)
    },

    delete: async (id: number): Promise<{ success: boolean }> => {
      return apiClient.delete<{ success: boolean }>(`/proposals/${id}`)
    },
  },

  // Sales — vendas (nascem automaticamente de propostas aceitas)
  sales: {
    getAll: async (filters?: {
      status?: SaleStatus | 'all'
      search?: string
      createdFrom?: string
      createdTo?: string
    }): Promise<ApiResponse<SaleWithDetails>> => {
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.search) params.append('search', filters.search)
      if (filters?.createdFrom) params.append('createdFrom', filters.createdFrom)
      if (filters?.createdTo) params.append('createdTo', filters.createdTo)
      const query = params.toString()
      return apiClient.get<ApiResponse<SaleWithDetails>>(`/sales${query ? `?${query}` : ''}`)
    },

    getById: async (id: number): Promise<SaleWithDetails> => {
      return apiClient.get<SaleWithDetails>(`/sales/${id}`)
    },

    // Atualiza apenas os campos editáveis (sale_date). Pra upload de contrato
    // usar uploadContract(). Pra aprovar/rejeitar usar approve()/reject().
    update: async (id: number, data: { sale_date?: string | null }): Promise<Sale> => {
      return apiClient.patch<Sale>(`/sales/${id}`, data)
    },

    uploadContract: async (id: number, file: File): Promise<Sale> => {
      const formData = new FormData()
      formData.append('contract', file)
      // Não usa apiClient.post diretamente porque ele força Content-Type JSON
      // (formData precisa de multipart). Pega o token manualmente.
      const token = localStorage.getItem('auth-token')
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const response = await fetch(`/api/sales/${id}/contract`, {
        method: 'POST',
        headers,
        body: formData,
      })
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.error || `Upload failed: ${response.status}`)
      }
      return response.json()
    },

    approve: async (id: number, notes?: string | null): Promise<SaleWithDetails> => {
      return apiClient.post<SaleWithDetails>(`/sales/${id}/approve`, { notes: notes ?? null })
    },

    reject: async (id: number, notes?: string | null): Promise<SaleWithDetails> => {
      return apiClient.post<SaleWithDetails>(`/sales/${id}/reject`, { notes: notes ?? null })
    },

    delete: async (id: number): Promise<{ success: boolean }> => {
      return apiClient.delete<{ success: boolean }>(`/sales/${id}`)
    },
  },

  // Agenda — compromissos manuais + follow-ups em aberto
  calendar: {
    getAgenda: async (filters?: {
      from?: string
      to?: string
      viewAll?: boolean
    }): Promise<ApiResponse<AgendaItem>> => {
      const params = new URLSearchParams()
      if (filters?.from) params.append('from', filters.from)
      if (filters?.to) params.append('to', filters.to)
      if (filters?.viewAll) params.append('viewAll', '1')
      const q = params.toString()
      return apiClient.get<ApiResponse<AgendaItem>>(`/calendar/agenda${q ? `?${q}` : ''}`)
    },
    listEvents: async (filters?: { from?: string; to?: string; viewAll?: boolean }): Promise<ApiResponse<CalendarEventWithDetails>> => {
      const params = new URLSearchParams()
      if (filters?.from) params.append('from', filters.from)
      if (filters?.to) params.append('to', filters.to)
      if (filters?.viewAll) params.append('viewAll', '1')
      const q = params.toString()
      return apiClient.get<ApiResponse<CalendarEventWithDetails>>(`/calendar/events${q ? `?${q}` : ''}`)
    },
    getEvent: async (id: number): Promise<{ data: CalendarEventWithDetails }> => {
      return apiClient.get<{ data: CalendarEventWithDetails }>(`/calendar/events/${id}`)
    },
    createEvent: async (input: Partial<CalendarEvent>): Promise<{ data: CalendarEvent }> => {
      return apiClient.post<{ data: CalendarEvent }>('/calendar/events', input)
    },
    updateEvent: async (id: number, input: Partial<CalendarEvent>): Promise<{ data: CalendarEvent }> => {
      return apiClient.put<{ data: CalendarEvent }>(`/calendar/events/${id}`, input)
    },
    deleteEvent: async (id: number): Promise<{ success: boolean }> => {
      return apiClient.delete<{ success: boolean }>(`/calendar/events/${id}`)
    },
  },

  // Módulo Contrato — etapa entre Proposta e Venda
  contracts: {
    list: async (filters?: {
      status?: ContractStatus | 'all'
      search?: string
      viewAll?: boolean
    }): Promise<ApiResponse<ContractWithDetails>> => {
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.search) params.append('search', filters.search)
      if (filters?.viewAll) params.append('viewAll', '1')
      const q = params.toString()
      return apiClient.get<ApiResponse<ContractWithDetails>>(`/contracts${q ? `?${q}` : ''}`)
    },

    getById: async (id: number): Promise<{ data: ContractWithDetails }> => {
      return apiClient.get<{ data: ContractWithDetails }>(`/contracts/${id}`)
    },

    getCounts: async (viewAll?: boolean): Promise<{ data: Record<ContractStatus, number> }> => {
      return apiClient.get<{ data: Record<ContractStatus, number> }>(
        `/contracts/counts${viewAll ? '?viewAll=1' : ''}`
      )
    },

    listDocuments: async (id: number): Promise<{ data: ContractDocument[] }> => {
      return apiClient.get<{ data: ContractDocument[] }>(`/contracts/${id}/documents`)
    },

    /**
     * Upload de documento — usa FormData porque o multer do backend espera
     * multipart/form-data com campo "file". doc_type default é 'client_doc'.
     */
    uploadDocument: async (
      contractId: number,
      file: File,
      docType: ContractDocumentType = 'client_doc',
      notes?: string
    ): Promise<{ data: ContractDocument }> => {
      const form = new FormData()
      form.append('file', file)
      form.append('doc_type', docType)
      if (notes) form.append('notes', notes)
      const token = localStorage.getItem('auth-token')
      const res = await fetch(`/api/contracts/${contractId}/documents`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      return res.json()
    },

    deleteDocument: async (contractId: number, documentId: number): Promise<{ success: boolean }> => {
      return apiClient.delete<{ success: boolean }>(
        `/contracts/${contractId}/documents/${documentId}`
      )
    },

    submitToLegal: async (id: number): Promise<{ data: Contract }> => {
      return apiClient.post<{ data: Contract }>(`/contracts/${id}/submit-legal`, {})
    },

    resubmitToLegal: async (id: number): Promise<{ data: Contract }> => {
      return apiClient.post<{ data: Contract }>(`/contracts/${id}/resubmit-legal`, {})
    },

    legalApprove: async (id: number, notes?: string): Promise<{ data: Contract }> => {
      return apiClient.post<{ data: Contract }>(`/contracts/${id}/legal-approve`, { notes })
    },

    legalReject: async (id: number, notes: string): Promise<{ data: Contract }> => {
      return apiClient.post<{ data: Contract }>(`/contracts/${id}/legal-reject`, { notes })
    },

    managerApprove: async (
      id: number,
      input?: { notes?: string; final_value?: string | number }
    ): Promise<{ data: Contract }> => {
      return apiClient.post<{ data: Contract }>(`/contracts/${id}/manager-approve`, input || {})
    },

    managerReject: async (id: number, notes: string): Promise<{ data: Contract }> => {
      return apiClient.post<{ data: Contract }>(`/contracts/${id}/manager-reject`, { notes })
    },
  },

  // Gestão de usuários + permissões (admin only, endpoints /api/user-mgmt/*)
  userMgmt: {
    listUsers: async (): Promise<{ data: ManagedUser[] }> => {
      return apiClient.get<{ data: ManagedUser[] }>('/user-mgmt/users')
    },
    createUser: async (input: {
      name: string
      email: string
      password: string
      role: ManagedUserRole
    }): Promise<{ data: ManagedUser }> => {
      return apiClient.post<{ data: ManagedUser }>('/user-mgmt/users', input)
    },
    updateUser: async (
      id: number,
      input: Partial<{ name: string; email: string; role: ManagedUserRole; active: boolean }>
    ): Promise<{ data: ManagedUser }> => {
      return apiClient.put<{ data: ManagedUser }>(`/user-mgmt/users/${id}`, input)
    },
    resetPassword: async (id: number, newPassword: string): Promise<{ success: boolean }> => {
      return apiClient.post<{ success: boolean }>(`/user-mgmt/users/${id}/reset-password`, {
        new_password: newPassword,
      })
    },
    getPermissionsMatrix: async (): Promise<{ data: PermissionsMatrix }> => {
      return apiClient.get<{ data: PermissionsMatrix }>('/user-mgmt/permissions/matrix')
    },
    savePermissionsMatrix: async (
      updates: { role: ManagedUserRole; permission_id: number; allowed: boolean }[]
    ): Promise<{ success: boolean; count: number }> => {
      return apiClient.put<{ success: boolean; count: number }>('/user-mgmt/permissions/matrix', {
        updates,
      })
    },
    getUserPermissions: async (userId: number): Promise<{ data: UserPermissionsView }> => {
      return apiClient.get<{ data: UserPermissionsView }>(`/user-mgmt/users/${userId}/permissions`)
    },
    saveUserPermissions: async (
      userId: number,
      updates: { permission_id: number; allowed: boolean | null }[]
    ): Promise<{ success: boolean; count: number }> => {
      return apiClient.put<{ success: boolean; count: number }>(
        `/user-mgmt/users/${userId}/permissions`,
        { updates }
      )
    },
  },

  // Google Calendar — integração unidirecional Google → BRM (read-only)
  googleCalendar: {
    getStatus: async (): Promise<{ data: GoogleCalendarStatus }> => {
      return apiClient.get<{ data: GoogleCalendarStatus }>('/google-calendar/status')
    },
    getAuthUrl: async (): Promise<{ data: { url: string } }> => {
      return apiClient.get<{ data: { url: string } }>('/google-calendar/auth-url')
    },
    disconnect: async (): Promise<{ success: boolean }> => {
      return apiClient.delete<{ success: boolean }>('/google-calendar/disconnect')
    },
  },

  // WhatsApp — sessão (vínculo entre usuário do BRM e número WhatsApp)
  whatsapp: {
    getSession: async (): Promise<{ data: WhatsAppSession | null }> => {
      return apiClient.get<{ data: WhatsAppSession | null }>('/whatsapp/session')
    },
    connect: async (input: { phone_number: string; display_name?: string | null }): Promise<{ data: WhatsAppSession }> => {
      return apiClient.post<{ data: WhatsAppSession }>('/whatsapp/session', input)
    },
    disconnect: async (): Promise<{ success: boolean }> => {
      return apiClient.delete<{ success: boolean }>('/whatsapp/session')
    },
    // Pareamento via QR Code (Baileys)
    start: async (): Promise<{ data: WhatsAppProviderState }> => {
      return apiClient.post<{ data: WhatsAppProviderState }>('/whatsapp/start', {})
    },
    getState: async (): Promise<{ data: WhatsAppProviderState }> => {
      return apiClient.get<{ data: WhatsAppProviderState }>('/whatsapp/state')
    },

    // Conexão via WhatsApp Cloud API (Meta oficial) — BYOK
    cloudApiConnect: async (input: {
      phone_number: string
      display_name?: string | null
      phone_number_id: string
      access_token: string
      app_secret: string
      verify_token: string
      business_account_id?: string | null
    }): Promise<{ data: WhatsAppSession }> => {
      return apiClient.post<{ data: WhatsAppSession }>('/whatsapp/cloud-api/connect', input)
    },
  },

  // Chat — conversas e mensagens
  chat: {
    listConversations: async (): Promise<ApiResponse<ConversationWithDetails>> => {
      return apiClient.get<ApiResponse<ConversationWithDetails>>('/chat/conversations')
    },
    getConversation: async (id: number): Promise<{ conversation: ConversationWithDetails; messages: Message[] }> => {
      return apiClient.get<{ conversation: ConversationWithDetails; messages: Message[] }>(`/chat/conversations/${id}`)
    },
    startConversation: async (input: {
      contact_phone: string
      contact_name?: string | null
      message: string
    }): Promise<{ conversation: ConversationWithDetails; message: Message }> => {
      return apiClient.post<{ conversation: ConversationWithDetails; message: Message }>('/chat/conversations', input)
    },
    sendMessage: async (conversationId: number, content: string): Promise<{ data: Message }> => {
      return apiClient.post<{ data: Message }>(`/chat/conversations/${conversationId}/messages`, { content })
    },
    // Endpoint stub para simular entrada de mensagem enquanto não há provedor real.
    simulateInbound: async (input: {
      owner_user_id?: number
      from_phone: string
      from_name?: string | null
      content: string
    }): Promise<{ data: Message }> => {
      return apiClient.post<{ data: Message }>('/chat/inbound', input)
    },
  },

  // Leads — integrações de captação + triagem
  leads: {
    list: async (status?: LeadStatus): Promise<ApiResponse<LeadWithDetails>> => {
      const query = status ? `?status=${status}` : ''
      return apiClient.get<ApiResponse<LeadWithDetails>>(`/leads${query}`)
    },
    getCounts: async (): Promise<{ data: Record<LeadStatus, number> }> => {
      return apiClient.get<{ data: Record<LeadStatus, number> }>(`/leads/counts`)
    },
    getById: async (id: number): Promise<{ data: LeadWithDetails }> => {
      return apiClient.get<{ data: LeadWithDetails }>(`/leads/${id}`)
    },
    createManual: async (input: {
      name?: string | null
      email?: string | null
      phone?: string | null
      notes?: string | null
    }): Promise<{ data: Lead }> => {
      return apiClient.post<{ data: Lead }>('/leads', input)
    },
    accept: async (id: number): Promise<{ data: { lead: Lead; client_id: number; deal_id: number } }> => {
      return apiClient.post<{ data: { lead: Lead; client_id: number; deal_id: number } }>(`/leads/${id}/accept`, {})
    },
    discard: async (id: number, notes?: string | null): Promise<{ data: Lead }> => {
      return apiClient.post<{ data: Lead }>(`/leads/${id}/discard`, { notes })
    },

    // Lead Sources (somente admin)
    sources: {
      list: async (): Promise<{ data: LeadSource[] }> => {
        return apiClient.get<{ data: LeadSource[] }>('/leads/sources')
      },
      create: async (input: {
        name: string
        type: LeadSourceType
        config?: Record<string, any> | null
      }): Promise<{ data: LeadSource }> => {
        return apiClient.post<{ data: LeadSource }>('/leads/sources', input)
      },
      update: async (
        id: number,
        input: { name?: string; config?: Record<string, any> | null; status?: LeadSourceStatus }
      ): Promise<{ data: LeadSource }> => {
        return apiClient.put<{ data: LeadSource }>(`/leads/sources/${id}`, input)
      },
      delete: async (id: number): Promise<{ success: boolean }> => {
        return apiClient.delete<{ success: boolean }>(`/leads/sources/${id}`)
      },
    },
  },
}
