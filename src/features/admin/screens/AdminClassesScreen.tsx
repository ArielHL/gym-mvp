import { Alert, Text } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createClassTemplate } from '@/features/classes/services/classesService';

const schema = z.object({
  title: z.string().min(2),
  description: z.string().min(5),
  trainer_name: z.string().min(2),
  exercise_type: z.string().min(2),
  duration_minutes: z.coerce.number().min(10).max(240),
  day_of_week: z.coerce.number().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  capacity: z.coerce.number().min(1).max(500),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced']),
  location: z.string().min(2)
});

type FormValues = z.infer<typeof schema>;

export function AdminClassesScreen() {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      trainer_name: '',
      exercise_type: 'general fitness',
      duration_minutes: 60,
      day_of_week: 1,
      start_time: '18:00',
      capacity: 20,
      difficulty_level: 'beginner',
      location: 'Main Studio'
    }
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await createClassTemplate(values);
      Alert.alert('Created', 'Class template created successfully.');
      reset();
    } catch (error) {
      Alert.alert('Create failed', String((error as Error).message));
    }
  };

  return (
    <Screen>
      <Text className="mb-6 mt-4 text-2xl font-bold text-white">Admin: Add Class Template</Text>
      <Input control={control} name="title" label="Title" placeholder="Morning Strength" />
      <Input control={control} name="description" label="Description" placeholder="Full body circuit" />
      <Input control={control} name="trainer_name" label="Trainer" placeholder="Alex" />
      <Input control={control} name="exercise_type" label="Type" placeholder="strength" />
      <Input control={control} name="duration_minutes" label="Duration (minutes)" placeholder="60" />
      <Input control={control} name="day_of_week" label="Day (0=Sun ... 6=Sat)" placeholder="1" />
      <Input control={control} name="start_time" label="Start Time (HH:MM)" placeholder="18:00" />
      <Input control={control} name="capacity" label="Capacity" placeholder="20" />
      <Input
        control={control}
        name="difficulty_level"
        label="Difficulty (beginner/intermediate/advanced)"
        placeholder="beginner"
      />
      <Input control={control} name="location" label="Location" placeholder="Main Studio" />
      <Button label="Create Template" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
    </Screen>
  );
}
