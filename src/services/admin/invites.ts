import { adminApiClient } from '../adminApiClient';
import type {
  AdminInvite,
  AdminInviteCreate,
  InvitesListParams,
  PaginatedResponse,
} from '../../types/admin';

export const invitesApi = {
  list(params: InvitesListParams = {}) {
    return adminApiClient
      .get<PaginatedResponse<AdminInvite>>('/invites', { params })
      .then((r) => r.data);
  },
  create(body: AdminInviteCreate) {
    return adminApiClient.post<AdminInvite>('/invites', body).then((r) => r.data);
  },
  revoke(inviteId: string) {
    return adminApiClient
      .post<AdminInvite>(`/invites/${inviteId}/revoke`)
      .then((r) => r.data);
  },
};
