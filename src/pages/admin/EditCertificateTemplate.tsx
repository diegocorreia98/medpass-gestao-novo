import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TemplateEditor } from "@/components/certificates/TemplateEditor";
import {
  useCertificateTemplate,
  useCreateTemplateField,
  useUpdateTemplateField,
  useDeleteTemplateField,
  type TemplateField
} from "@/hooks/useCertificateTemplates";
import { toast } from "sonner";

export default function EditCertificateTemplate() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();

  // Hooks
  const { data, isLoading, error } = useCertificateTemplate(templateId || null);
  const createField = useCreateTemplateField();
  const updateField = useUpdateTemplateField();
  const deleteField = useDeleteTemplateField();

  // Estado local dos campos para edição em tempo real
  const [localFields, setLocalFields] = useState<TemplateField[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sincronizar com dados do servidor
  React.useEffect(() => {
    if (data?.fields) {
      setLocalFields(data.fields);
      setHasUnsavedChanges(false);
    }
  }, [data?.fields]);

  // Detectar mudanças não salvas
  const handleFieldsChange = (newFields: TemplateField[]) => {
    setLocalFields(newFields);
    setHasUnsavedChanges(true);
  };

  // Salvar todas as alterações
  const handleSave = async () => {
    if (!templateId || !data) return;

    try {
      // Identificar campos novos, atualizados e removidos
      const originalFields = data.fields;
      const currentFields = localFields;

      // Campos removidos (existem no original mas não no atual)
      const removedFields = originalFields.filter(
        original => !currentFields.find(current => current.id === original.id)
      );

      // Campos novos (não existem no original)
      const newFields = currentFields.filter(
        current => !originalFields.find(original => original.id === current.id)
      );

      // Campos atualizados (existem em ambos mas com diferenças)
      const updatedFields = currentFields.filter(current => {
        const original = originalFields.find(orig => orig.id === current.id);
        if (!original) return false;

        // Verificar se houve alterações significativas
        return (
          original.field_key !== current.field_key ||
          original.field_label !== current.field_label ||
          original.field_type !== current.field_type ||
          original.position_x !== current.position_x ||
          original.position_y !== current.position_y ||
          original.width !== current.width ||
          original.height !== current.height ||
          original.font_family !== current.font_family ||
          original.font_size !== current.font_size ||
          original.font_weight !== current.font_weight ||
          original.font_style !== current.font_style ||
          original.text_color !== current.text_color ||
          original.text_align !== current.text_align ||
          original.is_required !== current.is_required ||
          original.default_value !== current.default_value
        );
      });

      // Executar operações em paralelo onde possível
      const operations: Promise<any>[] = [];

      // Remover campos
      removedFields.forEach(field => {
        operations.push(
          new Promise((resolve, reject) => {
            deleteField.mutate(field.id, {
              onSuccess: resolve,
              onError: reject
            });
          })
        );
      });

      // Criar novos campos
      newFields.forEach(field => {
        operations.push(
          new Promise((resolve, reject) => {
            createField.mutate({
              template_id: templateId,
              field_key: field.field_key,
              field_label: field.field_label,
              field_type: field.field_type,
              position_x: field.position_x,
              position_y: field.position_y,
              width: field.width,
              height: field.height,
              font_family: field.font_family,
              font_size: field.font_size,
              font_weight: field.font_weight,
              font_style: field.font_style,
              text_color: field.text_color,
              text_align: field.text_align,
              is_required: field.is_required,
              default_value: field.default_value,
              display_order: field.display_order,
            }, {
              onSuccess: resolve,
              onError: reject
            });
          })
        );
      });

      // Atualizar campos existentes
      updatedFields.forEach(field => {
        operations.push(
          new Promise((resolve, reject) => {
            updateField.mutate({
              id: field.id,
              data: {
                field_key: field.field_key,
                field_label: field.field_label,
                field_type: field.field_type,
                position_x: field.position_x,
                position_y: field.position_y,
                width: field.width,
                height: field.height,
                font_family: field.font_family,
                font_size: field.font_size,
                font_weight: field.font_weight,
                font_style: field.font_style,
                text_color: field.text_color,
                text_align: field.text_align,
                is_required: field.is_required,
                default_value: field.default_value,
                display_order: field.display_order,
              }
            }, {
              onSuccess: resolve,
              onError: reject
            });
          })
        );
      });

      // Aguardar todas as operações
      await Promise.all(operations);

      setHasUnsavedChanges(false);
      toast.success("Template salvo com sucesso!");

    } catch (error) {
      console.error("Erro ao salvar template:", error);
      toast.error("Erro ao salvar alterações");
    }
  };

  // Gerar preview/teste do certificado
  const handlePreview = () => {
    toast.info("Funcionalidade de preview em desenvolvimento");
  };

  if (!templateId) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertDescription>
            ID do template não fornecido.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Carregando template...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertDescription>
            Erro ao carregar template. Verifique se o template existe e você tem permissão para acessá-lo.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/certificate-templates')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{data.template.name}</h1>
            <p className="text-muted-foreground">
              {data.template.description || "Edite os campos do template"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePreview}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>

          <Button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || createField.isPending || updateField.isPending || deleteField.isPending}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            {createField.isPending || updateField.isPending || deleteField.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {/* Indicador de mudanças não salvas */}
      {hasUnsavedChanges && (
        <Alert>
          <AlertDescription>
            Você tem alterações não salvas. Lembre-se de salvar antes de sair da página.
          </AlertDescription>
        </Alert>
      )}

      {/* Editor de Template */}
      <div className="bg-white rounded-lg border">
        <TemplateEditor
          templateId={templateId}
          templateImageUrl={data.template.template_image_url}
          imageWidth={data.template.image_width}
          imageHeight={data.template.image_height}
          fields={localFields}
          onFieldsChange={handleFieldsChange}
          onSave={handleSave}
        />
      </div>

      {/* Informações do Template */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-sm text-gray-700">Dimensões</h3>
          <p className="text-lg font-semibold">
            {data.template.image_width} × {data.template.image_height} px
          </p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-sm text-gray-700">Categoria</h3>
          <p className="text-lg font-semibold capitalize">
            {data.template.category}
          </p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-sm text-gray-700">Campos</h3>
          <p className="text-lg font-semibold">
            {localFields.length} campo{localFields.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}