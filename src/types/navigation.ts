import type { GymClass } from './models';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Register: undefined;
  Main: undefined;
  ClassDetails: { gymClass: GymClass };
};

export type MainTabParamList = {
  Home: undefined;
  Classes: undefined;
  Bookings: undefined;
  Admin: undefined;
  Profile: undefined;
};
