import { adminApiClient } from '../adminApiClient';
import type {
  AdminSystemLog,
  AdminSystemLogStats,
  AdminWorkerResult,
  ListParams,
  PaginatedResponse,
} from '../../types/admin';

export interface LogsListParams extends ListParams {
  level?: string;
  logger?: string;
  request_id?: string;
  created_after?: string;
  created_before?: string;
}

export const logsApi = {
  list(params: LogsListParams = {}) {
    return adminApiClient
      .get<PaginatedResponse<AdminSystemLog>>('/logs', { params })
      .then((r) => r.data);
  },
  get(logId: string) {
    return adminApiClient.get<AdminSystemLog>(`/logs/${logId}`).then((r) => r.data);
  },
  stats() {
    return adminApiClient.get<AdminSystemLogStats>('/logs/stats').then((r) => r.data);
  },
  purge(olderThanDays: number) {
    return adminApiClient
      .post<AdminWorkerResult>('/logs/purge', { older_than_days: olderThanDays })
      .then((r) => r.data);
  },
};
