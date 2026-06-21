import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";

/**
 * Daha kalın/düzgün görünen özel aç-kapa anahtarı (web).
 * react-native-web'in varsayılan <Switch> bileşeni ince durduğundan, raydan
 * (track) belirgin, başparmağı (thumb) yumuşak kayan bir pill toggle kullanılır.
 * Renk ve konum geçişleri Animated ile yumuşatılır.
 */
type Props = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  onColor?: string;
  offColor?: string;
  disabled?: boolean;
};

const TRACK_WIDTH = 52;
const TRACK_HEIGHT = 30;
const THUMB_SIZE = 24;
const PADDING = (TRACK_HEIGHT - THUMB_SIZE) / 2;

// react-native-web'de shadow* prop'ları kullanımdan kalktığı için gölgeyi
// boxShadow ile veriyoruz (deprecation uyarısını önler).
const thumbShadow = { boxShadow: "0px 1px 3px rgba(15, 23, 42, 0.25)" } as any;

export default function ToggleSwitch({
  value,
  onValueChange,
  onColor = "#0A84FF",
  offColor = "#CBD5E1",
  disabled = false,
}: Props) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [PADDING, TRACK_WIDTH - THUMB_SIZE - PADDING],
  });

  const backgroundColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [offColor, onColor],
  });

  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? "default" : "pointer" } as any}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
    >
      <Animated.View style={[styles.track, { backgroundColor }]}>
        <Animated.View
          style={[styles.thumb, thumbShadow, { transform: [{ translateX }] }]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    justifyContent: "center",
  },
  thumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: "#FFFFFF",
  },
});
