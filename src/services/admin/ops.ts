import { adminApiClient } from '../adminApiClient';
import type { AdminOpsHealth, AdminWorkerResult } from '../../types/admin';

export const opsApi = {
  health() {
    return adminApiClient.get<AdminOpsHealth>('/ops/health').then((r) => r.data);
  },
  config() {
    return adminApiClient.get<Record<string, unknown>>('/ops/config').then((r) => r.data);
  },
  runProviderMaintenance() {
    return adminApiClient
      .post<AdminWorkerResult>('/ops/workers/provider-maintenance')
      .then((r) => r.data);
  },
  runUsageAggregate() {
    return adminApiClient
      .post<AdminWorkerResult>('/ops/workers/usage-aggregate')
      .then((r) => r.data);
  },
};
