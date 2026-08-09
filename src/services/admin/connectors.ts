import { adminApiClient } from '../adminApiClient';
import type {
  AdminConnectorDetail,
  AdminConnectorSummary,
  AdminDatasourceSummary,
  ListParams,
  PaginatedResponse,
} from '../../types/admin';

export interface ConnectorsListParams extends ListParams {
  status?: string;
  has_sync_error?: boolean;
}

export interface DatasourcesListParams extends ListParams {
  status?: string;
  has_ingestion_error?: boolean;
}

export const connectorsApi = {
  list(params: ConnectorsListParams = {}) {
    return adminApiClient
      .get<PaginatedResponse<AdminConnectorSummary>>('/connectors', { params })
      .then((r) => r.data);
  },
  get(id: string) {
    return adminApiClient.get<AdminConnectorDetail>(`/connectors/${id}`).then((r) => r.data);
  },
  resync(id: string) {
    return adminApiClient
      .post<AdminConnectorSummary>(`/connectors/${id}/resync`)
      .then((r) => r.data);
  },
};

export const datasourcesApi = {
  list(params: DatasourcesListParams = {}) {
    return adminApiClient
      .get<PaginatedResponse<AdminDatasourceSummary>>('/datasources', { params })
      .then((r) => r.data);
  },
  get(id: string) {
    return adminApiClient.get<AdminDatasourceSummary>(`/datasources/${id}`).then((r) => r.data);
  },
};
