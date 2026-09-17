/**
 * Moment of the day for each activity of an ordered day plan. The planner
 * lays days out as hotel → morning → lunch → afternoon → dinner.
 */
export function daySlots(
  activities: { id: string; category: string | null }[],
): Map<string, string> {
  const slots = new Map<string, string>();
  let meals = 0;
  for (const act of activities) {
    if (act.category === 'hotel') slots.set(act.id, 'Nuit');
    else if (act.category === 'restaurant') slots.set(act.id, meals++ === 0 ? 'Déjeuner' : 'Dîner');
    else slots.set(act.id, meals === 0 ? 'Matin' : 'Après-midi');
  }
  return slots;
}
