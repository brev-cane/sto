import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import COLORS from './components/colors';
import { registerForPushNotificationsAsync, sendDemoNotification } from './components/notifications';
import { usePushNotifications } from './components/usePushNotifications';

export default function HomePage() {
  // usePushNotifications
  const {expoPushToken, notification} = usePushNotifications()

  const data = JSON.stringify(notification, undefined, 2);

  const router = useRouter();

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Token: {expoPushToken?.data ?? ""}</Text>
      <Text style={styles.text}>{data}</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/home')}>
        <Text style={styles.buttonText}>Sign in</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={async () => {
          await sendDemoNotification();
        }}>
        <Text style={styles.buttonText}>Demo</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => Linking.openURL('https://placeholder.com')}>
        <Text style={styles.buttonText}>Donations</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: COLORS.text,
    fontSize: 24,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
