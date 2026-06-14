import { StatusBar } from 'expo-status-bar';
import {
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import styles from './styles';
import RCCarTab from './RCCarTab';
import RobotArmTab from './RobotArmTab';
import { AppNavigationProp, useBluetoothStore } from '../constants';



export default function CarControlScreen() {

  const navigation = useNavigation<AppNavigationProp>();
  const layout = useWindowDimensions();

  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);
  const setConnectedDevice = useBluetoothStore((state) => state.setConnectedDevice);
  const setMessages = useBluetoothStore((state) => state.setMessages);
  const setManuallyDisconnected = useBluetoothStore((state) => state.setManuallyDisconnected);

  const disconnectDevice = async () => {
    console.log('[Header] Disconnect button pressed');
    if (!connectedDevice) return;
    if (!window.confirm('Bağlantı kesilecek. Emin misiniz?')) return;
    try {
      setManuallyDisconnected(true);
      await connectedDevice.disconnect();
      setConnectedDevice(null);
      setMessages([]);
      window.alert('Bağlantı kesildi');
    } catch (e) {
      window.alert('Bağlantı kesilemedi');
    }
  };


  const handleBackPress = () => {
    console.log('[Header] Back button pressed');
    navigation.goBack();
  };

  const handleHomePress = () => {
    console.log('[Header] Home button pressed');
    const idx = navigation.getState()?.index ?? 0;
    if (idx > 0 && typeof window !== 'undefined') {
      window.history.go(-idx);
    } else {
      navigation.navigate('Home');
    }
  };

  const handleSettingsPress = () => {
    console.log('[Header] Settings button pressed');
    navigation.navigate('BluetoothConnection');
  };

  const handleConnectPress = () => {
    console.log('[Header] Connect button pressed');
    navigation.navigate('BluetoothConnection');
  };

  const handleDefaultsPress = () => {
    console.log('[Header] Defaults (Settings) button pressed');
    navigation.navigate('Settings');
  };


  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style="dark" />

        <View style={styles.container}>
          <View style={styles.headerWithBack}>
            <TouchableOpacity onPress={handleBackPress} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="#111827" />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              {connectedDevice && (
                <Text
                  style={[styles.headerTitle, { fontSize: 15 }]}
                  numberOfLines={1}
                >
                  {connectedDevice.name || 'Bilinmeyen Cihaz'}
                </Text>
              )}
            </View>

            <View style={styles.headerRight}>
              <View style={styles.connectionBox}>
                <View
                  style={[
                    styles.connectionDot,
                    { backgroundColor: connectedDevice ? '#22C55E' : '#EF4444' },
                  ]}
                />
                <Text style={styles.connectionText}>
                  {connectedDevice ? 'Çevrimiçi' : 'Çevrimdışı'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleHomePress}
                style={styles.homeBtn}
              >
                <MaterialCommunityIcons name="home" size={22} color="#111827" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSettingsPress}
                style={styles.homeBtn}
              >
                <MaterialCommunityIcons name="cog" size={22} color="#111827" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDefaultsPress}
                style={styles.homeBtn}
              >
                <MaterialCommunityIcons name="tune-variant" size={22} color="#111827" />
              </TouchableOpacity>

              {connectedDevice ? (
                <TouchableOpacity onPress={disconnectDevice} style={styles.homeBtn}>
                  <MaterialCommunityIcons
                    name="bluetooth-off"
                    size={22}
                    color="#EF4444"
                  />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleConnectPress}
                  style={styles.homeBtn}
                >
                  <MaterialCommunityIcons
                    name="bluetooth-connect"
                    size={22}
                    color="#22C55E"
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.singlePageContent}>
            <Text style={styles.pageTitle}>Araç Kontrol Paneli</Text>
            <Text style={styles.pageSubtitle}>Tüm kontroller tek sayfada. Mouse kaydırma tüm sayfayı hareket ettirir.</Text>

            <View style={styles.sectionWrap}>
              <View style={styles.headerPillContainer}>
                <View style={styles.headerPill}>
                  <View style={styles.headerPillIconBox}>
                    <MaterialIcons name="directions-car" size={18} color="#0A84FF" />
                  </View>
                  <Text style={styles.headerPillText}>Araç Kontrol</Text>
                </View>
              </View>
              <RCCarTab disableScroll />
            </View>

            <View style={styles.sectionWrap}>
              <View style={styles.headerPillContainer}>
                <View style={styles.headerPill}>
                  <View style={styles.headerPillIconBox}>
                    <MaterialIcons name="precision-manufacturing" size={18} color="#0A84FF" />
                  </View>
                  <Text style={styles.headerPillText}>Robot Kol</Text>
                </View>
              </View>
              <RobotArmTab disableScroll />
            </View>

          </ScrollView>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
