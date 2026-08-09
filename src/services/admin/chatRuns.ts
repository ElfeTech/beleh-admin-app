import { adminApiClient } from '../adminApiClient';
import type { AdminChatRunSummary, ListParams, PaginatedResponse } from '../../types/admin';

export interface ChatRunsListParams extends ListParams {
  status?: string;
  error_code?: string;
  user_id?: string;
  workspace_id?: string;
}

export const chatRunsApi = {
  list(params: ChatRunsListParams = {}) {
    return adminApiClient
      .get<PaginatedResponse<AdminChatRunSummary>>('/chat-runs', { params })
      .then((r) => r.data);
  },
  get(runId: string) {
    return adminApiClient.get<AdminChatRunSummary>(`/chat-runs/${runId}`).then((r) => r.data);
  },
  cancel(runId: string) {
    return adminApiClient
      .post<AdminChatRunSummary>(`/chat-runs/${runId}/cancel`)
      .then((r) => r.data);
  },
};
