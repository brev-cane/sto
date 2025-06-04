import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

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
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 24,
  },
  button: {
    backgroundColor: '#00338D',
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
