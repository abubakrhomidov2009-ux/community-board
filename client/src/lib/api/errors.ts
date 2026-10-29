import { isAxiosError } from 'axios';

/** The error format of the backend: a stable code, never UI text (docs/02-SPEC.md 4.1). */
export interface ApiErrorDetail {
  field: string;
  code: string;
}

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    public readonly details: ApiErrorDetail[] | null = null,
  ) {
    super(errorCode);
    this.name = 'ApiError';
  }
}

/** Turns anything that went wrong with a request into an ApiError the UI can map to a translated text. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (isAxiosError(error)) {
    const data = error.response?.data as
      { statusCode?: number; errorCode?: string; details?: ApiErrorDetail[] | null } | undefined;
    if (data?.errorCode) {
      return new ApiError(
        data.statusCode ?? error.response?.status ?? 0,
        data.errorCode,
        data.details ?? null,
      );
    }
    // No answer from the server at all (offline, server down).
    if (!error.response) return new ApiError(0, 'NETWORK_ERROR');
    return new ApiError(error.response.status, 'UNKNOWN');
  }
  return new ApiError(0, 'UNKNOWN');
}
