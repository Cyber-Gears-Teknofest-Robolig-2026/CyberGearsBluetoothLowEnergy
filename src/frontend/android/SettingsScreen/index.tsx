import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
// CustomSlider artık native gesture (GestureDetector) kullanıyor; bu yüzden bir
// GestureHandlerRootView'ın altında olmalı. Sadece bu ekrana kapsadık (SafeAreaView'ın
// altında) ki diğer ekranların safe area'sı etkilenmesin.
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import CustomSlider from '../CustomComponents/CustomSlider';
import RangeSlider from '../CustomComponents/RangeSlider';
import ToggleSwitch from '../CustomComponents/ToggleSwitch';
import styles from './styles';
import {
  AppNavigationProp,
  AppSettings,
  SendValuesHeaders,
  clampPwmResolution,
  defaultSettings,
  pwmMaxFromResolution,
  useSettingsStore,
} from '../constants';

// Form için number alanları string olarak tutulur ki düzenlerken boş bırakılabilsin.
type DraftSettings = {
  sendValuesHeaders: SendValuesHeaders;
  allSendsValues: AppSettings['allSendsValues'];
  motorControlSeparateDefault: boolean;
  motorPwmResolutionDefault: string;
  motorSpeedDefault: string;
  motorSpeedStepDefault: string;
  rightMotorPwmResolutionDefault: string;
  rightMotorSpeedDefault: string;
  rightMotorSpeedStepDefault: string;
  leftMotorPwmResolutionDefault: string;
  leftMotorSpeedDefault: string;
  leftMotorSpeedStepDefault: string;
  armsAre360Default: boolean[];
  armValuesDefault: { deg180: string; deg360: string }[];
  armAngleLimitsDefault: { min: string; max: string }[];
  armValuesStepDefault: string;
  ziplineAnglesDefault: {
    front: { open: string; close: string };
    back: { open: string; close: string };
  };
};

// Motor hız bölümlerinin (ortak / sağ / sol) draft alan anahtarları.
type ResKey = 'motorPwmResolutionDefault' | 'rightMotorPwmResolutionDefault' | 'leftMotorPwmResolutionDefault';
type SpeedKey = 'motorSpeedDefault' | 'rightMotorSpeedDefault' | 'leftMotorSpeedDefault';
type StepKey = 'motorSpeedStepDefault' | 'rightMotorSpeedStepDefault' | 'leftMotorSpeedStepDefault';

const toDraft = (s: AppSettings): DraftSettings => ({
  sendValuesHeaders: {
    motor: { ...s.sendValuesHeaders.motor },
    robot_arm: { ...s.sendValuesHeaders.robot_arm },
    zipline: { ...s.sendValuesHeaders.zipline },
  },
  allSendsValues: { ...s.allSendsValues },
  motorControlSeparateDefault: s.motorControlSeparateDefault,
  motorPwmResolutionDefault: String(s.motorPwmResolutionDefault),
  motorSpeedDefault: String(s.motorSpeedDefault),
  motorSpeedStepDefault: String(s.motorSpeedStepDefault),
  rightMotorPwmResolutionDefault: String(s.rightMotorPwmResolutionDefault),
  rightMotorSpeedDefault: String(s.rightMotorSpeedDefault),
  rightMotorSpeedStepDefault: String(s.rightMotorSpeedStepDefault),
  leftMotorPwmResolutionDefault: String(s.leftMotorPwmResolutionDefault),
  leftMotorSpeedDefault: String(s.leftMotorSpeedDefault),
  leftMotorSpeedStepDefault: String(s.leftMotorSpeedStepDefault),
  armsAre360Default: [...s.armsAre360Default],
  armValuesDefault: s.armValuesDefault.map((v) => ({ deg180: String(v.deg180), deg360: String(v.deg360) })),
  armAngleLimitsDefault: s.armAngleLimitsDefault.map((l) => ({ min: String(l.min), max: String(l.max) })),
  armValuesStepDefault: String(s.armValuesStepDefault),
  ziplineAnglesDefault: {
    front: {
      open: String(s.ziplineAnglesDefault.front.open),
      close: String(s.ziplineAnglesDefault.front.close),
    },
    back: {
      open: String(s.ziplineAnglesDefault.back.open),
      close: String(s.ziplineAnglesDefault.back.close),
    },
  },
});

