import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { showAlert } from "@/components/feedback/AppAlert";
import { Screen } from "@/components/ui/Screen";
import { queryKeys } from "@/constants/queryKeys";
import { useAuthState } from "@/features/auth/hooks/useAuthState";
import { isSuperAdmin } from "@/features/auth/role";
import {
  type AdminUser,
  fetchAdminUsers,
  updateUserRole,
} from "@/features/subscriptions/services/adminSubscriptionService";
import { colors } from "@/theme";
import { Text } from "@/components/ui/Text";

function roleLabel(role: string): string {
  if (role === "super_admin") {
    return "Super Admin";
  }
  if (role === "admin") {
    return "Admin";
  }
  return "Socio";
}

export function AdminRolesScreen() {
  const { user, role, initializing } = useAuthState();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const canManageRoles = isSuperAdmin(role);

  const usersQuery = useQuery({
    queryKey: queryKeys.adminUsers,
    queryFn: fetchAdminUsers,
    enabled: canManageRoles,
  });

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    const users = usersQuery.data ?? [];
    if (!query) {
      return users;
    }
    return users.filter((item) => {
      const name = (item.full_name ?? "").toLowerCase();
      const email = (item.email ?? "").toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [usersQuery.data, search]);

  const roleMutation = useMutation({
    mutationFn: ({ userId, nextRole }: { userId: string; nextRole: "admin" | "member" }) =>
      updateUserRole(userId, nextRole),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers });
    },
    onError: (error) => {
      showAlert("Error al guardar", (error as Error).message);
    },
  });

  const confirmRoleChange = (target: AdminUser, nextRole: "admin" | "member") => {
    const name = target.full_name || target.email || "este usuario";
    const title = nextRole === "admin" ? "Asignar admin" : "Quitar admin";
    const message =
      nextRole === "admin"
        ? `¿Dar rol de administrador a ${name}?`
        : `¿Quitar el rol de administrador a ${name}?`;

    showAlert(title, message, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Confirmar",
        onPress: () =>
          roleMutation.mutate({ userId: target.id, nextRole }),
      },
    ]);
  };

  if (initializing || usersQuery.isLoading) {
    return (
      <Screen edges={[]} scroll={false}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.accent.cyan} />
        </View>
      </Screen>
    );
  }

  if (!canManageRoles) {
    return (
      <Screen edges={[]} scroll={false}>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-center text-2xl font-bold text-white" variant="title">
            Acceso Super Admin requerido
          </Text>
          <Text className="mt-2 text-center text-sm text-muted">
            Solo un Super Admin puede cambiar roles.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <View className="mb-5 mt-4">
        <Text className="text-2xl font-bold text-white" variant="title">
          Roles de usuarios
        </Text>
        <Text className="mt-1 text-sm text-muted">
          Asigna o quita el rol de administrador. El Super Admin no se puede cambiar aquí.
        </Text>
      </View>

      <TextInput
        className="mb-4 h-12 rounded-xl border border-border bg-surface px-3 text-white"
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar por nombre o email..."
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View className="mb-6 rounded-2xl border border-border bg-surface p-4">
        <Text className="mb-3 text-base font-bold text-white">
          Usuarios ({filteredUsers.length})
        </Text>
        {usersQuery.isError ? (
          <Text className="text-sm text-rose-400">
            No se pudieron cargar los usuarios.
          </Text>
        ) : filteredUsers.length ? (
          filteredUsers.map((item) => {
            const isSelf = item.id === user?.id;
            const locked = item.role === "super_admin" || isSelf;
            const nextRole = item.role === "admin" ? "member" : "admin";

            return (
              <View
                key={item.id}
                className="mb-3 rounded-xl border border-border bg-background p-3"
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="font-bold text-white">
                      {item.full_name || item.email || "Usuario"}
                    </Text>
                    <Text className="mt-1 text-xs text-muted">
                      {item.email || "Sin email"}
                    </Text>
                    <Text className="mt-2 text-sm text-accent-cyan">
                      {roleLabel(item.role)}
                      {isSelf ? " · Tú" : ""}
                    </Text>
                  </View>
                  {locked ? (
                    <View className="rounded-full border border-border px-3 py-2">
                      <Text className="text-xs font-bold text-muted">
                        {item.role === "super_admin" ? "Bloqueado" : "Tu cuenta"}
                      </Text>
                    </View>
                  ) : (
                    <Pressable
                      className="rounded-full border border-accent-cyan/60 bg-accent-cyan/10 px-3 py-2"
                      disabled={roleMutation.isPending}
                      onPress={() => confirmRoleChange(item, nextRole)}
                    >
                      <Text className="text-xs font-bold text-accent-cyan">
                        {item.role === "admin" ? "Quitar admin" : "Hacer admin"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        ) : (
          <Text className="text-sm text-muted">No hay usuarios para mostrar.</Text>
        )}
      </View>
    </Screen>
  );
}
