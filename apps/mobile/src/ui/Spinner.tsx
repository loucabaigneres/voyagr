import { ActivityIndicator } from 'react-native';

import { colors } from '@/theme/tokens';

export function Spinner({
  size = 'small',
  tone = 'brand',
}: {
  size?: 'small' | 'large';
  tone?: 'brand' | 'inverse';
}) {
  return (
    <ActivityIndicator size={size} color={tone === 'brand' ? colors.brand : colors.ink.inverse} />
  );
}
