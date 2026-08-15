import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuthState } from "@/features/auth/hooks/useAuthState";
import { updateMyProfile } from "@/services/userService";

const KeyboardWrapper =
  Platform.OS === "ios"
    ? ({ children }: { children: React.ReactNode }) => (
        <KeyboardAvoidingView className="flex-1" behavior="padding">
          {children}
        </KeyboardAvoidingView>
      )
    : ({ children }: { children: React.ReactNode }) => (
        <View className="flex-1">{children}</View>
      );

function AvatarPreview({ name, avatarUrl }: { name: string; avatarUrl: string }) {
  if (avatarUrl) {
    return (
      <View className="h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-accent-cyan/30 bg-surface">
        <Image
          source={{ uri: avatarUrl }}
          className="h-full w-full"
          resizeMode="cover"
        />
      </View>
    );
  }

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View className="h-24 w-24 items-center justify-center rounded-full border-2 border-accent-cyan/30 bg-surface">
      <Text className="text-3xl font-black text-accent-cyan">
        {initials || "?"}
      </Text>
    </View>
  );
}

export function EditProfileScreen() {
  const router = useRouter();
  const { user, displayName, avatarUrl, address, docNumber, refreshProfile } =
    useAuthState();

  const [name, setName] = useState(displayName || "");
  const [avatar, setAvatar] = useState(avatarUrl || "");
  const [domicilio, setDomicilio] = useState(address || "");
  const [documento, setDocumento] = useState(docNumber || "");
  const [saving, setSaving] = useState(false);

  const onCancel = () => {
    router.back();
  };

  const onSave = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      Alert.alert("Falta el nombre", "Ingresa tu nombre completo.");
      return;
    }

    setSaving(true);
    try {
      await updateMyProfile({
        full_name: trimmedName,
        avatar_url: avatar.trim() || null,
        address: domicilio.trim() || null,
        doc_number: documento.trim() || null,
      });
      await refreshProfile();
      router.back();
    } catch (err) {
      Alert.alert("Error al guardar", (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <KeyboardWrapper>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-7 py-6"
        >
          <View className="mb-6 flex-row items-center justify-between">
            <Pressable onPress={onCancel} className="px-2 py-2" hitSlop={8}>
              <Text className="text-base font-bold text-accent-cyan">Cancelar</Text>
            </Pressable>
            <Text className="text-lg font-black text-white">Editar Perfil</Text>
            <View className="w-20" />
          </View>

          <View className="mb-6 items-center">
            <AvatarPreview name={name} avatarUrl={avatar} />
            <Text className="mt-2 text-sm text-muted">
              {user?.email ?? ""}
            </Text>
          </View>

          <View className="gap-4 rounded-3xl border border-border bg-surface p-5">
            <View>
              <Text className="mb-2 text-sm font-semibold text-neutral-300">
                Nombre Completo
              </Text>
              <TextInput
                className="h-14 rounded-2xl border border-border bg-black px-4 text-base text-white"
                value={name}
                onChangeText={setName}
                placeholder="Jane Smith"
                placeholderTextColor="#666666"
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <View>
              <Text className="mb-2 text-sm font-semibold text-neutral-300">
                URL del Avatar
              </Text>
              <TextInput
                className="h-14 rounded-2xl border border-border bg-black px-4 text-base text-white"
                value={avatar}
                onChangeText={setAvatar}
                placeholder="https://ejemplo.com/avatar.jpg"
                placeholderTextColor="#666666"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>

            <View>
              <Text className="mb-2 text-sm font-semibold text-neutral-300">
                Domicilio
              </Text>
              <TextInput
                className="h-14 rounded-2xl border border-border bg-black px-4 text-base text-white"
                value={domicilio}
                onChangeText={setDomicilio}
                placeholder="Calle 123, Ciudad"
                placeholderTextColor="#666666"
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <View>
              <Text className="mb-2 text-sm font-semibold text-neutral-300">
                Documento
              </Text>
              <TextInput
                className="h-14 rounded-2xl border border-border bg-black px-4 text-base text-white"
                value={documento}
                onChangeText={setDocumento}
                placeholder="DNI, pasaporte, etc."
                placeholderTextColor="#666666"
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>
          </View>

          <View className="mt-6 flex-row gap-3">
            <Pressable
              onPress={onCancel}
              className="h-14 flex-1 items-center justify-center rounded-2xl border border-border bg-surface"
            >
              <Text className="text-base font-bold text-white">Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={onSave}
              disabled={saving}
              className={`h-14 flex-1 items-center justify-center rounded-2xl bg-accent-cyan ${saving ? "opacity-60" : ""}`}
            >
              {saving ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text className="text-base font-black text-black">Guardar</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardWrapper>
    </SafeAreaView>
  );
}