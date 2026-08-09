import { adminApiClient } from '../adminApiClient';
import type {
  AdminProviderAuditEvent,
  ListParams,
  PaginatedResponse,
  ProviderAdminDetail,
  ProviderCatalogCreate,
  ProviderCatalogUpdate,
  ProviderCredentialsRotate,
} from '../../types/admin';

export const providersApi = {
  list() {
    return adminApiClient.get<ProviderAdminDetail[]>('/providers').then((r) => r.data);
  },
  get(slug: string) {
    return adminApiClient.get<ProviderAdminDetail>(`/providers/${slug}`).then((r) => r.data);
  },
  create(body: ProviderCatalogCreate) {
    return adminApiClient.post<ProviderAdminDetail>('/providers', body).then((r) => r.data);
  },
  update(slug: string, body: ProviderCatalogUpdate) {
    return adminApiClient.patch<ProviderAdminDetail>(`/providers/${slug}`, body).then((r) => r.data);
  },
  disable(slug: string) {
    return adminApiClient.delete<ProviderAdminDetail>(`/providers/${slug}`).then((r) => r.data);
  },
  rotateCredentials(slug: string, body: ProviderCredentialsRotate) {
    return adminApiClient
      .put<ProviderAdminDetail>(`/providers/${slug}/credentials`, body)
      .then((r) => r.data);
  },
  audit(params: ListParams & { slug?: string; action?: string } = {}) {
    return adminApiClient
      .get<PaginatedResponse<AdminProviderAuditEvent>>('/providers/audit', { params })
      .then((r) => r.data);
  },
};
