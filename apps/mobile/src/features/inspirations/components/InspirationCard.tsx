import * as WebBrowser from 'expo-web-browser';
import { Pressable, View } from 'react-native';

import { cleanDescription } from '@/domain/place';
import type { RouterOutputs } from '@/lib/trpc';
import { colors } from '@/theme/tokens';
import { Badge, Text } from '@/ui';
import { ArrowSquareOutIcon } from '@/ui/icons';

import { INSPIRATIONS_COPY } from '../constants';
import { formatHashtags, platformLabel, shortUrl } from '../lib/inspiration';

export type InspirationItem = RouterOutputs['inspiration']['listMine'][number];

export function InspirationCard({ inspiration }: { inspiration: InspirationItem }) {
  const description = cleanDescription(inspiration.description);
  const hashtags = formatHashtags(inspiration.tags);

  return (
    <Pressable
      role="link"
      aria-label={`${INSPIRATIONS_COPY.open} ${platformLabel(inspiration.platform)}`}
      accessibilityHint={shortUrl(inspiration.originalUrl)}
      onPress={() => WebBrowser.openBrowserAsync(inspiration.originalUrl)}
      className="gap-3 rounded-card bg-surface p-5 active:opacity-80"
    >
      <View className="flex-row items-center gap-3">
        <Badge label={platformLabel(inspiration.platform)} tone="brand" />
        <Text variant="caption" numberOfLines={1} className="flex-1">
          {shortUrl(inspiration.originalUrl)}
        </Text>
        <ArrowSquareOutIcon size={20} color={colors.ink.muted} />
      </View>

      {description ? (
        <Text tone="secondary" numberOfLines={3}>
          {description}
        </Text>
      ) : null}

      <Text variant="caption" tone={hashtags.length ? 'brand' : 'muted'}>
        {hashtags.length ? hashtags.join('  ') : INSPIRATIONS_COPY.noTags}
      </Text>
    </Pressable>
  );
}
