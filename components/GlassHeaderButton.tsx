import React, { useContext, useEffect } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AnimatedView = Animated.createAnimatedComponent(View);

const ENTER_DURATION = 720;
const ENTER_SCALE_START = 1.5;

/** Wird von CustomHeader gesetzt; bei Änderung (z. B. Fokus) startet die Enter-Animation neu. */
export const HeaderEnterTriggerContext = React.createContext<{ enterTrigger: number } | null>(null);

/**
 * Umhüllt Header-Buttons (z. B. Zurück, Plus) mit dem iOS-typischen
 * „Glas“-Look: abgerundeter Hintergrund, halbtransparent.
 * variant: "pill" = Kapsel (Zurück), "circle" = Kreis (Icon-Only).
 * pressed: bei true → Animation heller + etwas größer.
 * Beim Erscheinen / bei Fokus: Einblenden, von leicht vergrößert auf Normalgröße.
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
  const enterProgress = useSharedValue(0);
  const ctx = useContext(HeaderEnterTriggerContext);
  const enterTrigger = ctx?.enterTrigger ?? 0;

  useEffect(() => {
    if (enterTrigger === 0) return;
    enterProgress.value = 0;
    enterProgress.value = withTiming(1, {
      duration: ENTER_DURATION,
      easing: Easing.out(Easing.cubic),
    });
  }, [enterProgress, enterTrigger]);

  useEffect(() => {
    progress.value = withTiming(pressed ? 1 : 0, { duration: 120 });
  }, [pressed, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const enterScale = interpolate(enterProgress.value, [0, 1], [ENTER_SCALE_START, 1]);
    const pressScale = 1 + progress.value * 0.06;
    // Einblenden + „verschwommen → scharf“ durch weiches Opacity
    const opacity = interpolate(enterProgress.value, [0, 1], [0, 1]);
    return {
      opacity,
      transform: [{ scale: enterScale * pressScale }],
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        ["rgba(255, 255, 255, 0.48)", "rgba(255, 255, 255, 0.6)"]
      ),
    };
  });

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
