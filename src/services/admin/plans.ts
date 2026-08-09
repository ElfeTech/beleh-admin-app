import { adminApiClient } from '../adminApiClient';
import type {
  AdminPlanCreate,
  AdminPlanUpdate,
  AdminSubscriptionAssign,
  AdminSubscriptionResponse,
  PlanResponse,
  StripePublishResponse,
  StripeSyncResponse,
} from '../../types/admin';

export const plansApi = {
  list() {
    return adminApiClient.get<PlanResponse[]>('/plans').then((r) => r.data);
  },
  get(planId: string) {
    return adminApiClient.get<PlanResponse>(`/plans/${planId}`).then((r) => r.data);
  },
  create(body: AdminPlanCreate) {
    return adminApiClient.post<PlanResponse>('/plans', body).then((r) => r.data);
  },
  update(planId: string, body: AdminPlanUpdate) {
    return adminApiClient.patch<PlanResponse>(`/plans/${planId}`, body).then((r) => r.data);
  },
  publishToStripe(planId: string) {
    return adminApiClient
      .post<StripePublishResponse>(`/plans/${planId}/publish-to-stripe`)
      .then((r) => r.data);
  },
  syncFromStripe() {
    return adminApiClient
      .post<StripeSyncResponse>('/plans/sync-from-stripe')
      .then((r) => r.data);
  },
  getUserSubscription(userId: string) {
    return adminApiClient
      .get<AdminSubscriptionResponse | null>(`/users/${userId}/subscription`)
      .then((r) => r.data);
  },
  assignUserSubscription(userId: string, body: AdminSubscriptionAssign) {
    return adminApiClient
      .put<AdminSubscriptionResponse>(`/users/${userId}/subscription`, body)
      .then((r) => r.data);
  },
  getWorkspaceSubscription(workspaceId: string) {
    return adminApiClient
      .get<AdminSubscriptionResponse | null>(`/workspaces/${workspaceId}/subscription`)
      .then((r) => r.data);
  },
  assignWorkspaceSubscription(workspaceId: string, body: AdminSubscriptionAssign) {
    return adminApiClient
      .put<AdminSubscriptionResponse>(`/workspaces/${workspaceId}/subscription`, body)
      .then((r) => r.data);
  },
};
