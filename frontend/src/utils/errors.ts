import type { AxiosError } from 'axios';

export function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as AxiosError<{ error?: string }>).response;
    if (response?.data?.error) {
      return response.data.error;
    }
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}