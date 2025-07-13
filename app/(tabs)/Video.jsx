import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import COLORS from '../components/colors';
import { wasAccessedViaNotification } from '../components/notifications';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const assetId = require('../../assets/videos/example-vid.mp4');

export default function VideoScreen() {
  const [countdown, setCountdown] = useState(5);
  const [videoReady, setVideoReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  const player = useVideoPlayer(assetId, (player) => {
    player.loop = true;
  });

  const { isPlaying } = useEvent(player, 'playingChange', {
    isPlaying: player.playing,
  });

  useEffect(() => {
    if (wasAccessedViaNotification()) {
      setAllowed(true);
    }
  }, []);

  useEffect(() => {
    if (!allowed) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && player) {
      setVideoReady(true);
      player.play();
    }
  }, [countdown, allowed]);

  if (!allowed) {
    return (
      <View style={styles.contentContainer}>
        <Text style={styles.restricted}>🔒 Access Denied. Please use the Demo notification to view this video.</Text>
      </View>
    );
  }

  return (
    <View style={styles.contentContainer}>
      <View style={styles.videoWrapper} pointerEvents="none">
        <VideoView style={styles.video} player={player} />
        {countdown > 0 && (
          <View style={styles.countdownOverlay}>
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  videoWrapper: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  countdownOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: screenWidth,
    height: screenHeight,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  countdownText: {
    fontSize: 72,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  restricted: {
    fontSize: 20,
    color: COLORS.text,
    textAlign: 'center',
  },
});
