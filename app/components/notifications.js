import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

let accessedViaNotification = false;

export function wasAccessedViaNotification() {
  return accessedViaNotification;
}

export async function registerForPushNotificationsAsync() {
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
  } else {
    alert('Must use physical device for Push Notifications');
  }

  // Configure how the notifications are shown when received
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  // Listen to notification taps
  Notifications.addNotificationResponseReceivedListener(response => {
    accessedViaNotification = true;
  });
}

export async function sendDemoNotification() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🎥 Demo Video Ready',
      body: 'Tap to watch the demo video!',
      data: { navigateTo: '/video' },
    },
    trigger: { seconds: 1 },
  });
}
