import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import COLORS from './components/colors';
import { registerForPushNotificationsAsync, sendDemoNotification } from './components/notifications';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>🏠 Welcome to the Home Page!</Text>

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
        onPress={() => Linking.openURL('https://yourblogwebsite.com')}>
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
