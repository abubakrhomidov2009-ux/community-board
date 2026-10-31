import { api } from '@/lib/api/axios';
import type { components } from '@/lib/api/schema';

export type ReportBody = components['schemas']['CreateReportDto'];
export const REASONS: ReportBody['reason'][] = ['SPAM', 'SCAM', 'OFFENSIVE', 'OTHER'];

export const reportPost = (postId: string, body: ReportBody) =>
  api.post(`/posts/${postId}/report`, body).then(() => undefined);
