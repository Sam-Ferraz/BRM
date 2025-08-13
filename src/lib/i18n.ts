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
      
      // Entity Pages - Common
      backButton: 'Voltar',
      loading: 'Carregando',
      noDataFound: 'Nenhum dado encontrado',
      searchPlaceholder: 'Buscar...',
      name: 'Nome',
      description: 'Descrição',
      date: 'Data',
      value: 'Valor',
      status: 'Status',
      confirmDelete: 'Tem certeza que deseja excluir este item?',
      
      // Deals Page
      dealsTitle: 'Negócios',
      dealsManagement: 'Gestão de Negócios',
      newDeal: 'Novo Negócio',
      searchDeals: 'Buscar negócios...',
      client: 'Cliente',
      allStatuses: 'Todos',
      proposal: 'Proposta',
      loadingDeals: 'Carregando negócios...',
      noDealsFound: 'Nenhum negócio encontrado',
      confirmDeleteDeal: 'Tem certeza que deseja excluir este negócio?',
      dealCreatedSuccess: 'Negócio criado com sucesso',
      dealUpdatedSuccess: 'Negócio atualizado com sucesso',
      dealDeletedSuccess: 'Negócio excluído com sucesso',
      dealCreateError: 'Falha ao criar negócio',
      dealUpdateError: 'Falha ao atualizar negócio',
      dealDeleteError: 'Falha ao excluir negócio',
      dealLoadError: 'Falha ao carregar negócios',
      
      // Clients Page
      clientsTitle: 'Clientes',
      clientsManagement: 'Gestão de Clientes',
      newClient: 'Novo Cliente',
      searchClients: 'Buscar clientes...',
      phone: 'Telefone',
      city: 'Cidade',
      company: 'Empresa',
      loadingClients: 'Carregando clientes...',
      noClientsFound: 'Nenhum cliente encontrado',
      confirmDeleteClient: 'Tem certeza que deseja excluir este cliente?',
      clientCreatedSuccess: 'Cliente criado com sucesso',
      clientUpdatedSuccess: 'Cliente atualizado com sucesso',
      clientDeletedSuccess: 'Cliente excluído com sucesso',
      clientCreateError: 'Falha ao criar cliente',
      clientUpdateError: 'Falha ao atualizar cliente',
      clientDeleteError: 'Falha ao excluir cliente',
      clientLoadError: 'Falha ao carregar clientes',
      
      // Services Page
      servicesTitle: 'Atendimentos',
      servicesManagement: 'Gestão de Atendimentos',
      newService: 'Novo Atendimento',
      searchServices: 'Buscar atendimentos...',
      type: 'Tipo',
      time: 'Hora',
      allTypes: 'Todos',
      loadingServices: 'Carregando atendimentos...',
      noServicesFound: 'Nenhum atendimento encontrado',
      confirmDeleteService: 'Tem certeza que deseja excluir este atendimento?',
      serviceCreatedSuccess: 'Atendimento criado com sucesso',
      serviceUpdatedSuccess: 'Atendimento atualizado com sucesso',
      serviceDeletedSuccess: 'Atendimento excluído com sucesso',
      serviceCreateError: 'Falha ao criar atendimento',
      serviceUpdateError: 'Falha ao atualizar atendimento',
      serviceDeleteError: 'Falha ao excluir atendimento',
      serviceLoadError: 'Falha ao carregar atendimentos',
      
      // Products Page
      productsTitle: 'Produtos',
      productsManagement: 'Gestão de Produtos',
      newProduct: 'Novo Produto',
      searchProducts: 'Buscar produtos...',
      price: 'Preço',
      category: 'Categoria',
      stock: 'Estoque',
      allCategories: 'Todos',
      lowStock: 'Estoque Baixo',
      inStock: 'Em Estoque',
      outOfStock: 'Sem Estoque',
      loadingProducts: 'Carregando produtos...',
      noProductsFound: 'Nenhum produto encontrado',
      confirmDeleteProduct: 'Tem certeza que deseja excluir este produto?',
      productCreatedSuccess: 'Produto criado com sucesso',
      productUpdatedSuccess: 'Produto atualizado com sucesso',
      productDeletedSuccess: 'Produto excluído com sucesso',
      productCreateError: 'Falha ao criar produto',
      productUpdateError: 'Falha ao atualizar produto',
      productDeleteError: 'Falha ao excluir produto',
      productLoadError: 'Falha ao carregar produtos',
      
      // Sales Agenda Page
      salesAgendaTitle: 'Pauta de Vendas',
      salesAgendaManagement: 'Gestão da Pauta de Vendas',
      newSalesAgenda: 'Nova Pauta de Venda',
      searchSalesAgenda: 'Buscar pauta de vendas...',
      title: 'Título',
      loadingSalesAgenda: 'Carregando pauta de vendas...',
      noSalesAgendaFound: 'Nenhuma pauta de venda encontrada',
      confirmDeleteSalesAgenda: 'Tem certeza que deseja excluir esta pauta de venda?',
      salesAgendaCreatedSuccess: 'Pauta de venda criada com sucesso',
      salesAgendaUpdatedSuccess: 'Pauta de venda atualizada com sucesso',
      salesAgendaDeletedSuccess: 'Pauta de venda excluída com sucesso',
      salesAgendaCreateError: 'Falha ao criar pauta de venda',
      salesAgendaUpdateError: 'Falha ao atualizar pauta de venda',
      salesAgendaDeleteError: 'Falha ao excluir pauta de venda',
      salesAgendaLoadError: 'Falha ao carregar pauta de vendas',
      
      // Common actions
      success: 'Sucesso',
      error: 'Erro',
      
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
      
      // Entity Pages - Common
      backButton: 'Back',
      loading: 'Loading',
      noDataFound: 'No data found',
      searchPlaceholder: 'Search...',
      name: 'Name',
      description: 'Description',
      date: 'Date',
      value: 'Value',
      status: 'Status',
      confirmDelete: 'Are you sure you want to delete this item?',
      
      // Deals Page
      dealsTitle: 'Deals',
      dealsManagement: 'Deals Management',
      newDeal: 'New Deal',
      searchDeals: 'Search deals...',
      client: 'Client',
      allStatuses: 'All',
      proposal: 'Proposal',
      loadingDeals: 'Loading deals...',
      noDealsFound: 'No deals found',
      confirmDeleteDeal: 'Are you sure you want to delete this deal?',
      dealCreatedSuccess: 'Deal created successfully',
      dealUpdatedSuccess: 'Deal updated successfully',
      dealDeletedSuccess: 'Deal deleted successfully',
      dealCreateError: 'Failed to create deal',
      dealUpdateError: 'Failed to update deal',
      dealDeleteError: 'Failed to delete deal',
      dealLoadError: 'Failed to load deals',
      
      // Clients Page
      clientsTitle: 'Clients',
      clientsManagement: 'Client Management',
      newClient: 'New Client',
      searchClients: 'Search clients...',
      phone: 'Phone',
      city: 'City',
      company: 'Company',
      loadingClients: 'Loading clients...',
      noClientsFound: 'No clients found',
      confirmDeleteClient: 'Are you sure you want to delete this client?',
      clientCreatedSuccess: 'Client created successfully',
      clientUpdatedSuccess: 'Client updated successfully',
      clientDeletedSuccess: 'Client deleted successfully',
      clientCreateError: 'Failed to create client',
      clientUpdateError: 'Failed to update client',
      clientDeleteError: 'Failed to delete client',
      clientLoadError: 'Failed to load clients',
      
      // Services Page
      servicesTitle: 'Services',
      servicesManagement: 'Service Management',
      newService: 'New Service',
      searchServices: 'Search services...',
      type: 'Type',
      time: 'Time',
      allTypes: 'All',
      loadingServices: 'Loading services...',
      noServicesFound: 'No services found',
      confirmDeleteService: 'Are you sure you want to delete this service?',
      serviceCreatedSuccess: 'Service created successfully',
      serviceUpdatedSuccess: 'Service updated successfully',
      serviceDeletedSuccess: 'Service deleted successfully',
      serviceCreateError: 'Failed to create service',
      serviceUpdateError: 'Failed to update service',
      serviceDeleteError: 'Failed to delete service',
      serviceLoadError: 'Failed to load services',
      
      // Products Page
      productsTitle: 'Products',
      productsManagement: 'Product Management',
      newProduct: 'New Product',
      searchProducts: 'Search products...',
      price: 'Price',
      category: 'Category',
      stock: 'Stock',
      allCategories: 'All',
      lowStock: 'Low Stock',
      inStock: 'In Stock',
      outOfStock: 'Out of Stock',
      loadingProducts: 'Loading products...',
      noProductsFound: 'No products found',
      confirmDeleteProduct: 'Are you sure you want to delete this product?',
      productCreatedSuccess: 'Product created successfully',
      productUpdatedSuccess: 'Product updated successfully',
      productDeletedSuccess: 'Product deleted successfully',
      productCreateError: 'Failed to create product',
      productUpdateError: 'Failed to update product',
      productDeleteError: 'Failed to delete product',
      productLoadError: 'Failed to load products',
      
      // Sales Agenda Page
      salesAgendaTitle: 'Sales Agenda',
      salesAgendaManagement: 'Sales Agenda Management',
      newSalesAgenda: 'New Sales Agenda',
      searchSalesAgenda: 'Search sales agenda...',
      title: 'Title',
      loadingSalesAgenda: 'Loading sales agenda...',
      noSalesAgendaFound: 'No sales agenda found',
      confirmDeleteSalesAgenda: 'Are you sure you want to delete this sales agenda?',
      salesAgendaCreatedSuccess: 'Sales agenda created successfully',
      salesAgendaUpdatedSuccess: 'Sales agenda updated successfully',
      salesAgendaDeletedSuccess: 'Sales agenda deleted successfully',
      salesAgendaCreateError: 'Failed to create sales agenda',
      salesAgendaUpdateError: 'Failed to update sales agenda',
      salesAgendaDeleteError: 'Failed to delete sales agenda',
      salesAgendaLoadError: 'Failed to load sales agenda',
      
      // Common actions
      success: 'Success',
      error: 'Error',
      
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
      
      // Entity Pages - Common
      backButton: 'Volver',
      loading: 'Cargando',
      noDataFound: 'No se encontraron datos',
      searchPlaceholder: 'Buscar...',
      name: 'Nombre',
      description: 'Descripción',
      date: 'Fecha',
      value: 'Valor',
      status: 'Estado',
      confirmDelete: '¿Está seguro de que desea eliminar este elemento?',
      
      // Deals Page
      dealsTitle: 'Negocios',
      dealsManagement: 'Gestión de Negocios',
      newDeal: 'Nuevo Negocio',
      searchDeals: 'Buscar negocios...',
      client: 'Cliente',
      allStatuses: 'Todos',
      proposal: 'Propuesta',
      loadingDeals: 'Cargando negocios...',
      noDealsFound: 'No se encontraron negocios',
      confirmDeleteDeal: '¿Está seguro de que desea eliminar este negocio?',
      dealCreatedSuccess: 'Negocio creado exitosamente',
      dealUpdatedSuccess: 'Negocio actualizado exitosamente',
      dealDeletedSuccess: 'Negocio eliminado exitosamente',
      dealCreateError: 'Error al crear negocio',
      dealUpdateError: 'Error al actualizar negocio',
      dealDeleteError: 'Error al eliminar negocio',
      dealLoadError: 'Error al cargar negocios',
      
      // Clients Page
      clientsTitle: 'Clientes',
      clientsManagement: 'Gestión de Clientes',
      newClient: 'Nuevo Cliente',
      searchClients: 'Buscar clientes...',
      phone: 'Teléfono',
      city: 'Ciudad',
      company: 'Empresa',
      loadingClients: 'Cargando clientes...',
      noClientsFound: 'No se encontraron clientes',
      confirmDeleteClient: '¿Está seguro de que desea eliminar este cliente?',
      clientCreatedSuccess: 'Cliente creado exitosamente',
      clientUpdatedSuccess: 'Cliente actualizado exitosamente',
      clientDeletedSuccess: 'Cliente eliminado exitosamente',
      clientCreateError: 'Error al crear cliente',
      clientUpdateError: 'Error al actualizar cliente',
      clientDeleteError: 'Error al eliminar cliente',
      clientLoadError: 'Error al cargar clientes',
      
      // Services Page
      servicesTitle: 'Servicios',
      servicesManagement: 'Gestión de Servicios',
      newService: 'Nuevo Servicio',
      searchServices: 'Buscar servicios...',
      type: 'Tipo',
      time: 'Hora',
      allTypes: 'Todos',
      loadingServices: 'Cargando servicios...',
      noServicesFound: 'No se encontraron servicios',
      confirmDeleteService: '¿Está seguro de que desea eliminar este servicio?',
      serviceCreatedSuccess: 'Servicio creado exitosamente',
      serviceUpdatedSuccess: 'Servicio actualizado exitosamente',
      serviceDeletedSuccess: 'Servicio eliminado exitosamente',
      serviceCreateError: 'Error al crear servicio',
      serviceUpdateError: 'Error al actualizar servicio',
      serviceDeleteError: 'Error al eliminar servicio',
      serviceLoadError: 'Error al cargar servicios',
      
      // Products Page
      productsTitle: 'Productos',
      productsManagement: 'Gestión de Productos',
      newProduct: 'Nuevo Producto',
      searchProducts: 'Buscar productos...',
      price: 'Precio',
      category: 'Categoría',
      stock: 'Stock',
      allCategories: 'Todos',
      lowStock: 'Stock Bajo',
      inStock: 'En Stock',
      outOfStock: 'Sin Stock',
      loadingProducts: 'Cargando productos...',
      noProductsFound: 'No se encontraron productos',
      confirmDeleteProduct: '¿Está seguro de que desea eliminar este producto?',
      productCreatedSuccess: 'Producto creado exitosamente',
      productUpdatedSuccess: 'Producto actualizado exitosamente',
      productDeletedSuccess: 'Producto eliminado exitosamente',
      productCreateError: 'Error al crear producto',
      productUpdateError: 'Error al actualizar producto',
      productDeleteError: 'Error al eliminar producto',
      productLoadError: 'Error al cargar productos',
      
      // Sales Agenda Page
      salesAgendaTitle: 'Agenda de Ventas',
      salesAgendaManagement: 'Gestión de Agenda de Ventas',
      newSalesAgenda: 'Nueva Agenda de Ventas',
      searchSalesAgenda: 'Buscar agenda de ventas...',
      title: 'Título',
      loadingSalesAgenda: 'Cargando agenda de ventas...',
      noSalesAgendaFound: 'No se encontró agenda de ventas',
      confirmDeleteSalesAgenda: '¿Está seguro de que desea eliminar esta agenda de ventas?',
      salesAgendaCreatedSuccess: 'Agenda de ventas creada exitosamente',
      salesAgendaUpdatedSuccess: 'Agenda de ventas actualizada exitosamente',
      salesAgendaDeletedSuccess: 'Agenda de ventas eliminada exitosamente',
      salesAgendaCreateError: 'Error al crear agenda de ventas',
      salesAgendaUpdateError: 'Error al actualizar agenda de ventas',
      salesAgendaDeleteError: 'Error al eliminar agenda de ventas',
      salesAgendaLoadError: 'Error al cargar agenda de ventas',
      
      // Common actions
      success: 'Éxito',
      error: 'Error',
      
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