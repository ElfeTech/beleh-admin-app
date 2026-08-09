import { adminApiClient } from '../adminApiClient';
import type {
  FeedbackRead,
  FeedbackStatsResponse,
  ListParams,
  PaginatedResponse,
} from '../../types/admin';

export const feedbackApi = {
  list(params: ListParams = {}) {
    return adminApiClient
      .get<PaginatedResponse<FeedbackRead>>('/feedback', { params })
      .then((r) => r.data);
  },
  stats() {
    return adminApiClient.get<FeedbackStatsResponse>('/feedback/stats').then((r) => r.data);
  },
  get(id: string) {
    return adminApiClient.get<FeedbackRead>(`/feedback/${id}`).then((r) => r.data);
  },
};
