import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { TabView, SceneMap } from 'react-native-tab-view';
import styles from './styles';
import RCCarTab from './RCCarTab';
import RobotArmTab from './RobotArmTab';
import { AppNavigationProp, useBluetoothStore } from '../constants';


const TAB_ROUTES = [
  { key: 'car', title: 'Araç Kontrol' },
  { key: 'arm', title: 'Robot Kol' },
];

const renderScene = SceneMap({
  car: RCCarTab,
  arm: RobotArmTab,
});

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

  const [index, setIndex] = useState(0);

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

  const handleTabChange = (newIndex: number) => {
    console.log('[Tab] Changed to:', TAB_ROUTES[newIndex]?.key, '(index:', newIndex + ')');
    setIndex(newIndex);
  };

  const renderTabBar = () => (
    <View style={styles.tabShell}>
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.tabButton, index === 0 && styles.activeTab]}
        onPress={() => handleTabChange(0)}
      >
        <MaterialIcons
          name="directions-car"
          size={22}
          color={index === 0 ? '#FFFFFF' : '#6B7280'}
        />
        <Text style={[styles.tabText, index === 0 && styles.activeTabText]}>
          {TAB_ROUTES[0].title}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.tabButton, index === 1 && styles.activeTab]}
        onPress={() => handleTabChange(1)}
      >
        <MaterialIcons
          name="precision-manufacturing"
          size={22}
          color={index === 1 ? '#FFFFFF' : '#6B7280'}
        />
        <Text style={[styles.tabText, index === 1 && styles.activeTabText]}>
          {TAB_ROUTES[1].title}
        </Text>
      </TouchableOpacity>
    </View>
  );

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

          <TabView
            navigationState={{ index, routes: TAB_ROUTES }}
            renderScene={renderScene}
            onIndexChange={handleTabChange}
            initialLayout={{ width: layout.width }}
            renderTabBar={renderTabBar}
            swipeEnabled={false}
          />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