const num = (value: string): number => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

// Robot kol kartlarındaki renklerle aynı (araç kontrol ekranıyla uyum için).
const ARM_COLORS = ['#6366F1', '#0EA5E9', '#14B8A6', '#22C55E', '#F59E0B', '#EF4444'];

// Aralık slider tutamakları: kolun renginin daha koyu tonu — aynı renk ailesinden
// ama dolu kısımdan belirgin şekilde farklı hissettirir.
const darkenHex = (hex: string, factor = 0.6): string => {
  const m = hex.replace('#', '');
  const ch = (i: number) =>
    Math.round(parseInt(m.slice(i, i + 2), 16) * factor).toString(16).padStart(2, '0');
  return `#${ch(0)}${ch(2)}${ch(4)}`;
};
const ARM_THUMB_COLORS = ARM_COLORS.map((c) => darkenHex(c));

// Zipline açık/kapalı slider renkleri (ön ve arka aynı renkleri paylaşır).
// ARM_COLORS paletiyle bilerek çakışmayan renkler seçildi.
const ZIPLINE_OPEN_COLOR = '#DB2777';
const ZIPLINE_CLOSE_COLOR = '#475569';

const fromDraft = (d: DraftSettings): AppSettings => ({
  sendValuesHeaders: d.sendValuesHeaders,
  allSendsValues: d.allSendsValues,
  motorControlSeparateDefault: d.motorControlSeparateDefault,
  motorPwmResolutionDefault: clampPwmResolution(num(d.motorPwmResolutionDefault)),
  motorSpeedDefault: num(d.motorSpeedDefault),
  motorSpeedStepDefault: num(d.motorSpeedStepDefault),
  rightMotorPwmResolutionDefault: clampPwmResolution(num(d.rightMotorPwmResolutionDefault)),
  rightMotorSpeedDefault: num(d.rightMotorSpeedDefault),
  rightMotorSpeedStepDefault: num(d.rightMotorSpeedStepDefault),
  leftMotorPwmResolutionDefault: clampPwmResolution(num(d.leftMotorPwmResolutionDefault)),
  leftMotorSpeedDefault: num(d.leftMotorSpeedDefault),
  leftMotorSpeedStepDefault: num(d.leftMotorSpeedStepDefault),
  armsAre360Default: d.armsAre360Default,
  // Varsayılan açıyı (deg180) o kolun min/max sınırına kıstırarak kaydet.
  armValuesDefault: d.armValuesDefault.map((v, i) => {
    const lo = Math.min(num(d.armAngleLimitsDefault[i].min), num(d.armAngleLimitsDefault[i].max));
    const hi = Math.max(num(d.armAngleLimitsDefault[i].min), num(d.armAngleLimitsDefault[i].max));
    return { deg180: clamp(num(v.deg180), lo, hi), deg360: num(v.deg360) };
  }),
  armAngleLimitsDefault: d.armAngleLimitsDefault.map((l) => {
    let mn = clamp(num(l.min), 0, 180);
    let mx = clamp(num(l.max), 0, 180);
    if (mn > mx) { const t = mn; mn = mx; mx = t; }
    if (mn === mx) { if (mx < 180) mx = mn + 1; else mn = mx - 1; }
    return { min: mn, max: mx };
  }),
  armValuesStepDefault: num(d.armValuesStepDefault),
  ziplineAnglesDefault: {
    front: { open: num(d.ziplineAnglesDefault.front.open), close: num(d.ziplineAnglesDefault.front.close) },
    back: { open: num(d.ziplineAnglesDefault.back.open), close: num(d.ziplineAnglesDefault.back.close) },
  },
});

type CardProps = {
  title: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  children: React.ReactNode;
};

