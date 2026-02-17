export class NotificationService {
  static async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications');
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  static async showNotification(title: string, options?: NotificationOptions) {
    // Only show if permission is granted
    if (Notification.permission !== 'granted') return;

    // Check if app is in standalone mode (iOS Home Screen)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

    if (isStandalone || document.visibilityState === 'hidden') {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          registration.showNotification(title, {
            icon: '/favicon.svg',
            badge: '/favicon.svg',
            ...options,
          });
        } else {
          new Notification(title, options);
        }
      } catch (err) {
        console.error('Failed to show notification', err);
      }
    }
  }

  static isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  static getPermissionStatus(): NotificationPermission {
    return window.Notification ? Notification.permission : 'denied';
  }
}