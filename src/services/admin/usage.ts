import { adminApiClient } from '../adminApiClient';
import type {
  AdminTopConsumer,
  AdminUsageOverview,
  AdminUsageSystem,
  AdminWorkerResult,
} from '../../types/admin';

export const usageApi = {
  overview() {
    return adminApiClient.get<AdminUsageOverview>('/usage/overview').then((r) => r.data);
  },
  topConsumers(entity_type: 'user' | 'workspace') {
    return adminApiClient
      .get<AdminTopConsumer[]>('/usage/top-consumers', { params: { entity_type } })
      .then((r) => r.data);
  },
  system() {
    return adminApiClient.get<AdminUsageSystem>('/usage/system').then((r) => r.data);
  },
  aggregate() {
    return adminApiClient.post<AdminWorkerResult>('/usage/aggregate').then((r) => r.data);
  },
};
