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
  
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    })
  }
}

export const apiClient = new ApiClient()

// API endpoints with type safety
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
  temperature?: 'warm' | 'mild' | 'cold'
  status: 'service' | 'visit_foreseen' | 'visit_done' | 'proposal' | 'sold' | 'discarded'
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
  images?: ProductImage[]
  thumbnail?: ProductImage
  has_thumbnail: boolean
}

export interface SalesAgenda {
  id: number
  title: string
  product_name: string
  product_id?: number
  date: string
  status: "Ativa" | "Concluída" | "Cancelada"
}

export interface SalesAgendaCreateInput {
  title: string
  product_name: string
  product_id?: number
  status: "Ativa" | "Concluída" | "Cancelada"
}

export interface FollowUp {
  id: number
  appointment_id: number
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
  totalFollowUps: number
}

export interface AppointmentAnalytics {
  date: string
  answered: number
  not_answered: number
}

export interface AppointmentAnalyticsByType {
  [appointmentType: string]: AppointmentAnalytics[]
}

// API service methods
export const api = {
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

    getThumbnailUrl: (id: number): string => {
      return `/api/products/${id}/thumbnail`
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
}
