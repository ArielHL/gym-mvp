import type { GymClass } from './models';

export type RootStackParamList = {
  Landing: undefined;
  Auth: undefined;
  Register: undefined;
  Main: undefined;
  ClassDetails: { gymClass: GymClass };
  BookClass: { classId?: string; className?: string; gymClass?: GymClass };
};

export type MainTabParamList = {
  Home: undefined;
  Classes: undefined;
  Book: undefined;
  Profile: undefined;
};
