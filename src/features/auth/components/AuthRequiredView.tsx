import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

interface AuthRequiredViewProps {
  title: string;
  subtitle: string;
}

export function AuthRequiredView({ title, subtitle }: AuthRequiredViewProps) {
  const router = useRouter();

  return (
    <View style={s.center}>
      <Text style={{ fontSize: 56 }}>🔒</Text>
      <Text style={s.title}>{title}</Text>
      <Text style={s.subtitle}>{subtitle}</Text>
      <Pressable style={s.signInBtn} onPress={() => router.push('/auth')}>
        <Text style={s.signInBtnText}>Iniciar Sesión</Text>
      </Pressable>
      <Pressable style={s.registerBtn} onPress={() => router.push('/register')}>
        <Text style={s.registerBtnText}>Crear Cuenta</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  title: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 32,
    marginTop: 16,
  },
  subtitle: {
    color: '#555',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  signInBtn: {
    width: '100%',
    height: 54,
    backgroundColor: '#22D3EE',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  signInBtnText: { color: '#000', fontSize: 16, fontWeight: '800' },
  registerBtn: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  registerBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
