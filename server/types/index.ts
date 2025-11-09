export interface User {
  id: number
  name: string
  email: string
  role: string
  password_hash?: string
  created_at?: Date
  updated_at?: Date
}

export interface Deal {
  id: number
  client: string
  value: string
  status: 'Em Andamento' | 'Proposta' | 'Fechado'
  date: string
  description: string
  created_at?: Date
  updated_at?: Date
}

export interface Client {
  id: number
  name: string
  email: string
  phone: string
  city: string
  address: string
  company: string
  origin: string
  created_at?: Date
  updated_at?: Date
}

export interface Product {
  id: number
  name: string
  price: string | null
  category: string
  description: string
  has_thumbnail?: boolean
  created_at?: Date
  updated_at?: Date
}

export interface ProductImage {
  id: number
  product_id: number
  image_url: string
  display_order: number
  is_thumbnail: boolean
  alt_text: string
  created_at?: Date
  updated_at?: Date
}

export interface Appointment {
  id: number
  client: string
  type: 'chat' | 'call' | 'in_person' | 'visit'
  scheduled_datetime: string
  description?: string | null
  answered: boolean
  created_at?: Date
  updated_at?: Date
}

export interface SalesAgenda {
  id: number
  title: string
  product_name: string
  product_id: number | null
  date: string
  status: 'Ativa' | 'Concluída' | 'Cancelada'
  created_at?: Date
  updated_at?: Date
}

export interface DashboardStats {
  totalDeals: number
  totalClients: number
  totalProducts: number
  totalAppointments: number
  totalSalesAgenda: number
}

export interface AppointmentAnalytics {
  date: string
  answered: number
  not_answered: number
}

export interface AuthResult {
  success: boolean
  token?: string
  user?: Omit<User, 'password_hash'>
  error?: string
}

export interface ApiResponse<T> {
  data?: T
  total?: number
  success?: boolean
  error?: string
  message?: string
}

export interface QueryFilters {
  search?: string
  status?: string
  type?: string
  category?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}
