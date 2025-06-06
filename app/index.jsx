import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import COLORS from './components/colors';

export default function HomePage() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.text}>🏠 Welcome to the Home Page!</Text>

      <TouchableOpacity
        style = {styles.button}
        onPress={() => router.push('/home')}>
        <Text style = {styles.buttonText}>Sign in</Text>
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
