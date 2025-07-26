// Mock API functions - replace with real backend calls later

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

// Mock data
const mockNegocios: Negocio[] = [
  { id: 1, cliente: "João Silva", valor: "R$ 15.000", status: "Em Andamento", data: "15/01/2024" },
  { id: 2, cliente: "Maria Santos", valor: "R$ 8.500", status: "Proposta", data: "12/01/2024" },
  { id: 3, cliente: "Pedro Costa", valor: "R$ 22.000", status: "Fechado", data: "10/01/2024" },
  { id: 4, cliente: "Ana Oliveira", valor: "R$ 12.300", status: "Em Andamento", data: "08/01/2024" },
]

const mockClientes: Cliente[] = [
  { id: 1, nome: "João Silva", email: "joao@email.com", telefone: "(11) 99999-9999", cidade: "São Paulo" },
  { id: 2, nome: "Maria Santos", email: "maria@email.com", telefone: "(11) 88888-8888", cidade: "Rio de Janeiro" },
  { id: 3, nome: "Pedro Costa", email: "pedro@email.com", telefone: "(11) 77777-7777", cidade: "Belo Horizonte" },
  { id: 4, nome: "Ana Oliveira", email: "ana@email.com", telefone: "(11) 66666-6666", cidade: "Salvador" },
]

const mockAtendimentos: Atendimento[] = [
  { id: 1, cliente: "João Silva", tipo: "Suporte", status: "Em Andamento", data: "15/01/2024", hora: "14:30" },
  { id: 2, cliente: "Maria Santos", tipo: "Vendas", status: "Concluído", data: "15/01/2024", hora: "10:15" },
  { id: 3, cliente: "Pedro Costa", tipo: "Suporte", status: "Pendente", data: "14/01/2024", hora: "16:45" },
  { id: 4, cliente: "Ana Oliveira", tipo: "Consultoria", status: "Em Andamento", data: "14/01/2024", hora: "09:00" },
]

const mockProdutos: Produto[] = [
  { id: 1, nome: "Produto A", preco: "R$ 299,90", categoria: "Eletrônicos", estoque: 15 },
  { id: 2, nome: "Produto B", preco: "R$ 199,90", categoria: "Casa", estoque: 8 },
  { id: 3, nome: "Produto C", preco: "R$ 399,90", categoria: "Esportes", estoque: 22 },
  { id: 4, nome: "Produto D", preco: "R$ 149,90", categoria: "Livros", estoque: 5 },
  { id: 5, nome: "Produto E", preco: "R$ 599,90", categoria: "Eletrônicos", estoque: 12 },
  { id: 6, nome: "Produto F", preco: "R$ 89,90", categoria: "Casa", estoque: 30 },
]

const mockPautaVendas: PautaVenda[] = [
  {
    id: 1,
    titulo: "Proposta Sistema ERP",
    cliente: "João Silva",
    valor: "R$ 50.000",
    data: "20/01/2024",
    status: "Ativa",
  },
  {
    id: 2,
    titulo: "Consultoria TI",
    cliente: "Maria Santos",
    valor: "R$ 25.000",
    data: "18/01/2024",
    status: "Concluída",
  },
  {
    id: 3,
    titulo: "Desenvolvimento App",
    cliente: "Pedro Costa",
    valor: "R$ 80.000",
    data: "15/01/2024",
    status: "Ativa",
  },
]

