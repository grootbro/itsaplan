import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { useColors } from './theme';

export function SearchButton() {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Search issues"
      onPress={() => router.push('/search')}
      style={{ minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' }}
    >
      <Ionicons name="search-outline" size={24} color={colors.ink} />
    </Pressable>
  );
}
