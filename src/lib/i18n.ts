import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Translation resources
const resources = {
  'pt-BR': {
    translation: {
      // Common
      welcome: 'Bem-vindo',
      user: 'Usuário',
      logout: 'Sair',
      login: 'Entrar',
      save: 'Salvar',
      cancel: 'Cancelar',
      delete: 'Excluir',
      edit: 'Editar',
      create: 'Criar',
      search: 'Pesquisar',
      filter: 'Filtrar',
      actions: 'Ações',
      
      // Navigation
      dashboard: 'Dashboard',
      deals: 'Negócios',
      clients: 'Clientes',
      services: 'Atendimentos',
      products: 'Produtos',
      salesAgenda: 'Pauta de Vendas',
      settings: 'Configurações',
      support: 'Suporte',
      
      // Dashboard
      managementSystem: 'Sistema de Gestão',
      mainMenu: 'Menu Principal',
      performanceIndicators: 'Painel de Indicadores',
      conversionRate: 'Taxa de Conversão',
      averageTicket: 'Ticket Médio',
      monthlyGoal: 'Meta Mensal',
      satisfaction: 'Satisfação',
      
      // Modules
      dealsModule: 'Gerencie seus negócios e oportunidades',
      clientsModule: 'Cadastro e gestão de clientes',
      servicesModule: 'Controle de atendimentos e suporte',
      productsModule: 'Catálogo e estoque de produtos',
      salesAgendaModule: 'Planejamento e acompanhamento de vendas',
      
      // Charts
      salesVsProposals: 'Vendas vs Propostas',
      dealStatus: 'Status dos Negócios',
      sales: 'Vendas',
      proposals: 'Propostas',
      closed: 'Fechados',
      inProgress: 'Em Andamento',
      
      // Status
      active: 'Ativa',
      completed: 'Concluída',
      cancelled: 'Cancelada',
      
      // Service types
      supportType: 'Suporte',
      salesType: 'Vendas',
      consultingType: 'Consultoria',
      
      // Messages
      successMessages: {
        dealCreated: 'Negócio criado com sucesso',
        clientCreated: 'Cliente criado com sucesso',
        productCreated: 'Produto criado com sucesso',
        serviceCreated: 'Atendimento criado com sucesso',
        logoutSuccess: 'Logout realizado com sucesso',
        loginSuccess: 'Login realizado com sucesso',
      },
      errorMessages: {
        dealCreationError: 'Erro ao criar negócio',
        clientCreationError: 'Erro ao criar cliente',
        productCreationError: 'Erro ao criar produto',
        serviceCreationError: 'Erro ao criar atendimento',
        logoutError: 'Erro ao fazer logout',
      },
      
      // Forms
      deal: 'Negócio',
      client: 'Cliente',
      product: 'Produto',
      service: 'Atendimento',
      
      // Languages
      portuguese: 'Português',
      english: 'Inglês',
      spanish: 'Espanhol',
      
      // Login page
      email: 'Email',
      password: 'Senha',
      pleaseFillAllFields: 'Por favor, preencha todos os campos',
      emailOrPasswordIncorrect: 'Email ou senha incorretos',
      loginError: 'Erro ao fazer login',
      welcome: 'Bem-vindo',
      businessManagement: 'Sistema de Gestão Empresarial',
      accessYourAccount: 'Acesse sua conta para continuar',
    }
  },
  'en-US': {
    translation: {
      // Common
      welcome: 'Welcome',
      user: 'User',
      logout: 'Logout',
      login: 'Login',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      search: 'Search',
      filter: 'Filter',
      actions: 'Actions',
      
      // Navigation
      dashboard: 'Dashboard',
      deals: 'Deals',
      clients: 'Clients',
      services: 'Services',
      products: 'Products',
      salesAgenda: 'Sales Agenda',
      settings: 'Settings',
      support: 'Support',
      
      // Dashboard
      managementSystem: 'Management System',
      mainMenu: 'Main Menu',
      performanceIndicators: 'Performance Indicators',
      conversionRate: 'Conversion Rate',
      averageTicket: 'Average Ticket',
      monthlyGoal: 'Monthly Goal',
      satisfaction: 'Satisfaction',
      
      // Modules
      dealsModule: 'Manage your deals and opportunities',
      clientsModule: 'Client registration and management',
      servicesModule: 'Service and support control',
      productsModule: 'Product catalog and inventory',
      salesAgendaModule: 'Sales planning and tracking',
      
      // Charts
      salesVsProposals: 'Sales vs Proposals',
      dealStatus: 'Deal Status',
      sales: 'Sales',
      proposals: 'Proposals',
      closed: 'Closed',
      inProgress: 'In Progress',
      
      // Status
      active: 'Active',
      completed: 'Completed',
      cancelled: 'Cancelled',
      
      // Service types
      supportType: 'Support',
      salesType: 'Sales',
      consultingType: 'Consulting',
      
      // Messages
      successMessages: {
        dealCreated: 'Deal created successfully',
        clientCreated: 'Client created successfully',
        productCreated: 'Product created successfully',
        serviceCreated: 'Service created successfully',
        logoutSuccess: 'Logout successful',
        loginSuccess: 'Login successful',
      },
      errorMessages: {
        dealCreationError: 'Error creating deal',
        clientCreationError: 'Error creating client',
        productCreationError: 'Error creating product',
        serviceCreationError: 'Error creating service',
        logoutError: 'Error during logout',
      },
      
      // Forms
      deal: 'Deal',
      client: 'Client',
      product: 'Product',
      service: 'Service',
      
      // Languages
      portuguese: 'Portuguese',
      english: 'English',
      spanish: 'Spanish',
      
      // Login page
      email: 'Email',
      password: 'Password',
      pleaseFillAllFields: 'Please fill all fields',
      emailOrPasswordIncorrect: 'Email or password incorrect',
      loginError: 'Login error',
      welcome: 'Welcome',
      businessManagement: 'Business Management System',
      accessYourAccount: 'Access your account to continue',
    }
  },
  'es-ES': {
    translation: {
      // Common
      welcome: 'Bienvenido',
      user: 'Usuario',
      logout: 'Cerrar sesión',
      login: 'Iniciar sesión',
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      create: 'Crear',
      search: 'Buscar',
      filter: 'Filtrar',
      actions: 'Acciones',
      
      // Navigation
      dashboard: 'Panel',
      deals: 'Negocios',
      clients: 'Clientes',
      services: 'Servicios',
      products: 'Productos',
      salesAgenda: 'Agenda de Ventas',
      settings: 'Configuración',
      support: 'Soporte',
      
      // Dashboard
      managementSystem: 'Sistema de Gestión',
      mainMenu: 'Menú Principal',
      performanceIndicators: 'Indicadores de Rendimiento',
      conversionRate: 'Tasa de Conversión',
      averageTicket: 'Ticket Promedio',
      monthlyGoal: 'Meta Mensual',
      satisfaction: 'Satisfacción',
      
      // Modules
      dealsModule: 'Gestiona tus negocios y oportunidades',
      clientsModule: 'Registro y gestión de clientes',
      servicesModule: 'Control de servicios y soporte',
      productsModule: 'Catálogo e inventario de productos',
      salesAgendaModule: 'Planificación y seguimiento de ventas',
      
      // Charts
      salesVsProposals: 'Ventas vs Propuestas',
      dealStatus: 'Estado de Negocios',
      sales: 'Ventas',
      proposals: 'Propuestas',
      closed: 'Cerrados',
      inProgress: 'En Progreso',
      
      // Status
      active: 'Activa',
      completed: 'Completada',
      cancelled: 'Cancelada',
      
      // Service types
      supportType: 'Soporte',
      salesType: 'Ventas',
      consultingType: 'Consultoría',
      
      // Messages
      successMessages: {
        dealCreated: 'Negocio creado exitosamente',
        clientCreated: 'Cliente creado exitosamente',
        productCreated: 'Producto creado exitosamente',
        serviceCreated: 'Servicio creado exitosamente',
        logoutSuccess: 'Cierre de sesión exitoso',
        loginSuccess: 'Inicio de sesión exitoso',
      },
      errorMessages: {
        dealCreationError: 'Error al crear negocio',
        clientCreationError: 'Error al crear cliente',
        productCreationError: 'Error al crear producto',
        serviceCreationError: 'Error al crear servicio',
        logoutError: 'Error al cerrar sesión',
      },
      
      // Forms
      deal: 'Negocio',
      client: 'Cliente',
      product: 'Producto',
      service: 'Servicio',
      
      // Languages
      portuguese: 'Portugués',
      english: 'Inglés',
      spanish: 'Español',
      
      // Login page
      email: 'Email',
      password: 'Contraseña',
      pleaseFillAllFields: 'Por favor, complete todos los campos',
      emailOrPasswordIncorrect: 'Email o contraseña incorrectos',
      loginError: 'Error al iniciar sesión',
      welcome: 'Bienvenido',
      businessManagement: 'Sistema de Gestión Empresarial',
      accessYourAccount: 'Accede a tu cuenta para continuar',
    }
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'pt-BR',
    debug: false,
    
    interpolation: {
      escapeValue: false, // React already escapes by default
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  })

export default i18n