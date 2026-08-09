import { adminApiClient } from '../adminApiClient';
import type {
  AdminSubscriptionAssign,
  AdminSubscriptionResponse,
  AdminTenantDetail,
  AdminTenantPatch,
  AdminTenantSummary,
  AdminWorkspaceSummary,
  ListParams,
  PaginatedResponse,
} from '../../types/admin';

export const tenantsApi = {
  list(params: ListParams = {}) {
    return adminApiClient
      .get<PaginatedResponse<AdminTenantSummary>>('/tenants', { params })
      .then((r) => r.data);
  },
  get(id: string) {
    return adminApiClient.get<AdminTenantDetail>(`/tenants/${id}`).then((r) => r.data);
  },
  patch(id: string, body: AdminTenantPatch) {
    return adminApiClient.patch<AdminTenantDetail>(`/tenants/${id}`, body).then((r) => r.data);
  },
  listWorkspaces(tenantId: string, params: ListParams = {}) {
    return adminApiClient
      .get<PaginatedResponse<AdminWorkspaceSummary>>(`/tenants/${tenantId}/workspaces`, {
        params,
      })
      .then((r) => r.data);
  },
  getSubscription(tenantId: string) {
    return adminApiClient
      .get<AdminSubscriptionResponse | null>(`/tenants/${tenantId}/subscription`)
      .then((r) => r.data);
  },
  assignSubscription(tenantId: string, body: AdminSubscriptionAssign) {
    return adminApiClient
      .put<AdminSubscriptionResponse>(`/tenants/${tenantId}/subscription`, body)
      .then((r) => r.data);
  },
};
