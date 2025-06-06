import { Picker } from '@react-native-picker/picker';
import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import COLORS from '../components/colors';

export default function AdminScreen() {
  const [selectedVideo, setSelectedVideo] = useState('video1.mp4');
  const [countdown, setCountdown] = useState('');

  const videoList = ['video1.mp4', 'video2.mp4', 'video3.mp4', 'video4.mp4'];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Permissions</Text>

      <Text style={styles.label}>Select Video:</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectedVideo}
          onValueChange={(itemValue) => setSelectedVideo(itemValue)}
          style={styles.picker}
          dropdownIconColor={COLORS.text}
        >
          {videoList.map((video) => (
            <Picker.Item label={video} value={video} key={video} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Countdown (seconds):</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={countdown}
        onChangeText={setCountdown}
        placeholder="Enter countdown"
        placeholderTextColor={COLORS.text}
      />

      <View style={styles.buttonContainer}>
        <Button title="Start Takeover!" onPress={() => {}} color={COLORS.primary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 5,
  },
  pickerWrapper: {
    backgroundColor: COLORS.secondary,
    borderRadius: 5,
    marginBottom: 20,
  },
  picker: {
    color: COLORS.text,
    height: 50,
    width: '100%',
  },
  input: {
    borderColor: COLORS.primary,
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    color: COLORS.text,
    marginBottom: 20,
  },
  buttonContainer: {
    marginTop: 20,
  },
});
