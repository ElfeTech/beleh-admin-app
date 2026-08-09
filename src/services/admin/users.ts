import { adminApiClient } from '../adminApiClient';
import type {
  AdminUserDetail,
  AdminUserPatch,
  AdminUserSummary,
  ListParams,
  PaginatedResponse,
} from '../../types/admin';

export interface UsersListParams extends ListParams {
  is_active?: boolean;
}

export const usersApi = {
  list(params: UsersListParams = {}) {
    return adminApiClient
      .get<PaginatedResponse<AdminUserSummary>>('/users', { params })
      .then((r) => r.data);
  },
  get(userId: string) {
    return adminApiClient.get<AdminUserDetail>(`/users/${userId}`).then((r) => r.data);
  },
  patch(userId: string, body: AdminUserPatch) {
    return adminApiClient.patch<AdminUserDetail>(`/users/${userId}`, body).then((r) => r.data);
  },
};