const Card = ({ title, icon, iconColor, iconBg, children }: CardProps) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={[styles.cardIconBox, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const TextRow = ({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
}) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <TextInput
      style={styles.textInput}
      value={value}
      onChangeText={onChangeText}
      autoCapitalize="characters"
      autoCorrect={false}
      maxLength={8}
      selectTextOnFocus
    />
  </View>
);

const NumberRow = ({
  label,
  value,
  onChangeText,
  maxLength = 4,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  maxLength?: number;
}) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <TextInput
      style={styles.numberInput}
      value={value}
      onChangeText={(text) => onChangeText(text.replace(/[^0-9]/g, ''))}
      keyboardType="numeric"
      maxLength={maxLength}
      selectTextOnFocus
    />
  </View>
);

const SwitchRow = ({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <ToggleSwitch value={value} onValueChange={onValueChange} />
  </View>
);

// Araç kontrol ekranındaki "Ortak / Ayrı ayrı" anahtarının ayarlardaki eşi:
// duruma göre renklenen etiket + özel toggle.
const MotorModeRow = ({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: value ? '#0A84FF' : '#64748B' }}>
        {value ? 'Ayrı ayrı' : 'Ortak'}
      </Text>
      <ToggleSwitch value={value} onValueChange={onValueChange} />
    </View>
  </View>
);

