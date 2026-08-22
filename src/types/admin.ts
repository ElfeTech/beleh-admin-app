/** Types mirroring backend Admin Platform API schemas. */

export type AdminErrorCode =
  | 'ADMIN_UNAUTHORIZED'
  | 'ADMIN_FORBIDDEN'
  | 'ADMIN_NOT_FOUND'
  | 'ADMIN_JWT_NOT_CONFIGURED'
  | 'ADMIN_NOT_INVITED'
  | 'ADMIN_INVITE_EXISTS'
  | 'ADMIN_INVITE_LAST_ACTIVE'
  | 'ADMIN_INVITE_NOT_FOUND'
  | 'ADMIN_CONFLICT'
  | 'ADMIN_LAST_OWNER'
  | 'ADMIN_INVALID'
  | string;

export interface AdminErrorDetail {
  message?: string;
  detail?: string | { message?: string; code?: string };
  code?: AdminErrorCode;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface AdminUserSummary {
  id: string;
  uid: string;
  email: string;
  display_name?: string | null;
  photo_url?: string | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AdminLoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AdminUserSummary;
}

export interface AdminUserMembership {
  workspace_id: string;
  workspace_name?: string | null;
  role: string;
  status: string;
}

export interface AdminUserDetail extends AdminUserSummary {
  workspace_count: number;
  plan_name?: string | null;
  plan_tier?: string | null;
  subscription_status?: string | null;
  tenant_id?: string | null;
  tenant_name?: string | null;
  memberships?: AdminUserMembership[];
}

export interface AdminUserPatch {
  is_active?: boolean;
  display_name?: string;
}

export interface AdminWorkspaceUsage {
  seats_used: number;
  seats_limit: number;
  datasources_used: number;
  datasources_limit: number;
  workspaces_used: number;
  workspaces_limit: number;
}

export interface AdminTenantSummary {
  id: string;
  name: string;
  owner_user_id: string;
  owner_email?: string | null;
  workspace_count: number;
  created_at?: string | null;
}

export interface AdminTenantDetail extends AdminTenantSummary {
  plan_name?: string | null;
  plan_tier?: string | null;
  subscription_status?: string | null;
  workspaces_used: number;
  workspaces_limit: number;
  seats_limit: number;
  datasources_limit: number;
}

export interface AdminTenantPatch {
  name?: string;
}

export type WorkspaceRole = 'owner' | 'member';

export interface AdminWorkspaceSummary {
  id: string;
  name: string;
  description?: string | null;
  owner_id: string;
  owner_email?: string | null;
  tenant_id?: string | null;
  tenant_name?: string | null;
  is_default: boolean;
  provider_slug?: string | null;
  provider_project_id?: string | null;
  member_count: number;
  pending_invitation_count?: number;
  created_at?: string | null;
}

export interface AdminWorkspaceMember {
  id: string;
  user_id: string;
  email?: string | null;
  display_name?: string | null;
  role: WorkspaceRole | string;
  status?: string;
  joined_at?: string | null;
}

export interface AdminWorkspaceDetail extends AdminWorkspaceSummary {
  provider_project_name?: string | null;
  provider_organization?: string | null;
  dataset_count: number;
  connector_count: number;
  members: AdminWorkspaceMember[];
  usage?: AdminWorkspaceUsage | null;
}

export interface AdminWorkspacePatch {
  name?: string;
  description?: string;
  owner_id?: string;
  tenant_id?: string;
}

export interface AdminAddMember {
  user_id: string;
  role?: WorkspaceRole | string;
}

export interface AdminWorkspaceInvitationCreate {
  email: string;
  role?: WorkspaceRole | string;
}

export interface AdminWorkspaceInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: string;
  status: string;
  invited_by: string;
  expires_at: string;
  created_at?: string | null;
}

export interface PlanLimits {
  monthly_query_limit: number;
  monthly_llm_token_limit: number;
  monthly_rows_scanned_limit: number;
  monthly_chart_renders_limit: number;
  max_datasets: number;
  max_workspaces: number;
  max_members_per_workspace: number;
}

export type PlanTier = 'free' | 'pro' | 'team' | 'enterprise';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial' | 'past_due';

