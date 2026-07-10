import { API_URL } from '../constants';

export function formatApiError(error: unknown): string {
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const ax = error as {
      isAxiosError: boolean;
      message?: string;
      response?: { data?: { message?: string } };
      code?: string;
    };
    if (ax.code === 'ERR_NETWORK' || ax.message === 'Network Error') {
      return `Cannot reach the server at ${API_URL}. On a phone, use your PC's LAN IP in mobile/.env (not localhost), same Wi‑Fi, backend running on :4000.`;
    }
    return ax.response?.data?.message ?? ax.message ?? 'Request failed';
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}
