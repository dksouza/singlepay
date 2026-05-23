"use server";

export async function getVturbConfig() {
  // Retorna nulo inicialmente pois a tabela ainda não foi criada no banco
  return null;
}

export async function saveVturbConfig(url: string, token: string): Promise<{ success: boolean; error?: string }> {
  // Simula o salvamento com sucesso
  return { success: true };
}
