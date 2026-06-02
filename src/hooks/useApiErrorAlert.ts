// src/hooks/useApiErrorAlert.ts
import { Alert } from 'react-native';
import { ApiError } from '@/lib/api';

export const showApiError = (err: unknown, fallback = 'Something went wrong'): void => {
  let title = 'Error';
  let message = fallback;

  if (err instanceof ApiError) {
    message = err.message || fallback;
    if (err.status === 0) title = 'Network';
    else if (err.status === 401) title = 'Sign in required';
    else if (err.status === 429) title = 'Too many attempts';
  } else if (err instanceof Error) {
    message = err.message;
  }

  Alert.alert(title, message);
};
