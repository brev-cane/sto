import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const assetId = require('../../assets/videos/example-vid.mp4'); // Adjust path as needed

export default function VideoScreen() {
  const [countdown, setCountdown] = useState(5);
  const [videoReady, setVideoReady] = useState(false);

  // Set up the player (but don't play immediately)
  const player = useVideoPlayer(assetId, (player) => {
    player.loop = true;
  });

  const { isPlaying } = useEvent(player, 'playingChange', {
    isPlaying: player.playing,
  });

  // Countdown effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && player) {
      setVideoReady(true);
      player.play();
    }
  }, [countdown]);

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
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
