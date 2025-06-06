import { ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { Ionicons } from '@expo/vector-icons';
import { Slot, usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import COLORS from './components/colors';

export default function RootLayout() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { name: 'Home', icon: 'home', path: '/' },
    { name: 'Video', icon: 'videocam', path: '/video' },
    { name: 'Settings', icon: 'settings', path: '/settings' },
    { name: 'Admin', icon: 'person', path: '/admin' },
  ];

  return (
    <ClerkProvider tokenCache={tokenCache}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Slot />
        </View>
        <View style={styles.navBar}>
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Pressable
                key={item.path}
                style={styles.navItem}
                onPress={() => router.push(item.path)}
              >
                <Ionicons
                  name={item.icon}
                  size={24}
                  color={isActive ? COLORS.primary : 'gray'}
                />
                <Text
                  style={[
                    styles.label,
                    { color: isActive ? COLORS.primary : 'gray' },
                  ]}
                >
                  {item.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.secondary,
  },
  navItem: {
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    marginTop: 4,
  },
});
