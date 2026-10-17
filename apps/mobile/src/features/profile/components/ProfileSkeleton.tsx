import { View } from 'react-native';

import { Skeleton } from '@/ui';

export function ProfileSkeleton() {
  return (
    <View className="gap-8" aria-busy>
      <View className="flex-row items-center gap-4">
        <Skeleton className="size-[72px] rounded-full" />
        <View className="flex-1 gap-2">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-5 w-4/5" />
        </View>
      </View>
      <View className="flex-row gap-3">
        <Skeleton className="h-28 flex-1 rounded-card" />
        <Skeleton className="h-28 flex-1 rounded-card" />
      </View>
      <Skeleton className="h-40 rounded-card" />
    </View>
  );
}