// Utility function to simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Generic CRUD operations
export const api = {
  // Negócios
  negocios: {
    getAll: async (filters?: { search?: string; status?: string; sortBy?: string; sortOrder?: "asc" | "desc" }) => {
      await delay(300)
      let filtered = [...mockNegocios]

      if (filters?.search) {
        filtered = filtered.filter(
          (item) =>
            item.cliente.toLowerCase().includes(filters.search!.toLowerCase()) ||
            item.valor.toLowerCase().includes(filters.search!.toLowerCase()),
        )
      }

      if (filters?.status && filters.status !== "Todos") {
        filtered = filtered.filter((item) => item.status === filters.status)
      }

      if (filters?.sortBy) {
        filtered.sort((a, b) => {
          const aVal = a[filters.sortBy as keyof Negocio]
          const bVal = b[filters.sortBy as keyof Negocio]
          const order = filters.sortOrder === "desc" ? -1 : 1
          return aVal > bVal ? order : -order
        })
      }

      return { data: filtered, total: filtered.length }
    },

    create: async (data: Omit<Negocio, "id">) => {
      await delay(300)
      const newItem = { ...data, id: Math.max(...mockNegocios.map((n) => n.id)) + 1 }
      mockNegocios.push(newItem)
      return newItem
    },

    update: async (id: number, data: Partial<Negocio>) => {
      await delay(300)
      const index = mockNegocios.findIndex((n) => n.id === id)
      if (index !== -1) {
        mockNegocios[index] = { ...mockNegocios[index], ...data }
        return mockNegocios[index]
      }
      throw new Error("Negócio não encontrado")
    },

    delete: async (id: number) => {
      await delay(300)
      const index = mockNegocios.findIndex((n) => n.id === id)
      if (index !== -1) {
        mockNegocios.splice(index, 1)
        return true
      }
      throw new Error("Negócio não encontrado")
    },
  },

  // Clientes
  clientes: {
    getAll: async (filters?: { search?: string; sortBy?: string; sortOrder?: "asc" | "desc" }) => {
      await delay(300)
      let filtered = [...mockClientes]

      if (filters?.search) {
        filtered = filtered.filter(
          (item) =>
            item.nome.toLowerCase().includes(filters.search!.toLowerCase()) ||
            item.email.toLowerCase().includes(filters.search!.toLowerCase()) ||
            item.cidade.toLowerCase().includes(filters.search!.toLowerCase()),
        )
      }

      if (filters?.sortBy) {
        filtered.sort((a, b) => {
          const aVal = a[filters.sortBy as keyof Cliente]
          const bVal = b[filters.sortBy as keyof Cliente]
          const order = filters.sortOrder === "desc" ? -1 : 1
          return aVal > bVal ? order : -order
        })
      }

      return { data: filtered, total: filtered.length }
    },

    create: async (data: Omit<Cliente, "id">) => {
      await delay(300)
      const newItem = { ...data, id: Math.max(...mockClientes.map((c) => c.id)) + 1 }
      mockClientes.push(newItem)
      return newItem
    },

    update: async (id: number, data: Partial<Cliente>) => {
      await delay(300)
      const index = mockClientes.findIndex((c) => c.id === id)
      if (index !== -1) {
        mockClientes[index] = { ...mockClientes[index], ...data }
        return mockClientes[index]
      }
      throw new Error("Cliente não encontrado")
    },

    delete: async (id: number) => {
      await delay(300)
      const index = mockClientes.findIndex((c) => c.id === id)
      if (index !== -1) {
        mockClientes.splice(index, 1)
        return true
      }
      throw new Error("Cliente não encontrado")
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
    }) => {
      await delay(300)
      let filtered = [...mockAtendimentos]

      if (filters?.search) {
        filtered = filtered.filter(
          (item) =>
            item.cliente.toLowerCase().includes(filters.search!.toLowerCase()) ||
            item.tipo.toLowerCase().includes(filters.search!.toLowerCase()),
        )
      }

      if (filters?.status && filters.status !== "Todos") {
        filtered = filtered.filter((item) => item.status === filters.status)
      }

      if (filters?.tipo && filters.tipo !== "Todos") {
        filtered = filtered.filter((item) => item.tipo === filters.tipo)
      }

      if (filters?.sortBy) {
        filtered.sort((a, b) => {
          const aVal = a[filters.sortBy as keyof Atendimento]
          const bVal = b[filters.sortBy as keyof Atendimento]
          const order = filters.sortOrder === "desc" ? -1 : 1
          return aVal > bVal ? order : -order
        })
      }

      return { data: filtered, total: filtered.length }
    },

    create: async (data: Omit<Atendimento, "id">) => {
      await delay(300)
      const newItem = { ...data, id: Math.max(...mockAtendimentos.map((a) => a.id)) + 1 }
      mockAtendimentos.push(newItem)
      return newItem
    },

    update: async (id: number, data: Partial<Atendimento>) => {
      await delay(300)
      const index = mockAtendimentos.findIndex((a) => a.id === id)
      if (index !== -1) {
        mockAtendimentos[index] = { ...mockAtendimentos[index], ...data }
        return mockAtendimentos[index]
      }
      throw new Error("Atendimento não encontrado")
    },

    delete: async (id: number) => {
      await delay(300)
      const index = mockAtendimentos.findIndex((a) => a.id === id)
      if (index !== -1) {
        mockAtendimentos.splice(index, 1)
        return true
      }
      throw new Error("Atendimento não encontrado")
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
    }) => {
      await delay(300)
      let filtered = [...mockProdutos]

      if (filters?.search) {
        filtered = filtered.filter(
          (item) =>
            item.nome.toLowerCase().includes(filters.search!.toLowerCase()) ||
            item.categoria.toLowerCase().includes(filters.search!.toLowerCase()),
        )
      }

      if (filters?.categoria && filters.categoria !== "Todos") {
        filtered = filtered.filter((item) => item.categoria === filters.categoria)
      }

      if (filters?.estoque) {
        switch (filters.estoque) {
          case "Em Estoque":
            filtered = filtered.filter((item) => item.estoque > 10)
            break
          case "Baixo Estoque":
            filtered = filtered.filter((item) => item.estoque > 0 && item.estoque <= 10)
            break
          case "Sem Estoque":
            filtered = filtered.filter((item) => item.estoque === 0)
            break
        }
      }

      if (filters?.sortBy) {
        filtered.sort((a, b) => {
          const aVal = a[filters.sortBy as keyof Produto]
          const bVal = b[filters.sortBy as keyof Produto]
          const order = filters.sortOrder === "desc" ? -1 : 1
          return aVal > bVal ? order : -order
        })
      }

      return { data: filtered, total: filtered.length }
    },

    create: async (data: Omit<Produto, "id">) => {
      await delay(300)
      const newItem = { ...data, id: Math.max(...mockProdutos.map((p) => p.id)) + 1 }
      mockProdutos.push(newItem)
      return newItem
    },

    update: async (id: number, data: Partial<Produto>) => {
      await delay(300)
      const index = mockProdutos.findIndex((p) => p.id === id)
      if (index !== -1) {
        mockProdutos[index] = { ...mockProdutos[index], ...data }
        return mockProdutos[index]
      }
      throw new Error("Produto não encontrado")
    },

    delete: async (id: number) => {
      await delay(300)
      const index = mockProdutos.findIndex((p) => p.id === id)
      if (index !== -1) {
        mockProdutos.splice(index, 1)
        return true
      }
      throw new Error("Produto não encontrado")
    },
  },

  // Pauta de Vendas
  pautaVendas: {
    getAll: async (filters?: { search?: string; status?: string; sortBy?: string; sortOrder?: "asc" | "desc" }) => {
      await delay(300)
      let filtered = [...mockPautaVendas]

      if (filters?.search) {
        filtered = filtered.filter(
          (item) =>
            item.titulo.toLowerCase().includes(filters.search!.toLowerCase()) ||
            item.cliente.toLowerCase().includes(filters.search!.toLowerCase()),
        )
      }

      if (filters?.status && filters.status !== "Todos") {
        filtered = filtered.filter((item) => item.status === filters.status)
      }

      if (filters?.sortBy) {
        filtered.sort((a, b) => {
          const aVal = a[filters.sortBy as keyof PautaVenda]
          const bVal = b[filters.sortBy as keyof PautaVenda]
          const order = filters.sortOrder === "desc" ? -1 : 1
          return aVal > bVal ? order : -order
        })
      }

      return { data: filtered, total: filtered.length }
    },

    create: async (data: Omit<PautaVenda, "id">) => {
      await delay(300)
      const newItem = { ...data, id: Math.max(...mockPautaVendas.map((p) => p.id)) + 1 }
      mockPautaVendas.push(newItem)
      return newItem
    },

    update: async (id: number, data: Partial<PautaVenda>) => {
      await delay(300)
      const index = mockPautaVendas.findIndex((p) => p.id === id)
      if (index !== -1) {
        mockPautaVendas[index] = { ...mockPautaVendas[index], ...data }
        return mockPautaVendas[index]
      }
      throw new Error("Pauta não encontrada")
    },

    delete: async (id: number) => {
      await delay(300)
      const index = mockPautaVendas.findIndex((p) => p.id === id)
      if (index !== -1) {
        mockPautaVendas.splice(index, 1)
        return true
      }
      throw new Error("Pauta não encontrada")
    },
  },
}
