import { useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Entypo, MaterialIcons } from '@expo/vector-icons';
import CustomSlider from '../../CustomComponents/CustomSlider';
import styles from './styles';
import {
  useBluetoothStore,
  useSettingsStore,
} from '../../constants';

const PWM_MIN = 0;
const PWM_MAX = 255;

const getSliderValue = (value: number | number[]) => {
  return Array.isArray(value) ? value[0] : value;
};

const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, Math.round(value)));
};

export default function RCCarTab() {

  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);

  const sendValuesHeaders = useSettingsStore((state) => state.sendValuesHeaders);
  const allSendsValues = useSettingsStore((state) => state.allSendsValues);
  const ziplineAnglesDefault = useSettingsStore((state) => state.ziplineAnglesDefault);
  const SPEED_DEFAULT = useSettingsStore((state) => state.motorSpeedDefault);
  const PWM_STEP = useSettingsStore((state) => state.motorSpeedStepDefault);

  const [ziplineOpen, setZiplineOpen] = useState(false);
  const [vehicleScrollHeight, setVehicleScrollHeight] = useState(0);

  const [speed, setSpeed] = useState(SPEED_DEFAULT);
  const [speedInput, setSpeedInput] = useState(SPEED_DEFAULT.toString());

  const handleDirection = async (direction: string) => {
    console.log('Direction:', direction);
    console.log('Speed:', speed);
    console.log(`${sendValuesHeaders.motor.right_motor}:${speed}\r\n`);
    console.log(`${sendValuesHeaders.motor.left_motor}:${speed}\r\n`);
    console.log(`${sendValuesHeaders.motor.all_motors}:${speed},${speed}\r\n`);
    console.log("-----------------------------------");
    switch (direction) {
      case 'forward':
        if (!allSendsValues.motors) {
          await connectedDevice?.write(`${sendValuesHeaders.motor.right_motor}:${speed}\r\n`);
          await connectedDevice?.write(`${sendValuesHeaders.motor.left_motor}:${speed}\r\n`);
        }
        else {
          await connectedDevice?.write(`${sendValuesHeaders.motor.all_motors}:${speed},${speed}\r\n`);
        }
        break;
      case 'backward':
        if (!allSendsValues.motors) {
          await connectedDevice?.write(`${sendValuesHeaders.motor.right_motor}:-${speed}\r\n`);
          await connectedDevice?.write(`${sendValuesHeaders.motor.left_motor}:-${speed}\r\n`);
        } else {
          await connectedDevice?.write(`${sendValuesHeaders.motor.all_motors}:-${speed},-${speed}\r\n`);
        }
        break;
      case 'right':
        if (!allSendsValues.motors) {
          await connectedDevice?.write(`${sendValuesHeaders.motor.right_motor}:-${speed}\r\n`);
          await connectedDevice?.write(`${sendValuesHeaders.motor.left_motor}:${speed}\r\n`);
        }
        else {
          await connectedDevice?.write(`${sendValuesHeaders.motor.all_motors}:-${speed},${speed}\r\n`);
        }
        break;
      case 'left':
        if (!allSendsValues.motors) {
          await connectedDevice?.write(`${sendValuesHeaders.motor.right_motor}:${speed}\r\n`);
          await connectedDevice?.write(`${sendValuesHeaders.motor.left_motor}:-${speed}\r\n`);
        }
        else {
          await connectedDevice?.write(`${sendValuesHeaders.motor.all_motors}:-${speed},${speed}\r\n`);
        }
        break;
    }
  };

  const handleDirectionStop = async () => {
    console.log('Direction: stop');
    if (!allSendsValues.motors) {
      await connectedDevice?.write(`${sendValuesHeaders.motor.right_motor}:0\r\n`);
      await connectedDevice?.write(`${sendValuesHeaders.motor.left_motor}:0\r\n`);
    }
    else {
      await connectedDevice?.write(`${sendValuesHeaders.motor.all_motors}:0,0\r\n`);
    }
  };

  const toggleZipline = async () => {
    const nextValue = !ziplineOpen;
    console.log('Zipline:', nextValue ? 'Open' : 'Close');
    setZiplineOpen(nextValue);
    if (!allSendsValues.ziplines) {
      if (nextValue) {
        await connectedDevice?.write(`${sendValuesHeaders.zipline.front_zipline}:${ziplineAnglesDefault.front.open}\r\n`);
        await connectedDevice?.write(`${sendValuesHeaders.zipline.back_zipline}:${ziplineAnglesDefault.back.open}\r\n`);
      }
      else {
        await connectedDevice?.write(`${sendValuesHeaders.zipline.front_zipline}:${ziplineAnglesDefault.front.close}\r\n`);
        await connectedDevice?.write(`${sendValuesHeaders.zipline.back_zipline}:${ziplineAnglesDefault.back.close}\r\n`);
      }
    }
    else {
      if (nextValue) {
        await connectedDevice?.write(`${sendValuesHeaders.zipline.all_ziplines}:${ziplineAnglesDefault.front.open},${ziplineAnglesDefault.back.open}\r\n`);
      }
      else {
        await connectedDevice?.write(`${sendValuesHeaders.zipline.all_ziplines}:${ziplineAnglesDefault.front.close},${ziplineAnglesDefault.back.close}\r\n`);
      }
    }
  };

  const handleSpeedChange = (rawValue: number | number[]) => {
    const value = getSliderValue(rawValue);
    const pwmValue = clamp(value, PWM_MIN, PWM_MAX);

    setSpeed(pwmValue);
    setSpeedInput(pwmValue.toString());

    console.log('PWM Speed:', pwmValue);
  };

  const incrementSpeed = () => {
    handleSpeedChange(speed + PWM_STEP);
  };

  const decrementSpeed = () => {
    handleSpeedChange(speed - PWM_STEP);
  };

  const handleSpeedInputChange = (text: string) => {
    const onlyNumbers = text.replace(/[^0-9]/g, '');
    setSpeedInput(onlyNumbers);

    if (onlyNumbers === '') return;

    const numValue = Number(onlyNumbers);

    if (!Number.isNaN(numValue)) {
      setSpeed(clamp(numValue, PWM_MIN, PWM_MAX));
    }
  };

  const normalizeSpeedInput = () => {
    if (speedInput === '') {
      handleSpeedChange(speed);
      return;
    }

    handleSpeedChange(Number(speedInput));
  };

  return (
    <ScrollView
      style={styles.screenBody}
      contentContainerStyle={styles.vehicleScrollContent}
      showsVerticalScrollIndicator={false}
      onLayout={(e) => setVehicleScrollHeight(e.nativeEvent.layout.height)}
    >
      <View
        style={[
          styles.vehicleTopRow,
          vehicleScrollHeight > 0
            ? { height: Math.min(vehicleScrollHeight - 10, 380) }
            : null,
        ]}
      >
        <View style={styles.cardLarge}>
          <View style={styles.cardHeader}>
            <View style={styles.headerIconBox}>
              <MaterialIcons name="directions-car" size={19.2} color="#0A84FF" />
            </View>

            <View>
              <Text style={styles.sectionTitle}>Araç Hareketi</Text>
            </View>
          </View>

          <View style={styles.directionPad}>
            <TouchableOpacity
              style={styles.directionButton}
              activeOpacity={0.78}
              onPressIn={() => handleDirection('forward')}
              onPressOut={handleDirectionStop}
            >
              <Entypo name="arrow-up" size={36} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.directionRow}>
              <TouchableOpacity
                style={styles.directionButton}
                activeOpacity={0.78}
                onPressIn={() => handleDirection('left')}
                onPressOut={handleDirectionStop}
              >
                <Entypo name="arrow-left" size={36} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.directionCenter}>
                <MaterialIcons
                  name="directions-car"
                  size={32}
                  color="#0A84FF"
                />
              </View>

              <TouchableOpacity
                style={styles.directionButton}
                activeOpacity={0.78}
                onPressIn={() => handleDirection('right')}
                onPressOut={handleDirectionStop}
              >
                <Entypo name="arrow-right" size={36} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.directionButton}
              activeOpacity={0.78}
              onPressIn={() => handleDirection('backward')}
              onPressOut={handleDirectionStop}
            >
              <Entypo name="arrow-down" size={36} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardSmall}>
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.headerIconBox,
                ziplineOpen ? styles.headerIconBoxGreen : styles.headerIconBoxRed,
              ]}
            >
              <MaterialIcons
                name={ziplineOpen ? 'lock-open' : 'lock'}
                size={19.2}
                color={ziplineOpen ? '#22C55E' : '#EF4444'}
              />
            </View>

            <View>
              <Text style={styles.sectionTitle}>Zipline Mekanizması</Text>
            </View>
          </View>

          <View style={styles.ziplineStatusRow}>
            <Text style={styles.ziplineStatusLabel}>Durum</Text>

            <View
              style={[
                styles.ziplineStatusPill,
                ziplineOpen ? styles.ziplineStatusOpen : styles.ziplineStatusClosed,
              ]}
            >
              <Text style={styles.ziplineStatusText}>
                {ziplineOpen ? 'AÇIK' : 'KAPALI'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.86}
            style={[
              styles.ziplineButton,
              ziplineOpen ? styles.ziplineOpen : styles.ziplineClosed,
            ]}
            onPress={toggleZipline}
          >
            <View style={styles.ziplineIconCircle}>
              <MaterialIcons
                name={ziplineOpen ? 'lock-open' : 'lock'}
                size={26}
                color="#FFFFFF"
              />
            </View>

            <Text style={styles.ziplineButtonText}>
              {ziplineOpen ? 'AÇIK' : 'KAPALI'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.speedCard}>
        <View style={styles.speedHeaderRow}>
          <View style={styles.cardHeader}>
            <View style={styles.headerIconBox}>
              <MaterialIcons name="speed" size={19.2} color="#0A84FF" />
            </View>

            <View>
              <Text style={styles.sectionTitle}>PWM Hız Kontrolü</Text>
            </View>
          </View>

        </View>

        <View style={styles.speedControlRow}>
          <TouchableOpacity
            style={styles.roundControlButton}
            onPress={decrementSpeed}
          >
            <Entypo name="minus" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.speedSliderBox}>
            <CustomSlider
              value={speed}
              minimumValue={PWM_MIN}
              maximumValue={PWM_MAX}
              step={1}
              onValueChange={handleSpeedChange}
              trackThickness={8}
              thumbSize={22}
              trackColor="#D7E0EA"
              fillColor="#0A84FF"
              thumbColor="#0A84FF"
            />
          </View>

          <TouchableOpacity
            style={styles.roundControlButton}
            onPress={incrementSpeed}
          >
            <Entypo name="plus" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.speedInputBox}>
            <TextInput
              style={styles.speedInput}
              value={speedInput}
              onChangeText={handleSpeedInputChange}
              onBlur={normalizeSpeedInput}
              keyboardType="numeric"
              maxLength={3}
              selectTextOnFocus
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
