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
  console.log("[ACCESS] Buscando profile para userId:", userId);

  // 1) Tentar por user_id (padrão do AuthContext.fetchProfile)
  const byUserId = await supabaseService
    .from("profiles")
    .select("user_type, unidade_id")
    .eq("user_id", userId)
    .maybeSingle();

  console.log("[ACCESS] Query por user_id:", { data: byUserId.data, error: byUserId.error?.message });

  if (byUserId.data) {
    console.log("[ACCESS] Profile encontrado por user_id:", byUserId.data);
    return byUserId.data as UserAccessProfile;
  }

  // 2) Tentar por id (compatibilidade)
  const byId = await supabaseService
    .from("profiles")
    .select("user_type, unidade_id")
    .eq("id", userId)
    .maybeSingle();

  console.log("[ACCESS] Query por id:", { data: byId.data, error: byId.error?.message });

  if (byId.data) {
    console.log("[ACCESS] Profile encontrado por id:", byId.data);
    return byId.data as UserAccessProfile;
  }

  // 3) Última tentativa: buscar qualquer profile que tenha esse userId em algum campo
  // Isso ajuda a diagnosticar se o schema é diferente do esperado
  const debug = await supabaseService
    .from("profiles")
    .select("id, user_id, user_type, unidade_id")
    .or(`id.eq.${userId},user_id.eq.${userId}`)
    .limit(1)
    .maybeSingle();

  console.log("[ACCESS] Debug query (or):", { data: debug.data, error: debug.error?.message });

  if (debug.data) {
    console.log("[ACCESS] Profile encontrado via debug:", debug.data);
    return { user_type: debug.data.user_type, unidade_id: debug.data.unidade_id } as UserAccessProfile;
  }

  console.error("[ACCESS] Profile NÃO encontrado para userId:", userId);
  return null;
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
  const userType = (params.userProfile?.user_type ?? "").toString().toLowerCase();
  const isMatriz = userType === "matriz";
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

  let allowed = hasBeneficiarioPermission({
    userId: params.userId,
    userProfile,
    beneficiario: beneficiarioAccess,
  });

  // Se ainda não permitido, verificar se o usuário é dono de uma unidade via `unidades.user_id`
  // (o sistema associa usuários tipo "unidade" à sua unidade pela tabela unidades, não pelo profiles)
  if (!allowed && beneficiarioAccess.unidade_id) {
    console.log("[ACCESS] Verificando se usuário é dono da unidade via unidades.user_id...");
    const { data: unidadeData } = await params.supabaseService
      .from("unidades")
      .select("id, user_id")
      .eq("id", beneficiarioAccess.unidade_id)
      .eq("user_id", params.userId)
      .maybeSingle();

    if (unidadeData) {
      console.log("[ACCESS] ✅ Usuário é dono da unidade:", unidadeData.id);
      allowed = true;
    }
  }

  if (!allowed) {
    console.error("[ACCESS] ❌ Sem permissão para beneficiário", {
      userId: params.userId,
      userType: (userProfile?.user_type ?? "").toString(),
      userUnidadeId: userProfile?.unidade_id ?? null,
      beneficiarioId: beneficiarioAccess.id,
      beneficiarioUserId: beneficiarioAccess.user_id ?? null,
      beneficiarioUnidadeId: beneficiarioAccess.unidade_id ?? null,
    });
    throw new HttpError("Beneficiário não encontrado ou sem permissão de acesso", 403);
  }

  return { userProfile, beneficiarioAccess };
}


