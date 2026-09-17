import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.screen} testID="home-screen">
      <Text accessibilityRole="header" style={styles.wordmark}>
        Emi
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  wordmark: { fontSize: 34, letterSpacing: 1 },
});
