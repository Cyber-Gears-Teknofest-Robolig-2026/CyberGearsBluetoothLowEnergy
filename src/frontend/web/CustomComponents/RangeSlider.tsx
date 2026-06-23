import { useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';

// Tek bir ray üzerinde iki tutamak (min/max) taşıyan aralık slider'ı.
// min < max korunur (minGap). Web sürümü CustomSlider gibi PanResponder kullanır.
type Props = {
  minValue: number;
  maxValue: number;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  /** İki tutamak arasındaki en küçük fark (min < max için en az 1). */
  minGap?: number;
  trackThickness?: number;
  thumbSize?: number;
  trackColor?: string;
  fillColor?: string;
  thumbColor?: string;
  thumbBorderColor?: string;
  thumbBorderWidth?: number;
  onChange: (min: number, max: number) => void;
  style?: StyleProp<ViewStyle>;
};

export default function RangeSlider({
  minValue,
  maxValue,
  minimumValue = 0,
  maximumValue = 180,
  step = 1,
  minGap = 1,
  trackThickness = 7,
  thumbSize = 20,
  trackColor = '#E2E8F0',
  fillColor = '#0A84FF',
  thumbColor = '#0A84FF',
  thumbBorderColor = 'transparent',
  thumbBorderWidth = 0,
  onChange,
  style,
}: Props) {
  const [length, setLength] = useState(0);
  const lengthRef = useRef(0);
  const startCoordRef = useRef(0);
  const activeThumbRef = useRef<'min' | 'max'>('min');

  const propsRef = useRef({ minValue, maxValue, minimumValue, maximumValue, step, minGap, onChange });
  propsRef.current = { minValue, maxValue, minimumValue, maximumValue, step, minGap, onChange };

  const onLayout = (e: LayoutChangeEvent) => {
    const measured = e.nativeEvent.layout.width;
    if (measured > 0 && measured !== lengthRef.current) {
      lengthRef.current = measured;
      setLength(measured);
    }
  };

  const valueFromCoord = (coord: number) => {
    const len = lengthRef.current;
    const p = propsRef.current;
    if (len <= 0) return p.minimumValue;
    const clampedCoord = Math.max(0, Math.min(len, coord));
    const ratio = clampedCoord / len;
    const range = p.maximumValue - p.minimumValue;
    const raw = p.minimumValue + ratio * range;
    const stepped = p.step > 0 ? Math.round(raw / p.step) * p.step : raw;
    return Math.max(p.minimumValue, Math.min(p.maximumValue, stepped));
  };

  const pickThumb = (v: number): 'min' | 'max' => {
    const p = propsRef.current;
    if (v <= p.minValue) return 'min';
    if (v >= p.maxValue) return 'max';
    return Math.abs(v - p.minValue) <= Math.abs(v - p.maxValue) ? 'min' : 'max';
  };

  const applyValue = (v: number) => {
    const p = propsRef.current;
    if (activeThumbRef.current === 'min') {
      const nv = Math.max(p.minimumValue, Math.min(v, p.maxValue - p.minGap));
      p.onChange(nv, p.maxValue);
    } else {
      const nv = Math.min(p.maximumValue, Math.max(v, p.minValue + p.minGap));
      p.onChange(p.minValue, nv);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        (e as any)?.preventDefault?.();
        const coord = e.nativeEvent.locationX;
        startCoordRef.current = coord;
        const v = valueFromCoord(coord);
        activeThumbRef.current = pickThumb(v);
        applyValue(v);
      },
      onPanResponderMove: (_e, g) => {
        applyValue(valueFromCoord(startCoordRef.current + g.dx));
      },
      onPanResponderRelease: (e) => {
        (e as any)?.preventDefault?.();
      },
      onPanResponderTerminate: (e) => {
        (e as any)?.preventDefault?.();
      },
    }),
  ).current;

  const range = maximumValue - minimumValue;
  const ratioMin = range > 0 ? (minValue - minimumValue) / range : 0;
  const ratioMax = range > 0 ? (maxValue - minimumValue) / range : 0;
  const clampedRatioMin = Math.max(0, Math.min(1, ratioMin));
  const clampedRatioMax = Math.max(0, Math.min(1, ratioMax));

  const crossSize = Math.max(trackThickness, thumbSize);
  const usableLength = Math.max(0, length - thumbSize);
  const thumbOffsetMin = clampedRatioMin * usableLength;
  const thumbOffsetMax = clampedRatioMax * usableLength;
  const fillLeft = thumbOffsetMin + thumbSize / 2;
  const fillWidth = Math.max(0, thumbOffsetMax - thumbOffsetMin);

  const trackCrossOffset = (crossSize - trackThickness) / 2;
  const thumbCrossOffset = (crossSize - thumbSize) / 2;

  return (
    <View
      onLayout={onLayout}
      style={[{ width: '100%', height: crossSize }, style]}
      {...panResponder.panHandlers}
    >
      <View
        style={{ pointerEvents: 'none',
          position: 'absolute',
          top: trackCrossOffset,
          left: 0,
          width: '100%',
          height: trackThickness,
          backgroundColor: trackColor,
          borderRadius: trackThickness / 2,
        }}
      />
      <View
        style={{ pointerEvents: 'none',
          position: 'absolute',
          top: trackCrossOffset,
          left: fillLeft,
          width: fillWidth,
          height: trackThickness,
          backgroundColor: fillColor,
          borderRadius: trackThickness / 2,
        }}
      />
      <View
        style={{ pointerEvents: 'none',
          position: 'absolute',
          top: thumbCrossOffset,
          left: thumbOffsetMin,
          width: thumbSize,
          height: thumbSize,
          borderRadius: thumbSize / 2,
          backgroundColor: thumbColor,
          borderWidth: thumbBorderWidth,
          borderColor: thumbBorderColor,
        }}
      />
      <View
        style={{ pointerEvents: 'none',
          position: 'absolute',
          top: thumbCrossOffset,
          left: thumbOffsetMax,
          width: thumbSize,
          height: thumbSize,
          borderRadius: thumbSize / 2,
          backgroundColor: thumbColor,
          borderWidth: thumbBorderWidth,
          borderColor: thumbBorderColor,
        }}
      />
    </View>
  );
}
