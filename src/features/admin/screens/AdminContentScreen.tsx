import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { queryKeys } from "@/constants/queryKeys";
import { useAuthState } from "@/features/auth/hooks/useAuthState";
import { useClassTypes } from "@/features/class-types/hooks/useClassTypes";
import {
  type ClassType,
  updateClassType,
} from "@/features/class-types/services/classTypesService";
import {
  useHomeCarousel,
  useSaveHomeCarousel,
} from "@/features/home/hooks/useHomeCarousel";
import type { HomeCarouselSlide } from "@/features/home/services/homeContentService";

const slideSchema = z.object({
  title: z.string().min(1, "Titulo requerido"),
  sub: z.string().min(1, "Subtitulo requerido"),
  tag: z.string().min(1, "Etiqueta requerida"),
  tagColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Usa formato #RRGGBB"),
  imageUri: z.string().url("URL invalida"),
});

type SlideFormValues = z.infer<typeof slideSchema>;

const emptySlide: SlideFormValues = {
  title: "",
  sub: "",
  tag: "",
  tagColor: "#22D3EE",
  imageUri: "",
};

function toSlideFormValues(slide: HomeCarouselSlide): SlideFormValues {
  return {
    title: slide.title,
    sub: slide.sub,
    tag: slide.tag,
    tagColor: slide.tagColor,
    imageUri: slide.imageUri,
  };
}

