import React, { useRef, useCallback } from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";

const { width } = Dimensions.get("window");

export default function MainPageWithYouTube() {
  const playerRef = useRef(null);

  const onReady = useCallback(() => {
  }, []);

  return (
    <View style={styles.container}>
      <YoutubePlayer
        ref={playerRef}
        height={(width * 9) / 16}   // 16:9 ratio
        width={width}
        play={true}               // autoplay
        mute={false}              // set true if autoplay fails on iOS
        videoId="SvKotU_FZAg"      // ✅ iframe video ID
        onReady={onReady}
        webViewProps={{
          allowsInlineMediaPlayback: true,
          mediaPlaybackRequiresUserAction: false,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
