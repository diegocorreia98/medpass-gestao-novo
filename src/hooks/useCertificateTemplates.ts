import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types
export interface CertificateTemplate {
  id: string;
  name: string;
  description: string | null;
  template_image_url: string;
  thumbnail_url: string | null;
  image_width: number;
  image_height: number;
  is_active: boolean;
  is_default: boolean;
  category: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface TemplateField {
  id: string;
  template_id: string;
  field_key: string;
  field_label: string;
  field_type: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  font_family: string;
  font_size: number;
  font_weight: string;
  font_style: string;
  text_color: string;
  text_align: string;
  is_required: boolean;
  max_length: number | null;
  default_value: string | null;
  format_mask: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateData {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  is_active?: boolean;
  is_default?: boolean;
  template_file: File;
}

export interface CreateFieldData {
  template_id: string;
  field_key: string;
  field_label: string;
  field_type?: string;
  position_x: number;
  position_y: number;
  width?: number;
  height?: number;
  font_family?: string;
  font_size?: number;
  font_weight?: string;
  font_style?: string;
  text_color?: string;
  text_align?: string;
  is_required?: boolean;
  max_length?: number;
  default_value?: string;
  format_mask?: string;
  display_order?: number;
}

// Hook para buscar templates
export const useCertificateTemplates = () => {
  return useQuery({
    queryKey: ["certificate-templates"],
    queryFn: async () => {
      try {
        // Primeiro buscar os templates
        const { data: templates, error } = await supabase
          .from('certificate_templates')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          // Se a tabela não existe ainda (migrações não executadas)
          if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
            console.warn('Tabela certificate_templates ainda não existe. Execute as migrações primeiro.');
            return [];
          }
          throw error;
        }

        // Se não há templates, retornar array vazio
        if (!templates || templates.length === 0) {
          return [];
        }

        // Depois buscar a contagem de campos para cada template
        const templatesWithCount = await Promise.all(
          templates.map(async (template) => {
            try {
              const { count } = await supabase
                .from('template_fields')
                .select('*', { count: 'exact', head: true })
                .eq('template_id', template.id);

              return {
                ...template,
                tags: template.tags || [],
                field_count: count || 0
              };
            } catch (fieldError) {
              // Se não conseguir buscar campos, continua sem a contagem
              console.warn('Erro ao buscar campos do template:', template.id, fieldError);
              return {
                ...template,
                tags: template.tags || [],
                field_count: 0
              };
            }
          })
        );

        return templatesWithCount as (CertificateTemplate & { field_count: number })[];
      } catch (error) {
        console.error('Erro ao buscar templates:', error);
        // Retornar array vazio em caso de erro para não quebrar a interface
        return [];
      }
    },
  });
};

// Hook para buscar um template específico com seus campos
export const useCertificateTemplate = (templateId: string | null) => {
  return useQuery({
    queryKey: ["certificate-template", templateId],
    queryFn: async () => {
      if (!templateId) throw new Error("Template ID is required");

      try {
        // Tentar usar a função RPC primeiro
        const { data, error } = await supabase.rpc("get_template_with_fields", {
          p_template_id: templateId,
        });

        if (error) {
          // Se a função RPC não existir, fazer query manual
          if (error.code === 'PGRST202' || error.message.includes('function') || error.message.includes('does not exist')) {
            return await fallbackGetTemplateWithFields(templateId);
          }
          throw error;
        }

        if (!data || data.length === 0) {
          throw new Error("Template not found");
        }

        // Agrupar dados do template e campos
        const template: CertificateTemplate = {
          id: data[0].template_id,
          name: data[0].template_name,
          description: data[0].template_description,
          template_image_url: data[0].template_image_url,
          thumbnail_url: data[0].thumbnail_url,
          image_width: data[0].image_width,
          image_height: data[0].image_height,
          is_active: data[0].is_active,
          is_default: data[0].is_default,
          category: data[0].category,
          tags: data[0].tags || [],
          created_at: data[0].created_at,
          updated_at: data[0].created_at, // RPC doesn't return updated_at for template
          created_by: null,
          updated_by: null,
        };

        const fields: TemplateField[] = data
          .filter(row => row.field_id) // Only rows with fields
          .map(row => ({
            id: row.field_id,
            template_id: row.template_id,
            field_key: row.field_key,
            field_label: row.field_label,
            field_type: row.field_type,
            position_x: row.position_x,
            position_y: row.position_y,
            width: row.width,
            height: row.height,
            font_family: row.font_family,
            font_size: row.font_size,
            font_weight: row.font_weight,
            font_style: row.font_style,
            text_color: row.text_color,
            text_align: row.text_align,
            is_required: row.is_required,
            max_length: row.max_length,
            default_value: row.default_value,
            format_mask: row.format_mask,
            display_order: row.display_order,
            created_at: new Date().toISOString(), // Placeholder
            updated_at: new Date().toISOString(), // Placeholder
          }));

        return { template, fields };
      } catch (error) {
        console.error('Erro ao buscar template:', error);
        // Tentar método alternativo se houver erro
        return await fallbackGetTemplateWithFields(templateId);
      }
    },
    enabled: !!templateId,
  });
};

