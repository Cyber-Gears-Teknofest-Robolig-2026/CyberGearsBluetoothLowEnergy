import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  Switch,
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
import styles from './styles';
import {
  AppNavigationProp,
  AppSettings,
  SendValuesHeaders,
  defaultSettings,
  useSettingsStore,
} from '../constants';
import { useThemeStore, useEffectiveTheme } from '../theme';

// Form için number alanları string olarak tutulur ki düzenlerken boş bırakılabilsin.
type DraftSettings = {
  sendValuesHeaders: SendValuesHeaders;
  allSendsValues: AppSettings['allSendsValues'];
  motorSpeedDefault: string;
  motorSpeedStepDefault: string;
  armsAre360Default: boolean[];
  armValuesDefault: string[];
  armValuesStepDefault: string;
  ziplineAnglesDefault: {
    front: { open: string; close: string };
    back: { open: string; close: string };
  };
};

const toDraft = (s: AppSettings): DraftSettings => ({
  sendValuesHeaders: {
    motor: { ...s.sendValuesHeaders.motor },
    robot_arm: { ...s.sendValuesHeaders.robot_arm },
    zipline: { ...s.sendValuesHeaders.zipline },
  },
  allSendsValues: { ...s.allSendsValues },
  motorSpeedDefault: String(s.motorSpeedDefault),
  motorSpeedStepDefault: String(s.motorSpeedStepDefault),
  armsAre360Default: [...s.armsAre360Default],
  armValuesDefault: s.armValuesDefault.map(String),
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

// Zipline açık/kapalı slider renkleri (ön ve arka aynı renkleri paylaşır).
// ARM_COLORS paletiyle bilerek çakışmayan renkler seçildi.
const ZIPLINE_OPEN_COLOR = '#DB2777';
const ZIPLINE_CLOSE_COLOR = '#475569';

const fromDraft = (d: DraftSettings): AppSettings => ({
  sendValuesHeaders: d.sendValuesHeaders,
  allSendsValues: d.allSendsValues,
  motorSpeedDefault: num(d.motorSpeedDefault),
  motorSpeedStepDefault: num(d.motorSpeedStepDefault),
  armsAre360Default: d.armsAre360Default,
  armValuesDefault: d.armValuesDefault.map(num),
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
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ true: '#0A84FF', false: '#CBD5E1' }}
      thumbColor="#FFFFFF"
    />
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

  const setArmDefault = (index: number, value: string) =>
    setDraft((d) => ({
      ...d,
      armValuesDefault: d.armValuesDefault.map((v, i) => (i === index ? value : v)),
    }));

  const setZiplineAngle = (side: 'front' | 'back', edge: 'open' | 'close', value: string) =>
    setDraft((d) => ({
      ...d,
      ziplineAnglesDefault: {
        ...d.ziplineAnglesDefault,
        [side]: { ...d.ziplineAnglesDefault[side], [edge]: value },
      },
    }));

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

  const themeMode = useThemeStore((s) => s.mode);

  // --- Kaydedilmemiş değişiklik koruması ------------------------------------
  // beforeRemove'dan sonra eylemi tekrar dispatch ederken döngüye girmemek için.
  const allowLeaveRef = useRef(false);

  // draft, kayıtlı ayarlardan farklı mı? (normalize edilmiş değerler kıyaslanır)
  const isDirty = (): boolean => {
    const s = useSettingsStore.getState();
    const saved: AppSettings = {
      sendValuesHeaders: s.sendValuesHeaders,
      allSendsValues: s.allSendsValues,
      motorSpeedDefault: s.motorSpeedDefault,
      motorSpeedStepDefault: s.motorSpeedStepDefault,
      armsAre360Default: s.armsAre360Default,
      armValuesDefault: s.armValuesDefault,
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
        <Card title="Görünüm" icon="theme-light-dark" iconColor="#0A84FF" iconBg="#E0F2FE">
          {/* Tema modu — zustand store üzerinden güncellenir */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 }}>
            <TouchableOpacity
              onPress={() => useThemeStore.getState().setMode('system')}
              style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: themeMode === 'system' ? '#DDE6F6' : '#F1F5F9', borderWidth: themeMode === 'system' ? 2 : 0, borderColor: '#0A84FF' }}
            >
              <Text style={{ fontWeight: themeMode === 'system' ? '700' : '400' }}>Otomatik</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => useThemeStore.getState().setMode('light')}
              style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: themeMode === 'light' ? '#E8F8FF' : '#FFFFFF', borderWidth: themeMode === 'light' ? 2 : 0, borderColor: '#0A84FF' }}
            >
              <Text style={{ fontWeight: themeMode === 'light' ? '700' : '400' }}>Açık</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => useThemeStore.getState().setMode('dark')}
              style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: themeMode === 'dark' ? '#0b1220' : '#0F172A', borderWidth: themeMode === 'dark' ? 2 : 0, borderColor: '#38BDF8' }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: themeMode === 'dark' ? '700' : '400' }}>Karanlık</Text>
            </TouchableOpacity>
          </View>
        </Card>
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
          <SliderField
            label="Varsayılan Hız"
            value={draft.motorSpeedDefault}
            min={0}
            max={255}
            color="#0A84FF"
            onChange={(t) => setDraft((d) => ({ ...d, motorSpeedDefault: t }))}
          />
          <NumberRow label="Hız Adımı" value={draft.motorSpeedStepDefault} onChangeText={(t) => setDraft((d) => ({ ...d, motorSpeedStepDefault: t }))} />
        </Card>

        <Card title="Robot Kol" icon="robot-industrial" iconColor="#B45309" iconBg="#FEF3C7">
          <Text style={styles.subGroupTitle}>360° Servo mu?</Text>
          {draft.armsAre360Default.map((is360, i) => (
            <SwitchRow key={`a360-${i}`} label={`Kol ${i}`} value={is360} onValueChange={(v) => setArm360(i, v)} />
          ))}

          <View style={styles.divider} />
          <Text style={styles.subGroupTitle}>Varsayılan Açılar</Text>
          {draft.armValuesDefault.map((val, i) => (
            <SliderField
              key={`adef-${i}`}
              label={draft.armsAre360Default[i] ? `Kol ${i} (360°)` : `Kol ${i}`}
              value={val}
              min={0}
              max={draft.armsAre360Default[i] ? 90 : 180}
              color={ARM_COLORS[i]}
              onChange={(t) => setArmDefault(i, t)}
            />
          ))}

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
