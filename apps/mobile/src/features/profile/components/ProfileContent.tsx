import { View } from 'react-native';

import { InspirationList } from '@/features/inspirations/components/InspirationList';
import { TripList } from '@/features/trips/components/TripList';
import { SegmentedControl, type Segment } from '@/ui';

export type ProfileSegment = 'trips' | 'inspirations';

const SEGMENTS: readonly Segment<ProfileSegment>[] = [
  { value: 'trips', label: 'Voyages' },
  { value: 'inspirations', label: 'Inspirations' },
];

export interface ProfileContentProps {
  segment: ProfileSegment;
  onSegmentChange: (segment: ProfileSegment) => void;
}

/** "Voyages | Inspirations" switch. */
export function ProfileContent({ segment, onSegmentChange }: ProfileContentProps) {
  return (
    <View className="gap-4">
      <SegmentedControl segments={SEGMENTS} value={segment} onChange={onSegmentChange} />
      {segment === 'trips' ? <TripList /> : <InspirationList />}
    </View>
  );
}
