import { Stack } from 'expo-router/stack'

export default function Layout() {
  return <Stack 
            screenOptions = {{
                headerShown: true,
                title: "Sign in",
                headerStyle: {
                    backgroundColor: '#C60C30',
                  },
                  headerTintColor: '#fff',
                  headerTitleStyle: {
                    fontSize: 20,
                    fontWeight: 'bold',
                  },
                  contentStyle: {
                    paddingHorizontal: 10,
                    paddingTop: 10,
                    backgroundColor: '#fff',
                  },
            }}
            />
}
