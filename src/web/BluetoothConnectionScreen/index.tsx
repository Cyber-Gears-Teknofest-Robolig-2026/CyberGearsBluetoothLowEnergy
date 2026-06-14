import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import styles from "./styles";
import { useNavigation } from "@react-navigation/native";
import {
  AppNavigationProp,
  useBluetoothStore,
  connect,
  isSupported,
} from "../constants";

export default function BluetoothConnectionScreen() {

  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);
  const setConnectedDevice = useBluetoothStore((state) => state.setConnectedDevice);
  const setMessages = useBluetoothStore((state) => state.setMessages);
  const setManuallyDisconnected = useBluetoothStore((state) => state.setManuallyDisconnected);

  const navigation = useNavigation<AppNavigationProp>();

  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (!isSupported()) {
      window.alert(
        "Hata: Tarayıcınız Web Bluetooth API desteklemiyor. Chrome veya Edge kullanın."
      );
    }
  }, []);

  const selectAndConnect = async () => {
    if (!isSupported()) return;

    try {
      setIsConnecting(true);

      const device = await connect();
      if (!device) return; // kullanıcı cihaz seçimini iptal etti

      setManuallyDisconnected(false);
      setConnectedDevice(device);
      setMessages([]);
    } catch (e) {
      window.alert("Hata: Bağlantı kurulamadı.");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectDevice = async () => {
    if (!connectedDevice) return;
    if (!window.confirm("Bağlantı kesilecek. Emin misiniz?")) return;
    try {
      setManuallyDisconnected(true);
      await connectedDevice.disconnect();
      setConnectedDevice(null);
      setMessages([]);
    } catch (e) {
      setConnectedDevice(null);
      setMessages([]);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <View style={styles.headerWithBack}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={26} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bağlantı Yönetimi</Text>
        <TouchableOpacity
        onPress={() => {
          const idx = navigation.getState()?.index ?? 0;
          if (idx > 0 && typeof window !== 'undefined') {
            window.history.go(-idx);
          } else {
            navigation.navigate('Home');
          }
        }}
        style={styles.homeBtn}
        >
        <MaterialCommunityIcons name="home" size={24} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="bluetooth"
              size={32}
              color={isConnecting ? "#F59E0B" : connectedDevice ? "#10B981" : "#EF4444"}
            />
            <View style={{ flex: 1 }}>
              <View style={styles.statusLabelRow}>
                <Text style={styles.label}>BAĞLANTI DURUMU</Text>
                {isConnecting ? (
                  <View style={styles.connectingBadge}>
                    <ActivityIndicator size="small" color="#F59E0B" style={styles.smallSpinner} />
                    <Text style={styles.connectingText}>Bağlanıyor...</Text>
                  </View>
                ) : connectedDevice ? (
                  <View style={styles.onlineBadge}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.onlineText}>Bağlandı</Text>
                  </View>
                ) : (
                  <View style={styles.offlineBadge}>
                    <View style={styles.offlineDot} />
                    <Text style={styles.offlineText}>Bağlı Değil</Text>
                  </View>
                )}
              </View>
              <Text style={styles.infoText}>
                {isConnecting
                  ? "Lütfen bekleyin..."
                  : connectedDevice
                  ? connectedDevice.name
                  : "Cihaz seçilmedi"}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.scanBtn} onPress={selectAndConnect} disabled={isConnecting}>
            <Text style={styles.scanBtnText}>Cihaz Seç ve Bağlan</Text>
          </TouchableOpacity>
          {connectedDevice && !isConnecting && (
            <TouchableOpacity style={styles.disconnectBtn} onPress={disconnectDevice}>
              <Text style={styles.disconnectBtnText}>Bağlantıyı Kes</Text>
            </TouchableOpacity>
          )}
        </View>

        {connectedDevice && !isConnecting && (
          <TouchableOpacity style={styles.carControlBtn} onPress={() => navigation.navigate("CarControl")}>
            <View style={styles.carControlBtnContent}>
              <MaterialCommunityIcons name="car" size={28} color="#854D0E" />
              <Text style={styles.carControlBtnText}>Araç Kontrol Ekranına Git</Text>
            </View>
          </TouchableOpacity>
        )}

        {connectedDevice && !isConnecting && (
          <TouchableOpacity style={styles.communicationBtn} onPress={() => navigation.navigate("Communication")}>
            <View style={styles.communicationBtnContent}>
              <MaterialCommunityIcons name="swap-horizontal" size={28} color="#fff" />
              <Text style={styles.communicationBtnText}>İletişim Ekranına Git</Text>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
