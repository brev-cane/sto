import { StyleSheet, Text, View } from 'react-native';
import COLORS from '../components/colors';

export default function SettingsScreen() {
  // const { showAdmin, setShowAdmin } = useAdmin();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚙️ Settings</Text>
      {/* <Text style={styles.text}>Toggle Admin Page:</Text>
      <Switch
        value={showAdmin}
        onValueChange={setShowAdmin}
        trackColor={{ false: '#767577', true: COLORS.primary }}
        thumbColor={showAdmin ? COLORS.primary : '#f4f3f4'}
      /> */}
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
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 10,
  },
});
