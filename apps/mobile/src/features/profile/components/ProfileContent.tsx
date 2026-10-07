import { View } from 'react-native';

import { InspirationList } from '@/features/inspirations/components/InspirationList';
import { TripList } from '@/features/trips/components/TripList';
import { SegmentedControl } from '@/ui';

import { PROFILE_SEGMENTS, type ProfileSegment } from '../constants';

export interface ProfileContentProps {
  segment: ProfileSegment;
  onSegmentChange: (segment: ProfileSegment) => void;
}

/** "Voyages | Inspirations" switch. */
export function ProfileContent({ segment, onSegmentChange }: ProfileContentProps) {
  return (
    <View className="gap-4">
      <SegmentedControl segments={PROFILE_SEGMENTS} value={segment} onChange={onSegmentChange} />
      {segment === 'trips' ? <TripList /> : <InspirationList />}
    </View>
  );
}