// Araç kontrol ekranındaki slider mantığı: −/+ butonu + slider + senkron sayı girişi.
// Değer string tutulur (alan düzenlenirken boş bırakılabilsin); slider için sayıya çevrilir.
const SliderField = ({
  label,
  value,
  min,
  max,
  step = 5,
  color = '#0A84FF',
  maxLength = 3,
  onChange,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step?: number;
  color?: string;
  maxLength?: number;
  onChange: (text: string) => void;
}) => {
  const numeric = clamp(num(value), min, max);

  return (
    <View style={styles.sliderField}>
      <View style={styles.sliderTopRow}>
        <Text style={styles.rowLabel}>{label}</Text>
        <TextInput
          style={styles.numberInput}
          value={value}
          onChangeText={(text) => onChange(text.replace(/[^0-9]/g, ''))}
          keyboardType="numeric"
          maxLength={maxLength}
          selectTextOnFocus
        />
      </View>

      <View style={styles.sliderControlRow}>
        <TouchableOpacity
          style={[styles.sliderStepBtn, { backgroundColor: color }]}
          activeOpacity={0.8}
          onPress={() => onChange(String(clamp(numeric - step, min, max)))}
        >
          <MaterialCommunityIcons name="minus" size={18} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.sliderBox}>
          <CustomSlider
            value={numeric}
            minimumValue={min}
            maximumValue={max}
            step={1}
            onValueChange={(v) => onChange(String(v))}
            trackThickness={7}
            thumbSize={20}
            trackColor="#E2E8F0"
            fillColor={color}
            thumbColor={color}
          />
        </View>

        <TouchableOpacity
          style={[styles.sliderStepBtn, { backgroundColor: color }]}
          activeOpacity={0.8}
          onPress={() => onChange(String(clamp(numeric + step, min, max)))}
        >
          <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function SettingsScreen() {
  const navigation = useNavigation<AppNavigationProp>();

  const setSettings = useSettingsStore((state) => state.setSettings);
  const resetSettings = useSettingsStore((state) => state.resetSettings);

  // Store hydrate edilmiş halde (App.tsx gate'liyor) → mevcut kayıtlı değerlerle başla.
  const [draft, setDraft] = useState<DraftSettings>(() => toDraft(useSettingsStore.getState()));

  const setMotorHeader = (key: keyof SendValuesHeaders['motor'], value: string) =>
    setDraft((d) => ({
      ...d,
      sendValuesHeaders: { ...d.sendValuesHeaders, motor: { ...d.sendValuesHeaders.motor, [key]: value } },
    }));

  const setArmHeader = (key: keyof SendValuesHeaders['robot_arm'], value: string) =>
    setDraft((d) => ({
      ...d,
      sendValuesHeaders: { ...d.sendValuesHeaders, robot_arm: { ...d.sendValuesHeaders.robot_arm, [key]: value } },
    }));

  const setZiplineHeader = (key: keyof SendValuesHeaders['zipline'], value: string) =>
    setDraft((d) => ({
      ...d,
      sendValuesHeaders: { ...d.sendValuesHeaders, zipline: { ...d.sendValuesHeaders.zipline, [key]: value } },
    }));

  const setAllSends = (key: keyof DraftSettings['allSendsValues'], value: boolean) =>
    setDraft((d) => ({ ...d, allSendsValues: { ...d.allSendsValues, [key]: value } }));

  const setArm360 = (index: number, value: boolean) =>
    setDraft((d) => ({
      ...d,
      armsAre360Default: d.armsAre360Default.map((v, i) => (i === index ? value : v)),
    }));

  // Slider, kolun o anki moduna (180°/360°) ait varsayılanı düzenler; diğer mod korunur.
  // 180° modunda slider izi 0–180 sabittir; değer kolun [min, max] aralığına kıstırılır.
  const setArmDefault = (index: number, value: string) =>
    setDraft((d) => {
      const is360 = d.armsAre360Default[index];
      let next = value;
      if (!is360 && value !== '') {
        const lo = Math.min(num(d.armAngleLimitsDefault[index].min), num(d.armAngleLimitsDefault[index].max));
        const hi = Math.max(num(d.armAngleLimitsDefault[index].min), num(d.armAngleLimitsDefault[index].max));
        next = String(clamp(num(value), lo, hi));
      }
      const key = is360 ? 'deg360' : 'deg180';
      return {
        ...d,
        armValuesDefault: d.armValuesDefault.map((v, i) => (i === index ? { ...v, [key]: next } : v)),
      };
    });

  // 180° modunda kolun açı aralığını (iki tutamaklı slider) düzenler ve varsayılan
  // açıyı (deg180) otomatik olarak yeni aralığın tam sayı orta noktasına ayarlar.
  // RangeSlider min < max'ı garanti eder (minGap).
  const setArmAngleRange = (index: number, min: number, max: number) =>
    setDraft((d) => {
      const lo = Math.min(min, max);
      const hi = Math.max(min, max);
      const midpoint = Math.round((lo + hi) / 2);
      return {
        ...d,
        armAngleLimitsDefault: d.armAngleLimitsDefault.map((l, i) =>
          i === index ? { min: String(lo), max: String(hi) } : l,
        ),
        armValuesDefault: d.armValuesDefault.map((v, i) =>
          i === index ? { ...v, deg180: String(midpoint) } : v,
        ),
      };
    });

  // Aralık text input'ları: yazarken serbest (boş bırakılabilir). Yazarken varsayılan
  // açı slider'ı + text input'u da canlı güncellenir (güncel aralığın orta noktasına
  // çekilir). Tam normalize/kıstırma (0–180, min<max) blur'da yapılır.
  const setArmLimitText = (index: number, edge: 'min' | 'max', value: string) =>
    setDraft((d) => {
      const cleaned = value.replace(/[^0-9]/g, '');
      const limits = d.armAngleLimitsDefault.map((l, i) =>
        i === index ? { ...l, [edge]: cleaned } : l,
      );
      const lo = Math.min(num(limits[index].min), num(limits[index].max));
      const hi = Math.max(num(limits[index].min), num(limits[index].max));
      const midpoint = Math.round((lo + hi) / 2);
      return {
        ...d,
        armAngleLimitsDefault: limits,
        armValuesDefault: d.armValuesDefault.map((v, i) =>
          i === index ? { ...v, deg180: String(midpoint) } : v,
        ),
      };
    });

  // Text input'tan çıkınca normalize: 0–180'e kıstır, min < max güvencesi (düzenlenen
  // alanı diğerine göre), varsayılan açıyı yeni aralığın orta noktasına çek.
  const normalizeArmLimit = (index: number, edge: 'min' | 'max') =>
    setDraft((d) => {
      const lim = d.armAngleLimitsDefault[index];
      let mn = clamp(num(lim.min), 0, 180);
      let mx = clamp(num(lim.max), 0, 180);
      if (mn >= mx) {
        if (edge === 'min') {
          mn = mx - 1;
          if (mn < 0) { mn = 0; mx = 1; }
        } else {
          mx = mn + 1;
          if (mx > 180) { mx = 180; mn = 179; }
        }
      }
      const midpoint = Math.round((mn + mx) / 2);
      return {
        ...d,
        armAngleLimitsDefault: d.armAngleLimitsDefault.map((l, i) =>
          i === index ? { min: String(mn), max: String(mx) } : l,
        ),
        armValuesDefault: d.armValuesDefault.map((v, i) =>
          i === index ? { ...v, deg180: String(midpoint) } : v,
        ),
      };
    });

  const setZiplineAngle = (side: 'front' | 'back', edge: 'open' | 'close', value: string) =>
    setDraft((d) => ({
      ...d,
      ziplineAnglesDefault: {
        ...d.ziplineAnglesDefault,
        [side]: { ...d.ziplineAnglesDefault[side], [edge]: value },
      },
    }));

  // Her hız kontrolünün kendi PWM çözünürlüğü var. Çözünürlük değişince üst sınır
  // 2^res-1 olur ("Aralık" otomatik ayarlanır) ve "her zaman default'ta max" kuralı
  // gereği o kontrolün hız varsayılanı otomatik yeni max'a çekilir (sonra düşürülebilir).
  const makeResolutionSetter =
    (resKey: ResKey, speedKey: SpeedKey) => (text: string) => {
      const cleaned = text.replace(/[^0-9]/g, '');
      setDraft((d) => {
        const next: DraftSettings = { ...d, [resKey]: cleaned };
        if (cleaned !== '') next[speedKey] = String(pwmMaxFromResolution(num(cleaned)));
        return next;
      });
    };

  // Tek bir motor hız bölümü: çözünürlük girişi + aralık bilgisi + hız slider'ı + adım.
  // Çözünürlükten türeyen max'a göre slider sınırı ve giriş basamağı otomatik ayarlanır.
  const renderMotorSection = (opts: {
    title: string;
    color: string;
    resKey: ResKey;
    speedKey: SpeedKey;
    stepKey: StepKey;
  }) => {
    const max = pwmMaxFromResolution(num(draft[opts.resKey]));
    return (
      <>
        <Text style={styles.subGroupTitle}>{opts.title}</Text>
        <NumberRow
          label="PWM Çözünürlüğü (bit)"
          value={draft[opts.resKey]}
          onChangeText={makeResolutionSetter(opts.resKey, opts.speedKey)}
          maxLength={2}
        />
        <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '600', marginTop: -2, marginBottom: 6 }}>
          PWM aralığı: 0 – {max}
        </Text>
        <SliderField
          label="Varsayılan Hız"
          value={draft[opts.speedKey]}
          min={0}
          max={max}
          maxLength={String(max).length}
          color={opts.color}
          onChange={(t) => setDraft((d) => ({ ...d, [opts.speedKey]: t }))}
        />
        <NumberRow
          label="Hız Adımı"
          value={draft[opts.stepKey]}
          onChangeText={(t) => setDraft((d) => ({ ...d, [opts.stepKey]: t }))}
        />
      </>
    );
  };

  const handleSave = () => {
    setSettings(fromDraft(draft));
    ToastAndroid.show('Ayarlar kaydedildi', ToastAndroid.SHORT);
  };

  const handleReset = () => {
    Alert.alert(
      'Varsayılana Sıfırla',
      'Tüm ayarlar varsayılan değerlere dönecek ve kaydedilecek. Emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sıfırla',
          style: 'destructive',
          onPress: () => {
            resetSettings();
            setDraft(toDraft(defaultSettings));
            ToastAndroid.show('Varsayılana sıfırlandı', ToastAndroid.SHORT);
          },
        },
      ],
    );
  };

  // --- Kaydedilmemiş değişiklik koruması ------------------------------------
  // beforeRemove'dan sonra eylemi tekrar dispatch ederken döngüye girmemek için.
  const allowLeaveRef = useRef(false);

  // draft, kayıtlı ayarlardan farklı mı? (normalize edilmiş değerler kıyaslanır)
  const isDirty = (): boolean => {
    const s = useSettingsStore.getState();
    const saved: AppSettings = {
      sendValuesHeaders: s.sendValuesHeaders,
      allSendsValues: s.allSendsValues,
      motorControlSeparateDefault: s.motorControlSeparateDefault,
      motorPwmResolutionDefault: s.motorPwmResolutionDefault,
      motorSpeedDefault: s.motorSpeedDefault,
      motorSpeedStepDefault: s.motorSpeedStepDefault,
      rightMotorPwmResolutionDefault: s.rightMotorPwmResolutionDefault,
      rightMotorSpeedDefault: s.rightMotorSpeedDefault,
      rightMotorSpeedStepDefault: s.rightMotorSpeedStepDefault,
      leftMotorPwmResolutionDefault: s.leftMotorPwmResolutionDefault,
      leftMotorSpeedDefault: s.leftMotorSpeedDefault,
      leftMotorSpeedStepDefault: s.leftMotorSpeedStepDefault,
      armsAre360Default: s.armsAre360Default,
      armValuesDefault: s.armValuesDefault,
      armAngleLimitsDefault: s.armAngleLimitsDefault,
      armValuesStepDefault: s.armValuesStepDefault,
      ziplineAnglesDefault: s.ziplineAnglesDefault,
    };
    return JSON.stringify(fromDraft(draft)) !== JSON.stringify(saved);
  };

  // Ekrandan ayrılırken (geri oku/goBack, geri hareketi, donanım geri, ev/reset)
  // kaydedilmemiş değişiklik varsa önce kaydetmek isteyip istemediğini sor.
  // (Araç butonu push olduğundan bu ekranı kaldırmaz; draft korunur, sorulmaz.)
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (allowLeaveRef.current || !isDirty()) return;
      e.preventDefault();
      Alert.alert(
        'Kaydedilmemiş Değişiklikler',
        'Yaptığınız değişiklikleri kaydetmek istiyor musunuz?',
        [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Kaydetme',
            style: 'destructive',
            onPress: () => {
              allowLeaveRef.current = true;
              navigation.dispatch(e.data.action);
            },
          },
          {
            text: 'Kaydet',
            onPress: () => {
              setSettings(fromDraft(draft));
              allowLeaveRef.current = true;
              navigation.dispatch(e.data.action);
            },
          },
        ],
      );
    });
    return unsubscribe;
  }, [navigation, draft]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="dark" />

      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#1E293B" />
          </TouchableOpacity>
          <View style={styles.headerTextBox}>
            <Text style={styles.headerTitle}>Ayarlar</Text>
            <Text style={styles.headerSubtitle}>Gönderim başlıkları ve varsayılan değerler</Text>
          </View>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
          >
            <MaterialCommunityIcons name="home" size={22} color="#1E293B" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('CarControl')}>
            <MaterialCommunityIcons name="car" size={22} color="#0A84FF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Card title="Gönderim Başlıkları" icon="code-tags" iconColor="#6D28D9" iconBg="#EDE9FE">
            <Text style={styles.subGroupTitle}>Motor</Text>
            <TextRow label="Sağ Motor" value={draft.sendValuesHeaders.motor.right_motor} onChangeText={(t) => setMotorHeader('right_motor', t)} />
            <TextRow label="Sol Motor" value={draft.sendValuesHeaders.motor.left_motor} onChangeText={(t) => setMotorHeader('left_motor', t)} />
            <TextRow label="Tüm Motorlar" value={draft.sendValuesHeaders.motor.all_motors} onChangeText={(t) => setMotorHeader('all_motors', t)} />

            <View style={styles.divider} />
            <Text style={styles.subGroupTitle}>Robot Kol</Text>
            <TextRow label="Kol 0" value={draft.sendValuesHeaders.robot_arm.robot_arm_0} onChangeText={(t) => setArmHeader('robot_arm_0', t)} />
            <TextRow label="Kol 1" value={draft.sendValuesHeaders.robot_arm.robot_arm_1} onChangeText={(t) => setArmHeader('robot_arm_1', t)} />
            <TextRow label="Kol 2" value={draft.sendValuesHeaders.robot_arm.robot_arm_2} onChangeText={(t) => setArmHeader('robot_arm_2', t)} />
            <TextRow label="Kol 3" value={draft.sendValuesHeaders.robot_arm.robot_arm_3} onChangeText={(t) => setArmHeader('robot_arm_3', t)} />
            <TextRow label="Kol 4" value={draft.sendValuesHeaders.robot_arm.robot_arm_4} onChangeText={(t) => setArmHeader('robot_arm_4', t)} />
            <TextRow label="Kol 5" value={draft.sendValuesHeaders.robot_arm.robot_arm_5} onChangeText={(t) => setArmHeader('robot_arm_5', t)} />
            <TextRow label="Tüm Kollar" value={draft.sendValuesHeaders.robot_arm.all_robot_arms} onChangeText={(t) => setArmHeader('all_robot_arms', t)} />

            <View style={styles.divider} />
            <Text style={styles.subGroupTitle}>Zipline</Text>
            <TextRow label="Ön Zipline" value={draft.sendValuesHeaders.zipline.front_zipline} onChangeText={(t) => setZiplineHeader('front_zipline', t)} />
            <TextRow label="Arka Zipline" value={draft.sendValuesHeaders.zipline.back_zipline} onChangeText={(t) => setZiplineHeader('back_zipline', t)} />
            <TextRow label="Tüm Ziplineler" value={draft.sendValuesHeaders.zipline.all_ziplines} onChangeText={(t) => setZiplineHeader('all_ziplines', t)} />
          </Card>

          <Card title="Toplu Gönderim" icon="checkbox-multiple-marked-outline" iconColor="#0284C7" iconBg="#E0F2FE">
            <SwitchRow label="Motorlar (tek komut)" value={draft.allSendsValues.motors} onValueChange={(v) => setAllSends('motors', v)} />
            <SwitchRow label="Robot Kollar (tek komut)" value={draft.allSendsValues.robot_arms} onValueChange={(v) => setAllSends('robot_arms', v)} />
            <SwitchRow label="Ziplineler (tek komut)" value={draft.allSendsValues.ziplines} onValueChange={(v) => setAllSends('ziplines', v)} />
          </Card>

          <Card title="Motor" icon="speedometer" iconColor="#15803D" iconBg="#DCFCE7">
            <MotorModeRow
              label="Hız kontrolü"
              value={draft.motorControlSeparateDefault}
              onValueChange={(v) => setDraft((d) => ({ ...d, motorControlSeparateDefault: v }))}
            />

            <View style={styles.divider} />
            {renderMotorSection({ title: 'Ortak', color: '#0A84FF', resKey: 'motorPwmResolutionDefault', speedKey: 'motorSpeedDefault', stepKey: 'motorSpeedStepDefault' })}

            <View style={styles.divider} />
            {renderMotorSection({ title: 'Sağ Motor', color: '#F59E0B', resKey: 'rightMotorPwmResolutionDefault', speedKey: 'rightMotorSpeedDefault', stepKey: 'rightMotorSpeedStepDefault' })}

            <View style={styles.divider} />
            {renderMotorSection({ title: 'Sol Motor', color: '#22C55E', resKey: 'leftMotorPwmResolutionDefault', speedKey: 'leftMotorSpeedDefault', stepKey: 'leftMotorSpeedStepDefault' })}
          </Card>

          <Card title="Robot Kol" icon="robot-industrial" iconColor="#B45309" iconBg="#FEF3C7">
            {draft.armValuesDefault.map((val, i) => {
              const is360 = draft.armsAre360Default[i];
              const lim = draft.armAngleLimitsDefault[i];
              const lo = Math.min(num(lim.min), num(lim.max));
              const hi = Math.max(num(lim.min), num(lim.max));
              return (
                <View key={`arm-${i}`}>
                  {i > 0 && <View style={styles.divider} />}
                  <Text style={styles.subGroupTitle}>{`Kol ${i}`}</Text>
                  <SwitchRow
                    label="360° Servo"
                    value={is360}
                    onValueChange={(v) => setArm360(i, v)}
                  />
                  {!is360 && (
                    <View style={styles.sliderField}>
                      <View style={styles.sliderTopRow}>
                        <Text style={styles.rowLabel}>Açı Aralığı</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <TextInput
                            style={[styles.numberInput, { width: 58 }]}
                            value={lim.min}
                            onChangeText={(t) => setArmLimitText(i, 'min', t)}
                            onBlur={() => normalizeArmLimit(i, 'min')}
                            keyboardType="numeric"
                            maxLength={3}
                            selectTextOnFocus
                          />
                          <Text style={{ fontSize: 14, fontWeight: '800', color: '#94A3B8' }}>–</Text>
                          <TextInput
                            style={[styles.numberInput, { width: 58 }]}
                            value={lim.max}
                            onChangeText={(t) => setArmLimitText(i, 'max', t)}
                            onBlur={() => normalizeArmLimit(i, 'max')}
                            keyboardType="numeric"
                            maxLength={3}
                            selectTextOnFocus
                          />
                        </View>
                      </View>
                      <RangeSlider
                        minValue={lo}
                        maxValue={hi}
                        minimumValue={0}
                        maximumValue={180}
                        step={1}
                        minGap={1}
                        trackThickness={7}
                        thumbSize={20}
                        trackColor="#E2E8F0"
                        fillColor={ARM_COLORS[i]}
                        thumbColor={ARM_THUMB_COLORS[i]}
                        onChange={(mn, mx) => setArmAngleRange(i, mn, mx)}
                      />
                    </View>
                  )}
                  <SliderField
                    label="Varsayılan Açı"
                    value={is360 ? val.deg360 : val.deg180}
                    min={is360 ? 0 : lo}
                    max={is360 ? 90 : hi}
                    color={ARM_COLORS[i]}
                    onChange={(t) => setArmDefault(i, t)}
                  />
                </View>
              );
            })}

            <View style={styles.divider} />
            <NumberRow label="Açı Adımı" value={draft.armValuesStepDefault} onChangeText={(t) => setDraft((d) => ({ ...d, armValuesStepDefault: t }))} />
          </Card>

          <Card title="Zipline Açıları" icon="transmission-tower" iconColor="#BE185D" iconBg="#FCE7F3">
            <Text style={styles.subGroupTitle}>Ön</Text>
            <SliderField label="Açık" value={draft.ziplineAnglesDefault.front.open} min={0} max={180} color={ZIPLINE_OPEN_COLOR} onChange={(t) => setZiplineAngle('front', 'open', t)} />
            <SliderField label="Kapalı" value={draft.ziplineAnglesDefault.front.close} min={0} max={180} color={ZIPLINE_CLOSE_COLOR} onChange={(t) => setZiplineAngle('front', 'close', t)} />

            <View style={styles.divider} />
            <Text style={styles.subGroupTitle}>Arka</Text>
            <SliderField label="Açık" value={draft.ziplineAnglesDefault.back.open} min={0} max={180} color={ZIPLINE_OPEN_COLOR} onChange={(t) => setZiplineAngle('back', 'open', t)} />
            <SliderField label="Kapalı" value={draft.ziplineAnglesDefault.back.close} min={0} max={180} color={ZIPLINE_CLOSE_COLOR} onChange={(t) => setZiplineAngle('back', 'close', t)} />
          </Card>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.resetBtn} activeOpacity={0.85} onPress={handleReset}>
            <MaterialCommunityIcons name="restore" size={20} color="#EF4444" />
            <Text style={styles.resetBtnText}>Sıfırla</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveBtn} activeOpacity={0.9} onPress={handleSave}>
            <MaterialCommunityIcons name="content-save" size={20} color="#FFFFFF" />
            <Text style={styles.saveBtnText}>Kaydet</Text>
          </TouchableOpacity>
        </View>
      </GestureHandlerRootView>
    </SafeAreaView>
  );
}