export function AdminContentScreen() {
  const { role, initializing } = useAuthState();
  const queryClient = useQueryClient();
  const carouselQuery = useHomeCarousel();
  const saveCarouselMutation = useSaveHomeCarousel();
  const classTypesQuery = useClassTypes(role === "admin");

  const [slides, setSlides] = useState<HomeCarouselSlide[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const slideCounterRef = useRef(0);
  const [imageInputs, setImageInputs] = useState<Record<string, string>>({});

  const { control, handleSubmit, reset } = useForm<SlideFormValues>({
    resolver: zodResolver(slideSchema),
    defaultValues: emptySlide,
  });

  useEffect(() => {
    const loaded = carouselQuery.data?.slides;
    if (loaded && !carouselQuery.isError && !dirtyRef.current) {
      setSlides(loaded);
    }
  }, [carouselQuery.data, carouselQuery.isError]);

  useEffect(() => {
    const types = classTypesQuery.data ?? [];
    setImageInputs((prev) => {
      const next: Record<string, string> = { ...prev };
      for (const tipo of types) {
        if (next[tipo.id] === undefined) {
          next[tipo.id] = tipo.image_url ?? "";
        }
      }
      return next;
    });
  }, [classTypesQuery.data]);

  const markDirty = () => {
    dirtyRef.current = true;
  };

  const openNewSlide = () => {
    setEditingId(null);
    reset(emptySlide);
    setIsFormOpen(true);
  };

  const openEditSlide = (id: string) => {
    const slide = slides.find((item) => item.id === id);
    setEditingId(id);
    reset(slide ? toSlideFormValues(slide) : emptySlide);
    setIsFormOpen(true);
  };

  const cancelForm = () => {
    setEditingId(null);
    reset(emptySlide);
    setIsFormOpen(false);
  };

  const submitSlide = (values: SlideFormValues) => {
    markDirty();
    if (editingId !== null) {
      setSlides((prev) =>
        prev.map((slide) =>
          slide.id === editingId
            ? {
                id: slide.id,
                title: values.title,
                sub: values.sub,
                tag: values.tag,
                tagColor: values.tagColor,
                imageUri: values.imageUri,
              }
            : slide,
        ),
      );
    } else {
      const newSlide: HomeCarouselSlide = {
        id: `new-${++slideCounterRef.current}`,
        title: values.title,
        sub: values.sub,
        tag: values.tag,
        tagColor: values.tagColor,
        imageUri: values.imageUri,
      };
      setSlides((prev) => [...prev, newSlide]);
    }
    cancelForm();
  };

  const deleteSlide = (index: number) => {
    markDirty();
    setSlides((prev) => prev.filter((_, i) => i !== index));
  };

  const moveSlide = (index: number, direction: -1 | 1) => {
    markDirty();
    setSlides((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) {
        return prev;
      }
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const saveCarousel = () => {
    saveCarouselMutation.mutate(slides, {
      onSuccess: () => {
        dirtyRef.current = false;
        Alert.alert("Guardado", "Carrusel actualizado.");
      },
      onError: (error) => {
        Alert.alert("Error al guardar", (error as Error).message);
      },
    });
  };

  const imageSaveMutation = useMutation({
    mutationFn: async ({
      tipo,
      imageUrl,
    }: {
      tipo: ClassType;
      imageUrl: string;
    }) =>
      updateClassType(tipo.id, {
        nombre: tipo.nombre,
        slug: tipo.slug,
        descripcion: tipo.descripcion,
        is_active: tipo.is_active,
        sort_order: tipo.sort_order,
        image_url: imageUrl.trim() || null,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.classTypes }),
        queryClient.invalidateQueries({ queryKey: queryKeys.activeClassTypes }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.publicClassTemplates,
        }),
      ]);
      Alert.alert("Guardado", "Imagen del tipo de clase actualizada.");
    },
    onError: (error) => {
      Alert.alert("Error al guardar", (error as Error).message);
    },
  });

  const saveImage = (tipo: ClassType) => {
    imageSaveMutation.mutate({ tipo, imageUrl: imageInputs[tipo.id] ?? "" });
  };

  if (initializing || carouselQuery.isLoading || classTypesQuery.isLoading) {
    return (
      <Screen scroll={false}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#22D3EE" />
        </View>
      </Screen>
    );
  }

  if (role !== "admin") {
    return (
      <Screen scroll={false}>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-center text-2xl font-bold text-white">
            Acceso admin requerido
          </Text>
          <Text className="mt-2 text-center text-sm text-gray-500">
            Solo admins pueden editar el contenido de la app.
          </Text>
        </View>
      </Screen>
    );
  }

  const dirty = dirtyRef.current;

  return (
    <Screen>
      <View className="mb-5 mt-4">
        <Text className="text-2xl font-bold text-white">Contenido de la App</Text>
        <Text className="mt-1 text-sm text-gray-400">
          Edita el carrusel del inicio y las imagenes de los tipos de clase.
        </Text>
      </View>

      {/* Carousel section */}
      <View className="mb-6 rounded-2xl border border-border bg-surface p-4">
        <Text className="mb-1 text-base font-bold text-white">
          Carrusel Principal (Home)
        </Text>
        <Text className="mb-4 text-sm leading-5 text-gray-400">
          Selecciona el texto y las imagenes que se muestran en el carrusel del
          inicio.
        </Text>

        {isFormOpen ? (
          <>
            <Text className="mb-3 text-lg font-bold text-white">
              {editingId !== null ? "Editar Slide" : "Nueva Slide"}
            </Text>
            <Input
              control={control}
              name="title"
              label="Titulo"
              placeholder="Calisthenics\nFundamentals"
              autoCapitalize="sentences"
              multiline
            />
            <Input
              control={control}
              name="sub"
              label="Subtitulo"
              placeholder="Build real strength with bodyweight"
              autoCapitalize="sentences"
            />
            <Input
              control={control}
              name="tag"
              label="Etiqueta"
              placeholder="BEGINNER"
              autoCapitalize="characters"
            />
            <Input
              control={control}
              name="tagColor"
              label="Color de etiqueta"
              placeholder="#22D3EE"
              autoCapitalize="none"
            />
            <Input
              control={control}
              name="imageUri"
              label="URL de la imagen"
              placeholder="https://..."
              autoCapitalize="none"
            />
            <Button
              label={editingId !== null ? "Guardar Slide" : "Agregar Slide"}
              onPress={handleSubmit(submitSlide)}
            />
            <Button label="Cancelar" variant="secondary" onPress={cancelForm} />
          </>
        ) : (
          <>
            {carouselQuery.isError ? (
              <Text className="text-sm text-rose-400">
                No se pudieron cargar las slides del carrusel.
              </Text>
            ) : slides.length === 0 ? (
              <Text className="mb-3 text-sm text-gray-400">
                Aun no hay slides. Agrega la primera.
              </Text>
            ) : (
              slides.map((slide, index) => (
                <View
                  key={slide.id}
                  className="mb-3 rounded-xl border border-border bg-background p-3"
                >
                  <View className="flex-row gap-3">
                    {slide.imageUri ? (
                      <Image
                        source={{ uri: slide.imageUri }}
                        style={{ width: 64, height: 64, borderRadius: 10 }}
                        resizeMode="cover"
                      />
                    ) : null}
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-white">
                        {slide.title}
                      </Text>
                      <Text className="mt-0.5 text-xs text-gray-400">
                        {slide.sub}
                      </Text>
                      <View
                        style={{
                          alignSelf: "flex-start",
                          borderWidth: 1,
                          borderColor: slide.tagColor,
                          borderRadius: 4,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          marginTop: 6,
                        }}
                      >
                        <Text
                          style={{ color: slide.tagColor, fontSize: 10, fontWeight: "800" }}
                        >
                          {slide.tag}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="mt-3 flex-row items-center justify-between">
                    <View className="flex-row gap-2">
                      <Pressable
                        className="rounded-lg border border-border bg-surface px-3 py-2"
                        disabled={index === 0}
                        onPress={() => moveSlide(index, -1)}
                      >
                        <Text
                          className={`font-bold ${index === 0 ? "text-gray-600" : "text-white"}`}
                        >
                          ↑
                        </Text>
                      </Pressable>
                      <Pressable
                        className="rounded-lg border border-border bg-surface px-3 py-2"
                        disabled={index === slides.length - 1}
                        onPress={() => moveSlide(index, 1)}
                      >
                        <Text
                          className={`font-bold ${index === slides.length - 1 ? "text-gray-600" : "text-white"}`}
                        >
                          ↓
                        </Text>
                      </Pressable>
                    </View>
                    <View className="flex-row gap-2">
                      <Pressable
                        className="rounded-lg border border-cyan-400/50 bg-cyan-950/30 px-3 py-2"
                        onPress={() => openEditSlide(slide.id)}
                      >
                        <Text className="text-xs font-bold text-cyan-300">
                          Editar
                        </Text>
                      </Pressable>
                      <Pressable
                        className="rounded-lg border border-rose-400/50 bg-rose-950/30 px-3 py-2"
                        onPress={() => deleteSlide(index)}
                      >
                        <Text className="text-xs font-bold text-rose-300">
                          Eliminar
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))
            )}
            <Button
              label="Nueva Slide"
              variant="secondary"
              onPress={openNewSlide}
            />
            <Button
              label="Guardar Carrusel"
              onPress={saveCarousel}
              loading={saveCarouselMutation.isPending}
              disabled={!dirty || slides.length === 0}
            />
          </>
        )}
      </View>

      {/* Class type images section */}
      <View className="rounded-2xl border border-border bg-surface p-4">
        <Text className="mb-1 text-base font-bold text-white">
          Imagenes de Tipos de Clase
        </Text>
        <Text className="mb-4 text-sm leading-5 text-gray-400">
          Define la imagen que se muestra para cada tipo en la pantalla de
          clases.
        </Text>

        {classTypesQuery.isError ? (
          <Text className="text-sm text-rose-400">
            No se pudieron cargar los tipos de clase.
          </Text>
        ) : (classTypesQuery.data ?? []).length === 0 ? (
          <Text className="text-sm text-gray-400">
            Aun no hay tipos de clase.
          </Text>
        ) : (
          (classTypesQuery.data ?? []).map((tipo) => {
            const imageUrl = imageInputs[tipo.id] ?? "";
            return (
              <View
                key={tipo.id}
                className="mb-4 rounded-xl border border-border bg-background p-3"
              >
                <View className="flex-row items-center gap-3">
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={{ width: 56, height: 56, borderRadius: 10 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 10,
                        backgroundColor: "#1A1A1A",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text className="text-lg">🖼️</Text>
                    </View>
                  )}
                  <View className="flex-1">
                    <Text className="font-bold text-white">{tipo.nombre}</Text>
                    <Text className="mt-0.5 text-xs text-gray-400">
                      {tipo.slug}
                    </Text>
                  </View>
                </View>

                <View className="mt-3 flex-row items-center gap-2">
                  <TextInput
                    value={imageUrl}
                    onChangeText={(value) =>
                      setImageInputs((prev) => ({ ...prev, [tipo.id]: value }))
                    }
                    placeholder="https://..."
                    placeholderTextColor="#666666"
                    autoCapitalize="none"
                    className="h-12 flex-1 rounded-xl border border-border bg-surface px-3 text-white"
                  />
                  <Pressable
                    className="rounded-xl border border-cyan-400/50 bg-cyan-950/30 px-4 py-3"
                    disabled={imageSaveMutation.isPending}
                    onPress={() => saveImage(tipo)}
                  >
                    <Text className="text-xs font-bold text-cyan-300">
                      {imageSaveMutation.isPending ? "..." : "Guardar"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </View>
    </Screen>
  );
}