import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { EntityPath } from '@app/abstract/lib';

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  AboutApp: undefined;
  ChangeLanguage: undefined;
  ForgotPassword: undefined;
  Applets: undefined;
  AppletDetails: { appletId: string; title: string };
  Settings: undefined;
  ChangePassword: undefined;
  InProgressActivity: EntityPath;
  ActivityPassedScreen: undefined;
  ApplicationLogs: undefined;
  NetworkScreen: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type AppletDetailsParamList = {
  ActivityList: { appletId: string };
  Data: { appletId: string };
  About: { appletId: string };
};

export type ScreenRoute = keyof RootStackParamList;
export type ScreenParams = RootStackParamList[ScreenRoute];

export type AppletDetailsScreenProps<T extends keyof AppletDetailsParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<AppletDetailsParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
