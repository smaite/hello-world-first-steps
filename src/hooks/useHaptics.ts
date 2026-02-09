import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export const useHaptics = () => {
  const isNative = Capacitor.isNativePlatform();

  const lightTap = async () => {
    if (isNative) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (e) {
        console.log('Haptics not available');
      }
    }
  };

  const mediumTap = async () => {
    if (isNative) {
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch (e) {
        console.log('Haptics not available');
      }
    }
  };

  const heavyTap = async () => {
    if (isNative) {
      try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } catch (e) {
        console.log('Haptics not available');
      }
    }
  };

  const vibrate = async () => {
    if (isNative) {
      try {
        await Haptics.vibrate();
      } catch (e) {
        console.log('Haptics not available');
      }
    }
  };

  return { lightTap, mediumTap, heavyTap, vibrate };
};