// Função auxiliar para buscar template quando RPC não está disponível
async function fallbackGetTemplateWithFields(templateId: string) {
  // Buscar template
  const { data: template, error: templateError } = await supabase
    .from('certificate_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (templateError) {
    if (templateError.code === 'PGRST116' || templateError.message.includes('does not exist')) {
      throw new Error("Sistema de templates ainda não está configurado. Execute as migrações primeiro.");
    }
    throw templateError;
  }

  if (!template) {
    throw new Error("Template not found");
  }

  // Buscar campos
  const { data: fields, error: fieldsError } = await supabase
    .from('template_fields')
    .select('*')
    .eq('template_id', templateId)
    .order('display_order');

  // Se erro ao buscar campos, continuar sem eles
  const templateFields = fieldsError ? [] : (fields || []);

  const formattedTemplate: CertificateTemplate = {
    ...template,
    tags: template.tags || [],
  };

  const formattedFields: TemplateField[] = templateFields.map(field => ({
    ...field,
    created_at: field.created_at || new Date().toISOString(),
    updated_at: field.updated_at || new Date().toISOString(),
  }));

  return { template: formattedTemplate, fields: formattedFields };
}

// Função auxiliar para validar arquivo de imagem
const validateImageFile = (file: File): void => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Tipo de arquivo não suportado: ${file.type}. Use JPG, PNG ou WebP.`);
  }

  if (file.size > maxSize) {
    throw new Error(`Arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(2)}MB. O limite é de 10MB.`);
  }

  // Validar extensão do arquivo também
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
  if (!fileExt || !allowedExtensions.includes(fileExt)) {
    throw new Error(`Extensão de arquivo não suportada: ${fileExt}. Use .jpg, .png ou .webp.`);
  }
};

// Hook para criar template
export const useCreateCertificateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTemplateData) => {
      try {
        // 0. Validar arquivo antes do upload
        validateImageFile(data.template_file);
        // 1. Upload da imagem para o storage
        const fileExt = data.template_file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('certificate-templates')
          .upload(fileName, data.template_file);

        if (uploadError) {
          // Log detalhado para debugging
          console.error('Upload error details:', {
            message: uploadError.message,
            statusCode: uploadError.statusCode,
            error: uploadError,
            fileName,
            fileSize: data.template_file.size,
            fileType: data.template_file.type
          });

          // Erros específicos do storage
          if (uploadError.message?.includes('Bucket not found')) {
            throw new Error('Bucket de templates não encontrado. Execute as migrações do storage primeiro.');
          }
          if (uploadError.message?.includes('mime type')) {
            throw new Error(`Tipo de arquivo não suportado: ${data.template_file.type}. Use JPG, PNG ou WebP.`);
          }
          if (uploadError.message?.includes('size')) {
            throw new Error('Arquivo muito grande. O limite é de 10MB.');
          }
          throw uploadError;
        }

        // 2. Obter URL pública da imagem
        const { data: { publicUrl } } = supabase.storage
          .from('certificate-templates')
          .getPublicUrl(fileName);

        // 3. Obter dimensões da imagem (aproximado - em produção usaria uma biblioteca)
        const img = new Image();
        const imgDimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
          img.onerror = () => reject(new Error('Erro ao carregar dimensões da imagem'));
          img.src = URL.createObjectURL(data.template_file);
        });

        // 4. Criar registro no banco
        const { data: template, error } = await supabase
          .from('certificate_templates')
          .insert({
            name: data.name,
            description: data.description,
            template_image_url: publicUrl,
            thumbnail_url: publicUrl, // Por enquanto usa a mesma imagem
            image_width: imgDimensions.width,
            image_height: imgDimensions.height,
            category: data.category || 'cursos',
            tags: data.tags || [],
            is_active: data.is_active !== false,
            is_default: data.is_default || false,
          })
          .select()
          .single();

        if (error) {
          // Se der erro na tabela mas o upload foi feito, limpar o arquivo
          try {
            await supabase.storage.from('certificate-templates').remove([fileName]);
          } catch (cleanupError) {
            console.warn('Não foi possível limpar arquivo após erro:', cleanupError);
          }

          if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
            throw new Error('Tabelas de templates não existem. Execute as migrações primeiro.');
          }
          throw error;
        }

        return template;
      } catch (error) {
        console.error('Erro detalhado na criação do template:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["certificate-templates"] });
      toast.success("Template criado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao criar template:", error);

      let errorMessage = "Erro ao criar template";

      if (error.message?.includes('Bucket not found') || error.message?.includes('bucket')) {
        errorMessage = "Sistema de templates não configurado. Execute as migrações primeiro.";
      } else if (error.message?.includes('does not exist')) {
        errorMessage = "Tabelas de templates não existem. Execute as migrações primeiro.";
      } else if (error.message?.includes('dimensões')) {
        errorMessage = "Erro ao processar a imagem. Tente outro arquivo.";
      }

      toast.error(errorMessage);
    },
  });
};

// Hook para atualizar template
export const useUpdateCertificateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CertificateTemplate> }) => {
      const { data: template, error } = await supabase
        .from('certificate_templates')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificate-templates"] });
      toast.success("Template atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar template:", error);
      toast.error("Erro ao atualizar template");
    },
  });
};

// Hook para excluir template
export const useDeleteCertificateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // 1. Buscar template para obter URL da imagem
      const { data: template, error: fetchError } = await supabase
        .from('certificate_templates')
        .select('template_image_url')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // 2. Excluir template do banco (os campos serão excluídos automaticamente por CASCADE)
      const { error } = await supabase
        .from('certificate_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // 3. Remover imagem do storage (opcional, pode falhar sem prejudicar a operação)
      try {
        if (template.template_image_url) {
          const fileName = template.template_image_url.split('/').pop();
          if (fileName) {
            await supabase.storage
              .from('certificate-templates')
              .remove([fileName]);
          }
        }
      } catch (storageError) {
        console.warn("Não foi possível remover imagem do storage:", storageError);
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificate-templates"] });
      toast.success("Template excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao excluir template:", error);
      toast.error("Erro ao excluir template");
    },
  });
};

// Hook para criar campo de template
export const useCreateTemplateField = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateFieldData) => {
      const { data: field, error } = await supabase
        .from('template_fields')
        .insert({
          template_id: data.template_id,
          field_key: data.field_key,
          field_label: data.field_label,
          field_type: data.field_type || 'text',
          position_x: data.position_x,
          position_y: data.position_y,
          width: data.width || 200,
          height: data.height || 30,
          font_family: data.font_family || 'Arial',
          font_size: data.font_size || 16,
          font_weight: data.font_weight || 'normal',
          font_style: data.font_style || 'normal',
          text_color: data.text_color || '#000000',
          text_align: data.text_align || 'center',
          is_required: data.is_required !== false,
          max_length: data.max_length,
          default_value: data.default_value,
          format_mask: data.format_mask,
          display_order: data.display_order || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return field;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["certificate-template", data.template_id] });
      queryClient.invalidateQueries({ queryKey: ["certificate-templates"] });
      toast.success("Campo adicionado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao criar campo:", error);
      toast.error("Erro ao adicionar campo");
    },
  });
};

// Hook para atualizar campo de template
export const useUpdateTemplateField = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TemplateField> }) => {
      const { data: field, error } = await supabase
        .from('template_fields')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return field;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["certificate-template", data.template_id] });
      toast.success("Campo atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar campo:", error);
      toast.error("Erro ao atualizar campo");
    },
  });
};

// Hook para excluir campo de template
export const useDeleteTemplateField = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: field, error } = await supabase
        .from('template_fields')
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return field;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["certificate-template", data.template_id] });
      toast.success("Campo removido com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao remover campo:", error);
      toast.error("Erro ao remover campo");
    },
  });
};