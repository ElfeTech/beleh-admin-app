import { adminApiClient } from '../adminApiClient';
import type {
  AdminAddMember,
  AdminWorkspaceDetail,
  AdminWorkspaceInvitation,
  AdminWorkspaceInvitationCreate,
  AdminWorkspaceMember,
  AdminWorkspacePatch,
  AdminWorkspaceSummary,
  AdminWorkspaceUsage,
  ListParams,
  PaginatedResponse,
} from '../../types/admin';

export interface WorkspacesListParams extends ListParams {
  tenant_id?: string;
}

export const workspacesApi = {
  list(params: WorkspacesListParams = {}) {
    return adminApiClient
      .get<PaginatedResponse<AdminWorkspaceSummary>>('/workspaces', { params })
      .then((r) => r.data);
  },
  get(id: string) {
    return adminApiClient.get<AdminWorkspaceDetail>(`/workspaces/${id}`).then((r) => r.data);
  },
  patch(id: string, body: AdminWorkspacePatch) {
    return adminApiClient.patch<AdminWorkspaceDetail>(`/workspaces/${id}`, body).then((r) => r.data);
  },
  getUsage(id: string) {
    return adminApiClient.get<AdminWorkspaceUsage>(`/workspaces/${id}/usage`).then((r) => r.data);
  },
  addMember(workspaceId: string, body: AdminAddMember) {
    return adminApiClient
      .post<AdminWorkspaceMember>(`/workspaces/${workspaceId}/members`, body)
      .then((r) => r.data);
  },
  updateMemberRole(workspaceId: string, memberId: string, role: string) {
    return adminApiClient
      .put<AdminWorkspaceMember>(`/workspaces/${workspaceId}/members/${memberId}`, { role })
      .then((r) => r.data);
  },
  removeMember(workspaceId: string, memberId: string) {
    return adminApiClient.delete(`/workspaces/${workspaceId}/members/${memberId}`);
  },
  listInvitations(workspaceId: string) {
    return adminApiClient
      .get<AdminWorkspaceInvitation[]>(`/workspaces/${workspaceId}/invitations`)
      .then((r) => r.data);
  },
  createInvitation(workspaceId: string, body: AdminWorkspaceInvitationCreate) {
    return adminApiClient
      .post<AdminWorkspaceInvitation>(`/workspaces/${workspaceId}/invitations`, body)
      .then((r) => r.data);
  },
  revokeInvitation(workspaceId: string, invitationId: string) {
    return adminApiClient
      .delete<AdminWorkspaceInvitation>(`/workspaces/${workspaceId}/invitations/${invitationId}`)
      .then((r) => r.data);
  },
  resendInvitation(workspaceId: string, invitationId: string) {
    return adminApiClient
      .post<AdminWorkspaceInvitation>(
        `/workspaces/${workspaceId}/invitations/${invitationId}/resend`,
      )
      .then((r) => r.data);
  },
  remove(id: string) {
    return adminApiClient.delete(`/workspaces/${id}`);
  },
};
