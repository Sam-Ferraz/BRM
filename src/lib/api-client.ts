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
  value: string
  status: "Em Andamento" | "Proposta" | "Fechado"
  date: string
  description?: string
}

export interface Client {
  id: number
  name: string
  email: string
  phone: string
  city: string
  address?: string
  company?: string
}

export interface Appointment {
  id: number
  client: string
  type: "Suporte" | "Vendas" | "Consultoria"
  status: "Em Andamento" | "Concluído" | "Pendente"
  scheduled_datetime: string
  description?: string
}

export interface Product {
  id: number
  name: string
  price: string
  category: string
  stock: number
  description?: string
}

export interface SalesAgenda {
  id: number
  title: string
  client: string
  value: string
  date: string
  status: "Ativa" | "Concluída" | "Cancelada"
}

export interface ApiResponse<T> {
  data: T[]
  total: number
}

// API service methods
export const api = {
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
      category?: string
      stock?: string
      sortBy?: string
      sortOrder?: "asc" | "desc"
    }): Promise<ApiResponse<Product>> => {
      const params = new URLSearchParams()
      if (filters?.search) params.append('search', filters.search)
      if (filters?.category) params.append('category', filters.category)
      if (filters?.stock) params.append('stock', filters.stock)
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
  },

  // Appointments
  appointments: {
    getAll: async (filters?: {
      search?: string
      status?: string
      type?: string
      sortBy?: string
      sortOrder?: "asc" | "desc"
    }): Promise<ApiResponse<Appointment>> => {
      const params = new URLSearchParams()
      if (filters?.search) params.append('search', filters.search)
      if (filters?.status) params.append('status', filters.status)
      if (filters?.type) params.append('type', filters.type)
      if (filters?.sortBy) params.append('sortBy', filters.sortBy)
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder)
      
      const query = params.toString()
      return apiClient.get<ApiResponse<Appointment>>(`/appointments${query ? `?${query}` : ''}`)
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
}