import { API_URL } from '../constants';

type ApiErrorBody = {
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

export function formatApiError(error: unknown): string {
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const ax = error as {
      isAxiosError: boolean;
      message?: string;
      response?: { status?: number; data?: ApiErrorBody };
      code?: string;
    };

    if (ax.code === 'ECONNABORTED') {
      return 'Request timed out. Check your connection and try again.';
    }

    if (ax.code === 'ERR_NETWORK' || ax.message === 'Network Error') {
      return `Cannot reach the server at ${API_URL}. Check your internet connection.`;
    }

    const data = ax.response?.data;
    if (data?.errors) {
      const firstField = Object.entries(data.errors).find(([, msgs]) => msgs?.length);
      if (firstField) {
        const [field, msgs] = firstField;
        const detail = msgs?.[0];
        if (detail) return `${field}: ${detail}`;
      }
    }

    if (data?.message) return data.message;
  }

  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}
