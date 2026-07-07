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
  origin_date: string
  description?: string | null
  client_phone?: string | null
  client_origin?: 'online_lead' | 'own_portfolio' | 'duty_shift' | 'referral' | 'street_client' | null
  purpose?: 'investment' | 'recreation' | 'both' | null
  deal_type?: 'purchase' | 'purchase_exchange' | 'exchange' | null
  gsv: string
  property_name?: string | null
  status: 'service_cold' | 'service_mild' | 'service_warm' | 'visit_foreseen_cold' | 'visit_foreseen_mild' | 'visit_foreseen_warm' | 'visit_done_cold' | 'visit_done_mild' | 'visit_done_warm' | 'proposal' | 'contract' | 'sold' | 'discarded_no_profile' | 'discarded_no_interest' | 'discarded_competitor' | 'discarded_error'
  user_id: number
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
  origin: string
  created_at?: Date
  updated_at?: Date
}

export interface Product {
  id: number
  name: string
  price: string | null
  type: string
  category: 'off-plan' | 'completed'
  description: string
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
  has_thumbnail?: boolean
  created_at?: Date
  updated_at?: Date
}

export type ProductStatus = 'available' | 'inactive' | 'sold'

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

export type AppointmentOrigin = 'manual' | 'whatsapp'

export interface Appointment {
  id: number
  client: string
  type: 'chat' | 'call' | 'in_person' | 'visit'
  scheduled_datetime: string
  description?: string | null
  answered: boolean
  property_name?: string | null
  user_id: number
  // 'manual' (criado na tela) ou 'whatsapp' (auto-criado pelo ChatService).
  // Opcional porque o banco aplica DEFAULT 'manual' quando o campo não é informado.
  origin?: AppointmentOrigin
  // Quando origin='whatsapp', referencia a conversa que disparou a auto-criação.
  conversation_id?: number | null
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
  user_id: number
  created_at?: Date
  updated_at?: Date
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

export interface FollowUp {
  id: number
  appointment_id: number | null
  client_name: string
  next_action: string
  next_action_date: string
  completed: boolean
  completed_at?: Date | null
  user_id: number
  created_at?: Date
  updated_at?: Date
}

export interface FollowUpWithDetails extends FollowUp {
  appointment?: Appointment
  followup_status: 'open' | 'pending' | 'overdue'
}

export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'counter_proposal' | 'expired'

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
  start_at: string | Date
  end_at?: string | Date | null
  all_day: boolean
  color?: string | null
  client_id?: number | null
  deal_id?: number | null
  product_id?: number | null
  status: CalendarEventStatus
  created_at?: Date
  updated_at?: Date
}

export interface CalendarEventWithDetails extends CalendarEvent {
  user_name?: string          // dono do evento (via JOIN users)
  client_name?: string | null
  deal_client?: string | null // deal.client (nome no negócio)
  product_name?: string | null
}

/**
 * Item unificado da agenda — pode ser calendar_event (manual) ou follow-up
 * em aberto. Serve pra endpoint /api/agenda que devolve tudo agregado.
 */
export type AgendaItemKind = 'event' | 'followup' | 'google'

export interface AgendaItem {
  kind: AgendaItemKind
  id: number | string           // id numérico nas tabelas locais; string no Google (event id da API)
  user_id: number
  user_name?: string | null
  title: string
  description?: string | null
  start_at: string              // ISO string
  end_at?: string | null
  all_day: boolean
  color?: string | null
  status: string                // scheduled/completed/cancelled (event) ou completed=false (followup)
  // Contexto adicional (varia por kind)
  client_name?: string | null
  deal_client?: string | null
  product_name?: string | null
  followup_next_action?: string | null  // só quando kind='followup'
  location?: string | null              // usado no kind='google'
  html_link?: string | null             // link pro evento no Google Calendar (kind='google')
}

// -----------------------------------------------------------------------------
// Integração Google Calendar (unidirecional Google → BRM)
// -----------------------------------------------------------------------------

export interface GoogleCalendarConnection {
  id: number
  user_id: number
  connected_email: string
  access_token: string
  refresh_token: string
  token_expires_at: string
  scope?: string | null
  last_sync_at?: string | null
  created_at: string
  updated_at: string
}

export interface GoogleCalendarStatus {
  connected: boolean
  email?: string
  last_sync_at?: string | null
}

