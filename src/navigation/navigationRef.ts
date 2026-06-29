import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

export function navigate(name: string, params?: object, _tries = 0) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(CommonActions.navigate(name, params));
  } else if (_tries < 25) {
    // ~25 * 200ms = up to 5s for the app to finish booting
    setTimeout(() => navigate(name, params, _tries + 1), 200);
  }
}