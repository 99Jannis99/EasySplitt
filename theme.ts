import { MD3LightTheme } from "react-native-paper";

export const appColors = {
  background: "#fafef7",
  primary: "#202f35",
  accent: "#436772",
} as const;

export const appTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: appColors.primary,
    onPrimary: appColors.background,
    primaryContainer: appColors.accent,
    onPrimaryContainer: appColors.background,
    background: appColors.background,
    surface: appColors.background,
    surfaceVariant: "#e8f0ee",
    outline: "#436772",
    outlineVariant: "#b8c9c7",
    secondaryContainer: appColors.accent,
    onSecondaryContainer: appColors.background,
  },
};
