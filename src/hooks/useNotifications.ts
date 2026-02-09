import { useEffect, useState } from 'react';
import { notificationService } from '@/services/NotificationService';
import { useToast } from '@/hooks/use-toast';

export const useNotifications = () => {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    try {
      const granted = await notificationService.initialize();
      setPermissionGranted(granted);
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestPermission = async () => {
    const granted = await notificationService.initialize();
    setPermissionGranted(granted);
    
    if (granted) {
      toast({
        title: 'Notifications Enabled',
        description: 'You will now receive credit alerts and reminders',
      });
    } else {
      toast({
        title: 'Permission Denied',
        description: 'Please enable notifications in your device settings',
        variant: 'destructive',
      });
    }
    
    return granted;
  };

  const sendCreditLimitAlert = async (
    customerName: string,
    currentBalance: number,
    creditLimit: number
  ) => {
    if (!permissionGranted) return;
    await notificationService.sendCreditLimitAlert(customerName, currentBalance, creditLimit);
  };

  const sendPaymentReminder = async (
    customerName: string,
    outstandingBalance: number
  ) => {
    if (!permissionGranted) return;
    await notificationService.sendPaymentReminder(customerName, outstandingBalance);
  };

  const scheduleDailyReminder = async (hour: number = 18) => {
    if (!permissionGranted) return;
    await notificationService.scheduleDailyReminder(hour);
    toast({
      title: 'Reminder Set',
      description: `Daily reminder scheduled for ${hour}:00`,
    });
  };

  return {
    permissionGranted,
    loading,
    requestPermission,
    sendCreditLimitAlert,
    sendPaymentReminder,
    scheduleDailyReminder,
  };
};
