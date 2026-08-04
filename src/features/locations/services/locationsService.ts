import { supabase } from "@/services/supabase/client";

export type Location = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type LocationInput = {
  name: string;
  description?: string | null;
  address?: string | null;
  is_active?: boolean;
};

export async function fetchLocations(): Promise<Location[]> {
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .order("is_active", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Location[];
}

export async function fetchActiveLocations(): Promise<Location[]> {
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Location[];
}

export async function createLocation(input: LocationInput): Promise<Location> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You need to be logged in as admin.");
  }

  const { data, error } = await supabase
    .from("locations")
    .insert({
      name: input.name,
      description: input.description || null,
      address: input.address || null,
      is_active: input.is_active ?? true,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Location;
}

export async function updateLocation(
  locationId: string,
  input: LocationInput,
): Promise<Location> {
  const { data, error } = await supabase
    .from("locations")
    .update({
      name: input.name,
      description: input.description || null,
      address: input.address || null,
      is_active: input.is_active ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", locationId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Location;
}

export async function setLocationActive(
  locationId: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("locations")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", locationId);

  if (error) {
    throw error;
  }
}