export interface PlanResponse {
  id: string;
  name: string;
  tier: PlanTier;
  description?: string | null;
  limits: PlanLimits;
  features: Record<string, boolean>;
  price_monthly: number;
  price_yearly: number;
  compare_at_price_monthly?: number | null;
  compare_at_price_yearly?: number | null;
  discount_label?: string | null;
  discount_percent_monthly?: number | null;
  discount_percent_yearly?: number | null;
  is_active: boolean;
  stripe_product_id?: string | null;
  stripe_price_monthly_id?: string | null;
  stripe_price_yearly_id?: string | null;
}

export interface AdminPlanCreate {
  name: string;
  tier: PlanTier;
  description?: string;
  monthly_query_limit?: number;
  monthly_llm_token_limit?: number;
  monthly_rows_scanned_limit?: number;
  monthly_chart_renders_limit?: number;
  max_datasets?: number;
  max_workspaces?: number;
  max_members_per_workspace?: number;
  features?: Record<string, boolean>;
  price_monthly?: number;
  price_yearly?: number;
  compare_at_price_monthly?: number | null;
  compare_at_price_yearly?: number | null;
  discount_label?: string | null;
  stripe_product_id?: string | null;
  stripe_price_monthly_id?: string | null;
  stripe_price_yearly_id?: string | null;
  is_active?: boolean;
  publish_to_stripe?: boolean;
}

export type AdminPlanUpdate = Partial<AdminPlanCreate>;

export type StripePricePublishActionKind =
  | 'created'
  | 'reused'
  | 'archived_and_created'
  | 'cleared'
  | 'skipped';

export interface StripePricePublishAction {
  interval: string;
  previous_price_id?: string | null;
  price_id?: string | null;
  unit_amount: number;
  action: StripePricePublishActionKind;
}

export interface StripePublishResponse {
  plan_id: string;
  tier: string;
  name: string;
  stripe_product_id?: string | null;
  product_action: string;
  prices: StripePricePublishAction[];
  note: string;
}

export interface StripeSyncPlanResult {
  plan_id?: string | null;
  tier: string;
  name: string;
  stripe_product_id?: string | null;
  stripe_price_monthly_id?: string | null;
  stripe_price_yearly_id?: string | null;
  price_monthly: number;
  price_yearly: number;
  action: string;
}

export interface StripeSyncResponse {
  synced: number;
  skipped: number;
  plans: StripeSyncPlanResult[];
  stripe_products_seen: number;
}

export interface AdminSubscriptionAssign {
  plan_id: string;
  status?: SubscriptionStatus;
  billing_cycle_start?: string | null;
  billing_cycle_end?: string | null;
  expires_at?: string | null;
}

export interface AdminSubscriptionResponse {
  id: string;
  plan: PlanResponse;
  status: string;
  billing_cycle_start: string;
  billing_cycle_end: string;
  started_at?: string | null;
  expires_at?: string | null;
  cancelled_at?: string | null;
}

export interface AdminUsageOverview {
  total_queries: number;
  total_llm_tokens: number;
  total_rows_scanned: number;
  total_chart_renders: number;
  total_exports: number;
  total_api_calls: number;
  estimated_cost_usd: number;
  active_users: number;
  period_start?: string | null;
  period_end?: string | null;
}

export interface AdminTopConsumer {
  entity_type: string;
  entity_id: string;
  label?: string | null;
  total_queries: number;
  total_llm_tokens: number;
  total_rows_scanned: number;
  estimated_cost_usd: number;
}

export interface AdminUsageSystem {
  status: string;
  redis_available: boolean;
  event_queue_length: number;
}

export interface AdminChatRunSummary {
  id: string;
  session_id: string;
  user_id: string;
  workspace_id?: string | null;
  status: string;
  phase?: string | null;
  error_code?: string | null;
  error_detail?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  created_at?: string | null;
}

export interface AdminConnectorSummary {
  id: string;
  workspace_id: string;
  user_id: string;
  connection_type: string;
  display_name: string;
  status: string;
  metadata_sync_status: string;
  schema_sync_error?: string | null;
  schema_table_count?: number | null;
  last_schema_sync_at?: string | null;
  created_at?: string | null;
}

