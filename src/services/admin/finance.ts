import { adminApiClient } from '../adminApiClient';
import type {
  AdminFinanceOverview,
  CostCatalogItem,
  CostCatalogItemCreate,
  CostCatalogItemUpdate,
  CreditSettings,
  CreditSettingsUpdate,
  LlmModelRate,
  LlmModelRateCreate,
  LlmModelRateUpdate,
} from '../../types/admin';

export const pricingApi = {
  getCredits() {
    return adminApiClient.get<CreditSettings>('/pricing/credits').then((r) => r.data);
  },
  updateCredits(body: CreditSettingsUpdate) {
    return adminApiClient.patch<CreditSettings>('/pricing/credits', body).then((r) => r.data);
  },
  listModels(active_only = false) {
    return adminApiClient
      .get<LlmModelRate[]>('/pricing/models', { params: { active_only } })
      .then((r) => r.data);
  },
  getModel(id: string) {
    return adminApiClient.get<LlmModelRate>(`/pricing/models/${id}`).then((r) => r.data);
  },
  createModel(body: LlmModelRateCreate) {
    return adminApiClient.post<LlmModelRate>('/pricing/models', body).then((r) => r.data);
  },
  updateModel(id: string, body: LlmModelRateUpdate) {
    return adminApiClient.patch<LlmModelRate>(`/pricing/models/${id}`, body).then((r) => r.data);
  },
  disableModel(id: string) {
    return adminApiClient.delete<LlmModelRate>(`/pricing/models/${id}`).then((r) => r.data);
  },
};

export const costCatalogApi = {
  list(active_only = false) {
    return adminApiClient
      .get<CostCatalogItem[]>('/cost-catalog', { params: { active_only } })
      .then((r) => r.data);
  },
  get(id: string) {
    return adminApiClient.get<CostCatalogItem>(`/cost-catalog/${id}`).then((r) => r.data);
  },
  create(body: CostCatalogItemCreate) {
    return adminApiClient.post<CostCatalogItem>('/cost-catalog', body).then((r) => r.data);
  },
  update(id: string, body: CostCatalogItemUpdate) {
    return adminApiClient.patch<CostCatalogItem>(`/cost-catalog/${id}`, body).then((r) => r.data);
  },
  disable(id: string) {
    return adminApiClient.delete<CostCatalogItem>(`/cost-catalog/${id}`).then((r) => r.data);
  },
};

export const financeApi = {
  overview(params?: { period_start?: string; period_end?: string }) {
    return adminApiClient
      .get<AdminFinanceOverview>('/finance/overview', { params })
      .then((r) => r.data);
  },
};
