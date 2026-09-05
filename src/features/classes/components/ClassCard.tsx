import { Pressable, View } from 'react-native';
import type { GymClass } from '@/types/models';

import { Text } from "@/components/ui/Text";
interface ClassCardProps {
  gymClass: GymClass;
  onPress: () => void;
}

export function ClassCard({ gymClass, onPress }: ClassCardProps) {
  const full = gymClass.available_spots <= 0;
  return (
    <Pressable onPress={onPress} className="mb-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-white">{gymClass.title}</Text>
        <Text className={`text-xs font-semibold ${full ? 'text-rose-400' : 'text-emerald-400'}`}>
          {full ? 'FULL' : `${gymClass.available_spots} spots`}
        </Text>
      </View>
      <Text className="mt-1 text-sm text-slate-300">
        {gymClass.trainer_name} • {gymClass.exercise_type}
      </Text>
      <Text className="mt-1 text-sm text-slate-400">
        {gymClass.start_time} - {gymClass.end_time}
      </Text>
      <Text className="mt-2 text-xs uppercase text-accent-cyan">{gymClass.difficulty_level}</Text>
    </Pressable>
  );
}