export interface Proposal {
  id: number
  deal_id: number
  proposal_value: string | number
  payment_condition?: string | null
  proposal_date: string
  validity_date?: string | null
  status: ProposalStatus
  notes?: string | null
  // Campos financeiros adicionais (todos nullable, decimal/moeda):
  vgv?: string | number | null                  // Valor Geral de Vendas
  vgc?: string | number | null                  // Volume Geral de Comissão
  intermediation_rate?: string | number | null  // Taxa de Intermediação (%, ex: 6 = 6%)
  user_id: number
  created_at?: Date
  updated_at?: Date
}

export interface ProposalWithDetails extends Proposal {
  deal_client?: string
  deal_property_name?: string | null
  deal_property_price?: string | number | null  // preço do imóvel via JOIN com products
}

// ---------------------------------------------------------------------------
// Módulo Contrato (etapa entre Proposta e Venda)
// ---------------------------------------------------------------------------

export type ContractStatus =
  | 'pending_docs'       // corretor precisa anexar documentos
  | 'awaiting_legal'     // jurídico precisa revisar
  | 'legal_rejected'     // jurídico rejeitou, volta pro corretor
  | 'awaiting_manager'   // gestor precisa aprovar tudo
  | 'manager_rejected'   // gestor pediu ajustes
  | 'approved'           // aprovado, Sale criada

export type ContractDocumentType = 'client_doc' | 'contract'

export interface Contract {
  id: number
  deal_id: number
  proposal_id: number
  user_id: number                              // corretor responsável
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
  // Vindos de JOINs pra economizar N+1 na listagem
  deal_client?: string
  deal_property_name?: string | null
  broker_name?: string          // corretor (user_id)
  legal_reviewer_name?: string | null
  manager_reviewer_name?: string | null
  proposal_value?: string | number
  documents_count?: number      // total (client_doc + contract)
  contract_files_count?: number // só 'contract' — se >= 1 tem contrato anexado
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
  approved_at?: Date | string | null
  approval_notes?: string | null
  last_modified_by_user_id?: number | null
  last_modified_at?: Date | string | null
  created_at?: Date
  updated_at?: Date
}

export interface SaleWithDetails extends Sale {
  last_modifier_name?: string | null
  // Vindos do JOIN com deals, products, users e proposals
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

export interface WhatsAppSession {
  id: number
  user_id: number
  phone_number: string
  display_name?: string | null
  status: WhatsAppSessionStatus
  connected_at?: Date | null
  // Provider em uso: 'baileys' (legado) | 'cloud_api' (Meta oficial)
  provider?: 'baileys' | 'cloud_api'
  // Campos do Cloud API (BYOK — cadastrados pelo usuário via UI):
  phone_number_id?: string | null      // ID do número na Meta
  access_token?: string | null         // Token longa duração da WABA
  app_secret?: string | null           // Pra validar assinatura do webhook
  verify_token?: string | null         // Pra Meta challenge inicial
  business_account_id?: string | null  // ID da WABA (templates etc.)
  created_at?: Date
  updated_at?: Date
}

export interface Conversation {
  id: number
  owner_user_id: number
  contact_phone: string
  contact_name?: string | null
  client_id?: number | null
  last_message_at?: Date | null
  unread_count: number
  created_at?: Date
  updated_at?: Date
}

export interface ConversationWithDetails extends Conversation {
  // Enriquecimentos do JOIN — exibidos na lista de conversas
  client_name?: string | null
  owner_user_name?: string | null
  last_message_preview?: string | null
  last_message_direction?: 'inbound' | 'outbound' | null
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
  sent_at?: Date
  created_at?: Date
}

// ---------------------------------------------------------------------------
// Módulo Leads (integrações com Meta, Google Ads, etc.)
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
  last_lead_at?: Date | null
  created_at?: Date
  updated_at?: Date
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
  accepted_at?: Date | null
  notes?: string | null
  received_at?: Date
  created_at?: Date
  updated_at?: Date
}

export interface LeadWithDetails extends Lead {
  source_name?: string | null
  source_type?: LeadSourceType | null
  accepted_by_user_name?: string | null
  client_name?: string | null
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
  // Contratos em andamento (todos exceto approved, que ja virou Sale)
  totalContracts: number
  // Pendências de comunicação: conversas não respondidas + ligações não atendidas
  pendingChatAndCalls: number
  // Leads aguardando triagem (status='novo')
  newLeads: number
}

export interface AppointmentAnalytics {
  date: string
  answered: number
  not_answered: number
}

export interface DealFunnelStage {
  status: string
  count: number
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
  // Filtros de data de criação (inclusivo, formato YYYY-MM-DD).
  // Usado nos módulos Propostas e Vendas.
  createdFrom?: string
  createdTo?: string
}
