import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export class HttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export interface UserAccessProfile {
  user_type: string | null;
  unidade_id: string | null;
}

export interface BeneficiarioAccessRow {
  id: string;
  user_id: string | null;
  unidade_id: string | null;
}

export async function fetchUserAccessProfile(
  supabaseService: SupabaseClient,
  userId: string,
): Promise<UserAccessProfile | null> {
  const { data, error } = await supabaseService
    .from("profiles")
    .select("user_type, unidade_id")
    .eq("id", userId)
    .single();

  if (error) return null;
  return data as UserAccessProfile;
}

export async function fetchBeneficiarioAccessRow(
  supabaseService: SupabaseClient,
  beneficiarioId: string,
): Promise<BeneficiarioAccessRow> {
  const { data, error } = await supabaseService
    .from("beneficiarios")
    .select("id, user_id, unidade_id")
    .eq("id", beneficiarioId)
    .single();

  if (error || !data) {
    throw new HttpError(
      `Beneficiário com ID ${beneficiarioId} não encontrado no banco de dados`,
      404,
    );
  }

  return data as BeneficiarioAccessRow;
}

export function hasBeneficiarioPermission(params: {
  userId: string;
  userProfile: UserAccessProfile | null;
  beneficiario: BeneficiarioAccessRow;
}): boolean {
  const isMatriz = params.userProfile?.user_type === "matriz";
  if (isMatriz) return true;

  if (
    params.userProfile?.unidade_id &&
    params.beneficiario.unidade_id === params.userProfile.unidade_id
  ) {
    return true;
  }

  if (params.beneficiario.user_id === params.userId) return true;

  return false;
}

export async function assertBeneficiarioAccess(params: {
  supabaseService: SupabaseClient;
  userId: string;
  beneficiarioId: string;
}): Promise<{
  userProfile: UserAccessProfile | null;
  beneficiarioAccess: BeneficiarioAccessRow;
}> {
  const [userProfile, beneficiarioAccess] = await Promise.all([
    fetchUserAccessProfile(params.supabaseService, params.userId),
    fetchBeneficiarioAccessRow(params.supabaseService, params.beneficiarioId),
  ]);

  const allowed = hasBeneficiarioPermission({
    userId: params.userId,
    userProfile,
    beneficiario: beneficiarioAccess,
  });

  if (!allowed) {
    throw new HttpError("Beneficiário não encontrado ou sem permissão de acesso", 403);
  }

  return { userProfile, beneficiarioAccess };
}


