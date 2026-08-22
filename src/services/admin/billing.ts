import { adminApiClient } from '../adminApiClient';
import type {
  AdminBillingEvent,
  AdminBillingSummary,
  AdminSubscriptionRow,
  ListParams,
  PaginatedResponse,
} from '../../types/admin';

export interface BillingEventsListParams extends ListParams {
  event_type?: string;
  status?: string;
  user_id?: string;
  created_after?: string;
  created_before?: string;
}

export interface SubscriptionsListParams extends ListParams {
  status?: string;
  plan_id?: string;
}

export const billingAdminApi = {
  listEvents(params: BillingEventsListParams = {}) {
    return adminApiClient
      .get<PaginatedResponse<AdminBillingEvent>>('/billing/events', { params })
      .then((r) => r.data);
  },
  getEvent(eventId: string) {
    return adminApiClient
      .get<AdminBillingEvent>(`/billing/events/${eventId}`)
      .then((r) => r.data);
  },
  listSubscriptions(params: SubscriptionsListParams = {}) {
    return adminApiClient
      .get<PaginatedResponse<AdminSubscriptionRow>>('/billing/subscriptions', { params })
      .then((r) => r.data);
  },
  listWorkspaceSubscriptions(params: SubscriptionsListParams = {}) {
    return adminApiClient
      .get<PaginatedResponse<AdminSubscriptionRow>>('/billing/workspace-subscriptions', {
        params,
      })
      .then((r) => r.data);
  },
  summary() {
    return adminApiClient.get<AdminBillingSummary>('/billing/summary').then((r) => r.data);
  },
};
