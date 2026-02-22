import React, { useEffect } from "react";
import { StyleSheet, ViewStyle } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { View } from "react-native";

const AnimatedView = Animated.createAnimatedComponent(View);

/**
 * Umhüllt Header-Buttons (z. B. Zurück, Plus) mit dem iOS-typischen
 * „Glas“-Look: abgerundeter Hintergrund, halbtransparent.
 * variant: "pill" = Kapsel (Zurück), "circle" = Kreis (Icon-Only).
 * pressed: bei true → Animation heller + etwas größer.
 */
export function GlassHeaderButton({
  children,
  style,
  variant = "pill",
  pressed = false,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: "pill" | "circle";
  pressed?: boolean;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(pressed ? 1 : 0, { duration: 120 });
  }, [pressed, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.value * 0.06 }],
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ["rgba(255, 255, 255, 0.28)", "rgba(255, 255, 255, 0.48)"]
    ),
  }));

  return (
    <AnimatedView
      style={[
        styles.glass,
        variant === "circle" ? styles.circle : undefined,
        style,
        animatedStyle,
      ]}
    >
      {children}
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  glass: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    // marginHorizontal: 14,
    backgroundColor: "rgba(255, 255, 255, 0.28)",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  circle: {
    width: 48,
    height: 48,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
});
