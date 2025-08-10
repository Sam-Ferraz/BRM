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
export interface Negocio {
  id: number
  cliente: string
  valor: string
  status: "Em Andamento" | "Proposta" | "Fechado"
  data: string
  descricao?: string
}

export interface Cliente {
  id: number
  nome: string
  email: string
  telefone: string
  cidade: string
  endereco?: string
  empresa?: string
}

export interface Atendimento {
  id: number
  cliente: string
  tipo: "Suporte" | "Vendas" | "Consultoria"
  status: "Em Andamento" | "Concluído" | "Pendente"
  data: string
  hora: string
  descricao?: string
}

export interface Produto {
  id: number
  nome: string
  preco: string
  categoria: string
  estoque: number
  descricao?: string
}

export interface PautaVenda {
  id: number
  titulo: string
  cliente: string
  valor: string
  data: string
  status: "Ativa" | "Concluída" | "Cancelada"
}

export interface ApiResponse<T> {
  data: T[]
  total: number
}

// API service methods
export const api = {
  // Negócios
  negocios: {
    getAll: async (filters?: { search?: string; status?: string; sortBy?: string; sortOrder?: "asc" | "desc" }): Promise<ApiResponse<Negocio>> => {
      const params = new URLSearchParams()
      if (filters?.search) params.append('search', filters.search)
      if (filters?.status) params.append('status', filters.status)
      if (filters?.sortBy) params.append('sortBy', filters.sortBy)
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder)
      
      const query = params.toString()
      return apiClient.get<ApiResponse<Negocio>>(`/negocios${query ? `?${query}` : ''}`)
    },

    create: async (data: Omit<Negocio, "id">): Promise<Negocio> => {
      return apiClient.post<Negocio>('/negocios', data)
    },

    update: async (id: number, data: Partial<Negocio>): Promise<Negocio> => {
      return apiClient.put<Negocio>(`/negocios/${id}`, data)
    },

    delete: async (id: number): Promise<{ success: boolean }> => {
      return apiClient.delete<{ success: boolean }>(`/negocios/${id}`)
    },
  },

  // Clientes
  clientes: {
    getAll: async (filters?: { search?: string; sortBy?: string; sortOrder?: "asc" | "desc" }): Promise<ApiResponse<Cliente>> => {
      const params = new URLSearchParams()
      if (filters?.search) params.append('search', filters.search)
      if (filters?.sortBy) params.append('sortBy', filters.sortBy)
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder)
      
      const query = params.toString()
      return apiClient.get<ApiResponse<Cliente>>(`/clientes${query ? `?${query}` : ''}`)
    },

    create: async (data: Omit<Cliente, "id">): Promise<Cliente> => {
      return apiClient.post<Cliente>('/clientes', data)
    },

    update: async (id: number, data: Partial<Cliente>): Promise<Cliente> => {
      return apiClient.put<Cliente>(`/clientes/${id}`, data)
    },

    delete: async (id: number): Promise<{ success: boolean }> => {
      return apiClient.delete<{ success: boolean }>(`/clientes/${id}`)
    },
  },

  // Produtos
  produtos: {
    getAll: async (filters?: {
      search?: string
      categoria?: string
      estoque?: string
      sortBy?: string
      sortOrder?: "asc" | "desc"
    }): Promise<ApiResponse<Produto>> => {
      const params = new URLSearchParams()
      if (filters?.search) params.append('search', filters.search)
      if (filters?.categoria) params.append('categoria', filters.categoria)
      if (filters?.estoque) params.append('estoque', filters.estoque)
      if (filters?.sortBy) params.append('sortBy', filters.sortBy)
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder)
      
      const query = params.toString()
      return apiClient.get<ApiResponse<Produto>>(`/produtos${query ? `?${query}` : ''}`)
    },

    create: async (data: Omit<Produto, "id">): Promise<Produto> => {
      return apiClient.post<Produto>('/produtos', data)
    },

    update: async (id: number, data: Partial<Produto>): Promise<Produto> => {
      return apiClient.put<Produto>(`/produtos/${id}`, data)
    },

    delete: async (id: number): Promise<{ success: boolean }> => {
      return apiClient.delete<{ success: boolean }>(`/produtos/${id}`)
    },
  },

  // Atendimentos
  atendimentos: {
    getAll: async (filters?: {
      search?: string
      status?: string
      tipo?: string
      sortBy?: string
      sortOrder?: "asc" | "desc"
    }): Promise<ApiResponse<Atendimento>> => {
      const params = new URLSearchParams()
      if (filters?.search) params.append('search', filters.search)
      if (filters?.status) params.append('status', filters.status)
      if (filters?.tipo) params.append('tipo', filters.tipo)
      if (filters?.sortBy) params.append('sortBy', filters.sortBy)
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder)
      
      const query = params.toString()
      return apiClient.get<ApiResponse<Atendimento>>(`/atendimentos${query ? `?${query}` : ''}`)
    },

    create: async (data: Omit<Atendimento, "id">): Promise<Atendimento> => {
      return apiClient.post<Atendimento>('/atendimentos', data)
    },

    update: async (id: number, data: Partial<Atendimento>): Promise<Atendimento> => {
      return apiClient.put<Atendimento>(`/atendimentos/${id}`, data)
    },

    delete: async (id: number): Promise<{ success: boolean }> => {
      return apiClient.delete<{ success: boolean }>(`/atendimentos/${id}`)
    },
  },

  // Pauta de Vendas
  pautaVendas: {
    getAll: async (filters?: { search?: string; status?: string; sortBy?: string; sortOrder?: "asc" | "desc" }): Promise<ApiResponse<PautaVenda>> => {
      const params = new URLSearchParams()
      if (filters?.search) params.append('search', filters.search)
      if (filters?.status) params.append('status', filters.status)
      if (filters?.sortBy) params.append('sortBy', filters.sortBy)
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder)
      
      const query = params.toString()
      return apiClient.get<ApiResponse<PautaVenda>>(`/pauta-vendas${query ? `?${query}` : ''}`)
    },

    create: async (data: Omit<PautaVenda, "id">): Promise<PautaVenda> => {
      return apiClient.post<PautaVenda>('/pauta-vendas', data)
    },

    update: async (id: number, data: Partial<PautaVenda>): Promise<PautaVenda> => {
      return apiClient.put<PautaVenda>(`/pauta-vendas/${id}`, data)
    },

    delete: async (id: number): Promise<{ success: boolean }> => {
      return apiClient.delete<{ success: boolean }>(`/pauta-vendas/${id}`)
    },
  },
}