export interface AdminConnectorDetail extends AdminConnectorSummary {
  config_redacted: Record<string, unknown>;
  metadata_json?: Record<string, unknown> | null;
}

export interface AdminDatasourceSummary {
  id: string;
  name: string;
  type: string;
  status: string;
  workspace_id: string;
  user_id: string;
  ingestion_error?: string | null;
  file_size?: number | null;
  connector_id?: string | null;
  created_at?: string | null;
}

export interface FeedbackRead {
  id: string;
  user_id: string;
  workspace_id?: string | null;
  dataset_id?: string | null;
  session_id?: string | null;
  feedback_type: string;
  question: string;
  response: string;
  rating?: number | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface FeedbackStatsResponse {
  total_feedback: number;
  average_rating?: number | null;
  feedback_by_type: Record<string, number>;
  recent_feedback_count: number;
}

export interface ProviderAdminDetail {
  id: string;
  slug: string;
  display_name: string;
  description?: string | null;
  icon_url?: string | null;
  auth_type: string;
  status: string;
  authorization_url: string;
  token_url: string;
  api_base_url: string;
  scopes: string[];
  redirect_uri: string;
  project_url_template?: string | null;
  dashboard_url_template?: string | null;
  connection_type: string;
  capabilities: Record<string, unknown>;
  extra_config: Record<string, unknown>;
  client_id?: string | null;
  has_secret: boolean;
  secret_version?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ProviderCatalogCreate {
  slug: string;
  display_name: string;
  description?: string;
  icon_url?: string;
  auth_type?: string;
  status?: string;
  authorization_url: string;
  token_url: string;
  api_base_url: string;
  scopes?: string[];
  redirect_uri: string;
  project_url_template?: string;
  dashboard_url_template?: string;
  connection_type?: string;
  capabilities?: Record<string, unknown>;
  extra_config?: Record<string, unknown>;
  client_id: string;
  client_secret: string;
}

export type ProviderCatalogUpdate = Partial<
  Omit<ProviderCatalogCreate, 'slug' | 'client_id' | 'client_secret'>
>;

export interface ProviderCredentialsRotate {
  client_id?: string;
  client_secret?: string;
}

export interface AdminProviderAuditEvent {
  id: string;
  user_id?: string | null;
  workspace_id?: string | null;
  connection_id?: string | null;
  provider_slug?: string | null;
  action: string;
  ip?: string | null;
  user_agent?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
}

export interface AdminOpsHealth {
  status: string;
  database: string;
  redis: string;
  firebase: string;
  details: Record<string, unknown>;
}

export interface AdminWorkerResult {
  ok: boolean;
  result: Record<string, unknown>;
}

export interface ListParams {
  page?: number;
  page_size?: number;
  q?: string;
}

export type CostCadence = 'monthly' | 'per_event' | 'per_1k_tokens';

export interface CreditSettings {
  id: string;
  tokens_per_credit: number;
  updated_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CreditSettingsUpdate {
  tokens_per_credit: number;
}

export interface LlmModelRate {
  id: string;
  model_id: string;
  display_name?: string | null;
  input_price_per_1m_usd: number;
  output_price_per_1m_usd: number;
  is_active: boolean;
  effective_from: string;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface LlmModelRateCreate {
  model_id: string;
  display_name?: string | null;
  input_price_per_1m_usd: number;
  output_price_per_1m_usd: number;
  is_active?: boolean;
  effective_from?: string | null;
  notes?: string | null;
}

export type LlmModelRateUpdate = Partial<LlmModelRateCreate>;

export interface CostCatalogItem {
  id: string;
  name: string;
  description?: string | null;
  amount_usd: number;
  cadence: CostCadence;
  event_type?: string | null;
  is_active: boolean;
  effective_from: string;
  effective_to?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CostCatalogItemCreate {
  name: string;
  description?: string | null;
  amount_usd: number;
  cadence: CostCadence;
  event_type?: string | null;
  is_active?: boolean;
  effective_from?: string | null;
  effective_to?: string | null;
}

export type CostCatalogItemUpdate = Partial<CostCatalogItemCreate>;

export interface RevenueBreakdown {
  subscription_mrr_usd: number;
  active_paid_subscriptions: number;
  estimation_mode: string;
}

export interface CostBreakdown {
  llm_cost_usd: number;
  infra_cost_usd: number;
  infra_monthly_usd: number;
  infra_per_event_usd: number;
  infra_per_1k_tokens_usd: number;
  unpriced_llm_tokens: number;
}

export interface FinanceUsageTotals {
  total_queries: number;
  total_llm_tokens: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  active_users: number;
}

export interface AdminFinanceOverview {
  period_start: string;
  period_end: string;
  revenue_usd: number;
  revenue_breakdown: RevenueBreakdown;
  cost_usd: number;
  cost_breakdown: CostBreakdown;
  net_profit_usd: number;
  margin_pct?: number | null;
  usage_totals: FinanceUsageTotals;
}

export type AdminInviteStatus = 'pending' | 'accepted' | 'revoked';

export interface AdminInvite {
  id: string;
  email: string;
  status: AdminInviteStatus;
  invited_by_user_id?: string | null;
  accepted_user_id?: string | null;
  accepted_at?: string | null;
  revoked_at?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AdminInviteCreate {
  email: string;
  notes?: string | null;
}

export interface InvitesListParams extends ListParams {
  status?: AdminInviteStatus;
}

// ---------------------------------------------------------------------------
// Billing ledger (Stripe webhook events + subscriptions)
// ---------------------------------------------------------------------------

export type BillingEventStatus = 'received' | 'processed' | 'failed' | 'ignored' | 'duplicate';

export interface AdminBillingEvent {
  id: string;
  stripe_event_id?: string | null;
  event_type: string;
  status: BillingEventStatus;
  error?: string | null;
  user_id?: string | null;
  user_email?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_invoice_id?: string | null;
  amount_cents?: number | null;
  currency?: string | null;
  summary?: Record<string, unknown> | null;
  created_at?: string | null;
  processed_at?: string | null;
}

export interface AdminSubscriptionRow {
  id: string;
  scope: 'user' | 'workspace';
  user_id?: string | null;
  user_email?: string | null;
  workspace_id?: string | null;
  workspace_name?: string | null;
  plan_id?: string | null;
  plan_name?: string | null;
  plan_tier?: string | null;
  status: string;
  billing_interval?: string | null;
  unit_amount_cents?: number | null;
  billing_cycle_start?: string | null;
  billing_cycle_end?: string | null;
  started_at?: string | null;
  cancelled_at?: string | null;
  expires_at?: string | null;
  external_subscription_id?: string | null;
}

export interface AdminBillingSummary {
  subscriptions_by_status: Record<string, number>;
  estimated_mrr_cents: number;
  events_last_24h: number;
  events_last_7d: number;
  failed_events_last_7d: number;
}

// ---------------------------------------------------------------------------
// System logs
// ---------------------------------------------------------------------------

export interface AdminSystemLog {
  id: string;
  level: string;
  logger?: string | null;
  message: string;
  exception?: string | null;
  request_id?: string | null;
  method?: string | null;
  path?: string | null;
  created_at?: string | null;
}

export interface AdminSystemLogStats {
  counts_24h: Record<string, number>;
  counts_7d: Record<string, number>;
  top_loggers_7d: { logger: string; count: number }[];
  total: number;
}

// ---------------------------------------------------------------------------
// Admin action audit
// ---------------------------------------------------------------------------

export interface AdminAuditLogEntry {
  id: string;
  admin_user_id?: string | null;
  admin_email?: string | null;
  method: string;
  path: string;
  query?: string | null;
  status_code: number;
  duration_ms?: number | null;
  request_id?: string | null;
  client_ip?: string | null;
  user_agent?: string | null;
  created_at?: string | null;
}

// ---------------------------------------------------------------------------
// Per-user usage (investigation view)
// ---------------------------------------------------------------------------

export interface AdminUserUsageDaily {
  date: string;
  queries: number;
  llm_tokens: number;
  rows_scanned: number;
  chart_renders: number;
}

export interface AdminUserUsage {
  period_start: string;
  period_end: string;
  total_queries: number;
  total_llm_tokens: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_rows_scanned: number;
  total_chart_renders: number;
  estimated_cost_usd?: number | null;
  monthly_llm_token_limit?: number | null;
  daily: AdminUserUsageDaily[];
}
