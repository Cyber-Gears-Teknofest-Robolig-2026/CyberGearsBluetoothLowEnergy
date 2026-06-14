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
import { Buffer } from "buffer";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import styles from "./styles";
import { useNavigation } from "@react-navigation/native";
import {
  AppNavigationProp,
  BluetoothDevice,
  useBluetoothStore,
  NUS_SERVICE,
  NUS_RX,
  NUS_TX,
} from "../constants";

// Tarayıcının Web Bluetooth (GATT) cihazını Android'deki BluetoothDevice
// yüzeyine saran adapter. Böylece diğer ekranlar (Communication, CarControl)
// cihazı android ile bire bir aynı şekilde (write/disconnect/onDataReceived)
// kullanır. Veri akışı base64'tür: write düz metni RX'e yazar, onDataReceived
// ise TX bildirimlerini base64 olarak iletir (android ile aynı davranış).
const createBleDevice = (
  bleDevice: any, // BluetoothDevice (Web Bluetooth)
  server: any, // BluetoothRemoteGATTServer
  rx: any, // RX karakteristiği (write)
  tx: any // TX karakteristiği (notify)
): BluetoothDevice => {
  const listeners = new Set<(event: { data: string }) => void>();

  // Web Bluetooth aynı anda yalnızca TEK bir GATT işlemine izin verir; eşzamanlı
  // çağrılar "GATT operation already in progress" hatası verir. Bu yüzden tüm GATT
  // işlemlerini (write / start-stopNotifications) tek bir kuyrukta seri çalıştırıyoruz.
  let gattQueue: Promise<unknown> = Promise.resolve();
  const enqueueGatt = <T,>(op: () => Promise<T>): Promise<T> => {
    // Önceki işlem başarısız olsa da kuyruk devam etsin diye iki dalda da op'u çalıştır.
    const run = gattQueue.then(op, op);
    gattQueue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  };

  const handleNotify = (event: any) => {
    const value: DataView = event.target.value;
    if (!value) return;
    const bytes = new Uint8Array(value.buffer);
    const data = Buffer.from(bytes).toString("base64");
    listeners.forEach((cb) => cb({ data }));
  };
  tx.addEventListener("characteristicvaluechanged", handleNotify);
  enqueueGatt(() => tx.startNotifications()).catch(() => {});

  const handleDisconnect = () => {
    const { manuallyDisconnected, setConnectedDevice, setManuallyDisconnected } =
      useBluetoothStore.getState();
    setConnectedDevice(null);
    if (!manuallyDisconnected) {
      window.alert(
        "Bağlantı Koptu ⚠️\nCihazın gücü kesildi veya menzilden çıkıldı."
      );
    }
    setManuallyDisconnected(false);
  };
  bleDevice.addEventListener("gattserverdisconnected", handleDisconnect);

  return {
    name: bleDevice.name || "BLE Cihazı",
    write: (data: string) => {
      const bytes = new TextEncoder().encode(data);
      // Hızlı komut akışında kuyruk hızlı boşalsın diye (varsa) yanıtsız yazma
      // kullanılır; her durumda kuyruk üzerinden seri çalışır.
      return enqueueGatt(() =>
        rx.writeValueWithoutResponse
          ? rx.writeValueWithoutResponse(bytes)
          : rx.writeValue(bytes)
      );
    },
    onDataReceived: (listener) => {
      listeners.add(listener);
      return {
        remove: () => {
          listeners.delete(listener);
        },
      };
    },
    disconnect: async () => {
      bleDevice.removeEventListener("gattserverdisconnected", handleDisconnect);
      try {
        tx.removeEventListener("characteristicvaluechanged", handleNotify);
      } catch (e) {}
      try {
        await enqueueGatt(() => tx.stopNotifications());
      } catch (e) {}
      try {
        if (server.connected) server.disconnect();
      } catch (e) {}
    },
  };
};

export default function BluetoothConnectionScreen() {

  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);
  const setConnectedDevice = useBluetoothStore((state) => state.setConnectedDevice);
  const setMessages = useBluetoothStore((state) => state.setMessages);
  const setManuallyDisconnected = useBluetoothStore((state) => state.setManuallyDisconnected);

  const navigation = useNavigation<AppNavigationProp>();

  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && !("bluetooth" in navigator)) {
      window.alert(
        "Hata: Tarayıcınız Web Bluetooth API desteklemiyor. Chrome veya Edge kullanın."
      );
    }
  }, []);

  const selectAndConnect = async () => {
    if (typeof navigator === "undefined" || !("bluetooth" in navigator)) return;

    let bleDevice: any;
    try {
      bleDevice = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: [NUS_SERVICE] }],
        optionalServices: [NUS_SERVICE],
      });
    } catch (error) {
      return; // kullanıcı cihaz seçim penceresini iptal etti
    }

    try {
      setIsConnecting(true);

      const server = await bleDevice.gatt.connect();
      const service = await server.getPrimaryService(NUS_SERVICE);
      const rx = await service.getCharacteristic(NUS_RX);
      const tx = await service.getCharacteristic(NUS_TX);

      const device = createBleDevice(bleDevice, server, rx, tx);

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
