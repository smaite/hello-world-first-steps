import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export interface NotificationPayload {
  title: string;
  body: string;
  id?: number;
  data?: Record<string, unknown>;
}

class NotificationService {
  private isNative = Capacitor.isNativePlatform();
  private initialized = false;

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      if (this.isNative) {
        // Request permission for local notifications
        const permission = await LocalNotifications.requestPermissions();
        if (permission.display === 'granted') {
          this.initialized = true;
          return true;
        }
      } else {
        // Web notifications
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            this.initialized = true;
            return true;
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }

    return false;
  }

  async sendNotification(payload: NotificationPayload): Promise<void> {
    const id = payload.id || Date.now();

    try {
      if (this.isNative) {
        await LocalNotifications.schedule({
          notifications: [
            {
              id,
              title: payload.title,
              body: payload.body,
              schedule: { at: new Date(Date.now() + 100) },
              extra: payload.data,
            },
          ],
        });
      } else if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(payload.title, {
          body: payload.body,
          icon: '/favicon.ico',
          data: payload.data,
        });
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  async scheduleNotification(
    payload: NotificationPayload,
    scheduledTime: Date
  ): Promise<void> {
    const id = payload.id || Date.now();

    try {
      if (this.isNative) {
        await LocalNotifications.schedule({
          notifications: [
            {
              id,
              title: payload.title,
              body: payload.body,
              schedule: { at: scheduledTime },
              extra: payload.data,
            },
          ],
        });
      }
    } catch (error) {
      console.error('Failed to schedule notification:', error);
    }
  }

  // Credit limit alert
  async sendCreditLimitAlert(
    customerName: string,
    currentBalance: number,
    creditLimit: number
  ): Promise<void> {
    const percentUsed = creditLimit > 0 ? (currentBalance / creditLimit) * 100 : 0;

    if (percentUsed >= 90) {
      await this.sendNotification({
        title: '⚠️ Credit Limit Warning',
        body: `${customerName} has used ${percentUsed.toFixed(0)}% of their NPR ${creditLimit.toLocaleString()} credit limit`,
        data: { type: 'credit_limit_warning', customerName },
      });
    } else if (percentUsed >= 100) {
      await this.sendNotification({
        title: '🚨 Credit Limit Exceeded',
        body: `${customerName} has exceeded their credit limit! Balance: NPR ${currentBalance.toLocaleString()}`,
        data: { type: 'credit_limit_exceeded', customerName },
      });
    }
  }

  // Payment reminder
  async sendPaymentReminder(
    customerName: string,
    outstandingBalance: number
  ): Promise<void> {
    await this.sendNotification({
      title: '💰 Payment Reminder',
      body: `${customerName} has outstanding credit of NPR ${outstandingBalance.toLocaleString()}`,
      data: { type: 'payment_reminder', customerName },
    });
  }

  // Daily reminder for cash tracker
  async scheduleDailyReminder(hour: number = 18): Promise<void> {
    const now = new Date();
    const scheduledTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hour,
      0,
      0
    );

    // If time has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    await this.scheduleNotification(
      {
        id: 9999,
        title: '📊 Daily Cash Report',
        body: 'Don\'t forget to close your daily cash tracker and submit your report',
      },
      scheduledTime
    );
  }

  async cancelNotification(id: number): Promise<void> {
    if (this.isNative) {
      try {
        await LocalNotifications.cancel({ notifications: [{ id }] });
      } catch (error) {
        console.error('Failed to cancel notification:', error);
      }
    }
  }

  async cancelAllNotifications(): Promise<void> {
    if (this.isNative) {
      try {
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
          await LocalNotifications.cancel({ notifications: pending.notifications });
        }
      } catch (error) {
        console.error('Failed to cancel notifications:', error);
      }
    }
  }
}

export const notificationService = new NotificationService();
