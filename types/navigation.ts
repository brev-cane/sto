import {
  createNavigationContainerRef,
  useNavigation,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { ParkingLot, Stadium } from "@/types/parking";

export type RootStackParamList = {
  Loading: undefined;
  Main: undefined;
  Video:
    | {
        videoFile?: string;
        videoIds?: string;
        sentAt?: string;
        delaySeconds?: string;
        playAt?: string;
      }
    | undefined;
  Login: undefined;
  Signup: undefined;
  PrivacyPolicy: undefined;
  Profile: undefined;
  ParkingDetail: { parkingLot: ParkingLot };
  StadiumDetail: { stadium: Stadium };
  LocationSearch: undefined;
};

/**
 * Typed replacement for useNavigation(). The usual global
 * ReactNavigation.RootParamList augmentation is blocked here because
 * expo-router (a transitive dependency) declares it as a type alias.
 */
export function useAppNavigation() {
  return useNavigation<NativeStackNavigationProp<RootStackParamList>>();
}

/**
 * Imperative navigation handle for components that live outside the
 * navigator (e.g. the floating takeover mini-player).
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
