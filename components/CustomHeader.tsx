import { getHeaderTitle } from "@react-navigation/elements";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { appTheme } from "../theme";
import { GlassHeaderButton, HeaderEnterTriggerContext } from "./GlassHeaderButton";

const HEADER_BAR_HEIGHT = 64;
/** Titel gilt als gekürzt, wenn die volle Titelbreite (ohne Constraint) größer als maxTitleWidth ist. */
const TRUNCATE_EPSILON = 1;

type HeaderProps = {
  options: { title?: string; headerRight?: (props: unknown) => React.ReactNode };
  route: { name: string };
  back?: { title?: string } | null;
};

export function CustomHeader({ options, route, back }: HeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const title = getHeaderTitle(options, route.name);
  const [backPressed, setBackPressed] = useState(false);
  const [barWidth, setBarWidth] = useState(0);
  const [leftWidth, setLeftWidth] = useState(0);
  const [rightWidth, setRightWidth] = useState(0);
  const [isTitleTruncated, setIsTitleTruncated] = useState(false);
  const [fullTitleWidth, setFullTitleWidth] = useState<number | null>(null);

  const GAP = 12;
  const BAR_PADDING = 12; // paddingHorizontal der Bar
  // Bar-Inhalt: links bei BAR_PADDING, linke View endet bei BAR_PADDING+leftWidth.
  // 12px Abstand zum Titel: Titel links >= BAR_PADDING+leftWidth+GAP = 24+leftWidth.
  // Titel zentriert => linke Kante = barWidth/2 - titleWidth/2 >= 24+leftWidth => titleWidth <= barWidth - 48 - 2*leftWidth.
  // Rechts analog: titleWidth <= barWidth - 48 - 2*rightWidth.
  const maxTitleWidth =
    barWidth > 0
      ? Math.max(
          0,
          Math.min(
            barWidth - 2 * BAR_PADDING - 2 * GAP - 2 * leftWidth,
            barWidth - 2 * BAR_PADDING - 2 * GAP - 2 * rightWidth
          )
        )
      : undefined;

  const onBarLayout = (e: LayoutChangeEvent) =>
    setBarWidth(e.nativeEvent.layout.width);
  const onLeftLayout = (e: LayoutChangeEvent) =>
    setLeftWidth(e.nativeEvent.layout.width);
  const onRightLayout = (e: LayoutChangeEvent) =>
    setRightWidth(e.nativeEvent.layout.width);

  const showBackLabel = back?.title && !isTitleTruncated;

  // Volle Titelbreite vs. verfügbarer Platz: wenn voller Titel nicht passt → Back-Button ohne Text
  useEffect(() => {
    if (maxTitleWidth != null && fullTitleWidth != null && fullTitleWidth > maxTitleWidth + TRUNCATE_EPSILON) {
      setIsTitleTruncated(true);
    }
  }, [maxTitleWidth, fullTitleWidth]);

  // Bei neuem Screen (neuer Titel) zurücksetzen und Vollbreite neu messen
  useEffect(() => {
    setIsTitleTruncated(false);
    setFullTitleWidth(null);
  }, [title]);

  const [enterTrigger, setEnterTrigger] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setEnterTrigger((t) => t + 1);
    }, [])
  );

  return (
    <HeaderEnterTriggerContext.Provider value={{ enterTrigger }}>
    <View style={[styles.outer, { paddingTop: insets.top }]}>
      <View style={styles.bar} onLayout={onBarLayout}>
        <View style={styles.left} onLayout={onLeftLayout}>
          {back && Platform.OS === "android" ? (
            <GlassHeaderButton
              variant={showBackLabel ? "pill" : "circle"}
              pressed={backPressed}
            >
              <Pressable
                onPress={() => router.back()}
                onPressIn={() => setBackPressed(true)}
                onPressOut={() => setBackPressed(false)}
                style={headerBackPressable}
                android_ripple={null}
              >
                <Icon source="chevron-left" size={26} color="#000000" />
                {showBackLabel ? (
                  <Text style={styles.headerBackLabel}>{back.title}</Text>
                ) : null}
              </Pressable>
            </GlassHeaderButton>
          ) : back ? (
            <Pressable onPress={() => router.back()} style={headerBackPressable} android_ripple={null}>
              <Icon source="chevron-left" size={26} color={appTheme.colors.onPrimaryContainer} />
              {showBackLabel ? (
                <Text style={[styles.headerBackLabel, { color: appTheme.colors.onPrimaryContainer }]}>
                  {back.title}
                </Text>
              ) : null}
            </Pressable>
          ) : null}
        </View>
        <View style={styles.right} onLayout={onRightLayout}>
          {typeof options.headerRight === "function" ? options.headerRight({}) : null}
        </View>
        {/* Versteckter Text: misst die volle Breite des Titels ohne maxWidth */}
        <View style={styles.hiddenTitleWrap} pointerEvents="none">
          <Text
            style={[styles.title, styles.hiddenTitle]}
            onTextLayout={(e) => {
              const w = e.nativeEvent.lines[0]?.width;
              if (typeof w === "number") setFullTitleWidth(w);
            }}
          >
            {title}
          </Text>
        </View>
        <View style={styles.titleCenter} pointerEvents="none">
          <View
            style={
              maxTitleWidth != null
                ? [styles.titleClip, { maxWidth: maxTitleWidth }]
                : undefined
            }
          >
            <Text
              style={[styles.title, { color: appTheme.colors.onPrimaryContainer }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {title}
            </Text>
          </View>
        </View>
      </View>
    </View>
    </HeaderEnterTriggerContext.Provider>
  );
}

const headerBackPressable = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  alignSelf: "stretch" as const,
  justifyContent: "center" as const,
  paddingVertical: 4,
  paddingHorizontal: 4,
};

const styles = StyleSheet.create({
  outer: {
    backgroundColor: appTheme.colors.primaryContainer,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: HEADER_BAR_HEIGHT,
    paddingHorizontal: 12,
  },
  left: { alignItems: "flex-start" },
  right: { alignItems: "flex-end" },
  titleCenter: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  titleClip: {
    overflow: "hidden",
    alignItems: "center",
  },
  title: { fontSize: 17, fontWeight: "600" },
  headerBackLabel: { fontSize: 17, marginLeft: 2, color: "#000000" },
  hiddenTitleWrap: {
    position: "absolute",
    left: -10000,
    opacity: 0,
    pointerEvents: "none",
  },
  hiddenTitle: { color: "transparent" },
});
