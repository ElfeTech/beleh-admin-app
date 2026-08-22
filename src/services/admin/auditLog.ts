import { adminApiClient } from '../adminApiClient';
import type { AdminAuditLogEntry, ListParams, PaginatedResponse } from '../../types/admin';

export interface AuditLogListParams extends ListParams {
  method?: string;
  status_min?: number;
  status_max?: number;
  created_after?: string;
  created_before?: string;
}

export const auditLogApi = {
  list(params: AuditLogListParams = {}) {
    return adminApiClient
      .get<PaginatedResponse<AdminAuditLogEntry>>('/audit-log', { params })
      .then((r) => r.data);
  },
};
