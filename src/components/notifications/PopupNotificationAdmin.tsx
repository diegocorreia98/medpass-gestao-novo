import React, { useState, useCallback } from 'react';
import { Plus, Edit, Trash2, Eye, Upload, ExternalLink, Save, X } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

import { usePopupNotificationAdmin } from '@/hooks/usePopupNotifications';
import { popupNotificationService } from '@/services/popupNotificationService';
import { PopupNotificationPreview } from './PopupNotificationOverlay';
import type {
  PopupNotification,
  PopupNotificationInsert,
  PopupNotificationUpdate,
  PopupNotificationType,
  PopupTargetUserType,
} from '@/types/popup-notifications';

// Form validation schema
const popupFormSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(255, 'Título muito longo'),
  message: z.string().optional(),
  type: z.enum(['info', 'success', 'warning', 'error', 'promotional']),
  image_url: z.string().url('URL inválida').optional().or(z.literal('')),
  video_url: z.string().url('URL inválida').optional().or(z.literal('')),
  action_url: z.string().optional(),
  action_label: z.string().max(100, 'Label muito longo').optional(),
  close_label: z.string().max(50, 'Label muito longo').optional(),
  target_user_type: z.enum(['matriz', 'unidade', 'all']).optional(),
  show_on_login: z.boolean(),
  show_on_dashboard: z.boolean(),
  max_displays_per_user: z.number().min(0).max(999),
  priority: z.number().min(0).max(100),
  expires_at: z.string().optional(),
});

type PopupFormData = z.infer<typeof popupFormSchema>;

interface PopupFormProps {
  popup?: PopupNotification;
  onSave: (data: PopupNotificationInsert | PopupNotificationUpdate) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

function PopupForm({ popup, onSave, onCancel, isLoading }: PopupFormProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<Partial<PopupFormData>>({});

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PopupFormData>({
    resolver: zodResolver(popupFormSchema),
    defaultValues: {
      title: popup?.title || '',
      message: popup?.message || '',
      type: popup?.type || 'info',
      image_url: popup?.image_url || '',
      video_url: popup?.video_url || '',
      action_url: popup?.action_url || '',
      action_label: popup?.action_label || 'Entendi',
      close_label: popup?.close_label || 'Fechar',
      target_user_type: popup?.target_user_type || 'all',
      show_on_login: popup?.show_on_login ?? true,
      show_on_dashboard: popup?.show_on_dashboard ?? false,
      max_displays_per_user: popup?.max_displays_per_user || 1,
      priority: popup?.priority || 0,
      expires_at: popup?.expires_at ? new Date(popup.expires_at).toISOString().slice(0, 16) : '',
    },
  });

  // Watch form values for preview
  const watchedValues = watch();
  React.useEffect(() => {
    setPreviewData(watchedValues);
  }, [watchedValues]);

  const handleImageUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const result = await popupNotificationService.uploadImage(file);
      if (result.success && result.url) {
        setValue('image_url', result.url);
        setValue('video_url', ''); // Clear video URL when image is uploaded
        toast({
          title: 'Sucesso',
          description: 'Imagem enviada com sucesso!',
        });
      } else {
        throw new Error(result.error || 'Erro no upload');
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao enviar imagem',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [setValue, toast]);

  const handleVideoUrlChange = useCallback((url: string) => {
    if (url) {
      const validation = popupNotificationService.validateVideoUrl(url);
      if (!validation.isValid) {
        toast({
          title: 'URL inválida',
          description: validation.error,
          variant: 'destructive',
        });
        return;
      }
      setValue('image_url', ''); // Clear image URL when video URL is set
    }
    setValue('video_url', url);
  }, [setValue, toast]);

  const onSubmit = async (data: PopupFormData) => {
    try {
      // Validate media
      const mediaValidation = popupNotificationService.validateMedia(data.image_url, data.video_url);
      if (!mediaValidation.isValid) {
        toast({
          title: 'Erro de validação',
          description: mediaValidation.error,
          variant: 'destructive',
        });
        return;
      }

      // Prepare data for save
      const saveData = {
        ...data,
        image_url: data.image_url || undefined,
        video_url: data.video_url || undefined,
        action_url: data.action_url || undefined,
        action_label: data.action_label || undefined,
        close_label: data.close_label || undefined,
        expires_at: data.expires_at ? new Date(data.expires_at).toISOString() : undefined,
      };

      await onSave(saveData);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar popup',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form */}
      <div className="space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="title"
                      placeholder="Título da notificação"
                      className={errors.title ? 'border-red-500' : ''}
                    />
                  )}
                />
                {errors.title && (
                  <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="message">Mensagem</Label>
                <Controller
                  name="message"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      id="message"
                      placeholder="Conteúdo da notificação"
                      rows={3}
                    />
                  )}
                />
              </div>

              <div>
                <Label htmlFor="type">Tipo</Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Informativo</SelectItem>
                        <SelectItem value="success">Sucesso</SelectItem>
                        <SelectItem value="warning">Aviso</SelectItem>
                        <SelectItem value="error">Erro</SelectItem>
                        <SelectItem value="promotional">Promocional</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Media */}
          <Card>
            <CardHeader>
              <CardTitle>Mídia (Opcional)</CardTitle>
              <CardDescription>
                Adicione uma imagem OU um vídeo. Não é possível usar ambos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Upload de Imagem</Label>
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                    className="hidden"
                    id="image-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('image-upload')?.click()}
                    disabled={isUploading}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? 'Enviando...' : 'Selecionar Imagem'}
                  </Button>
                </div>
                <Controller
                  name="image_url"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="Ou cole a URL da imagem"
                      className="mt-2"
                    />
                  )}
                />
              </div>

              <div>
                <Label htmlFor="video_url">URL do Vídeo</Label>
                <Controller
                  name="video_url"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="video_url"
                      placeholder="https://youtube.com/watch?v=... ou https://vimeo.com/..."
                      onChange={(e) => handleVideoUrlChange(e.target.value)}
                    />
                  )}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Suporta YouTube, Vimeo ou arquivos diretos (.mp4, .webm, .ogg)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="action_url">URL de Ação</Label>
                <Controller
                  name="action_url"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="action_url"
                      placeholder="/dashboard ou https://exemplo.com"
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="action_label">Texto do Botão de Ação</Label>
                  <Controller
                    name="action_label"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="action_label"
                        placeholder="Entendi"
                      />
                    )}
                  />
                </div>

                <div>
                  <Label htmlFor="close_label">Texto do Botão Fechar</Label>
                  <Controller
                    name="close_label"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="close_label"
                        placeholder="Fechar"
                      />
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Targeting & Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Configurações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="target_user_type">Público Alvo</Label>
                <Controller
                  name="target_user_type"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os usuários</SelectItem>
                        <SelectItem value="matriz">Apenas Matriz</SelectItem>
                        <SelectItem value="unidade">Apenas Unidades</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_on_login">Mostrar no Login</Label>
                  <Controller
                    name="show_on_login"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="show_on_dashboard">Mostrar no Dashboard</Label>
                  <Controller
                    name="show_on_dashboard"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max_displays_per_user">Máximo de Exibições</Label>
                  <Controller
                    name="max_displays_per_user"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="max_displays_per_user"
                        type="number"
                        min="0"
                        max="999"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    )}
                  />
                  <p className="text-sm text-muted-foreground">0 = ilimitado</p>
                </div>

                <div>
                  <Label htmlFor="priority">Prioridade</Label>
                  <Controller
                    name="priority"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="priority"
                        type="number"
                        min="0"
                        max="100"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    )}
                  />
                  <p className="text-sm text-muted-foreground">Maior = mais importante</p>
                </div>
              </div>

              <div>
                <Label htmlFor="expires_at">Data de Expiração</Label>
                <Controller
                  name="expires_at"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="expires_at"
                      type="datetime-local"
                    />
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Salvando...' : popup ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </div>

      {/* Preview */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              Visualize como a notificação aparecerá para os usuários
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PopupNotificationPreview
              notification={previewData}
              className="min-h-[400px]"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Status badge component
function StatusBadge({ popup }: { popup: PopupNotification }) {
  const now = new Date();
  const isExpired = popup.expires_at && new Date(popup.expires_at) <= now;

  if (!popup.is_active) {
    return <Badge variant="secondary">Inativo</Badge>;
  }

  if (isExpired) {
    return <Badge variant="destructive">Expirado</Badge>;
  }

  return <Badge variant="default">Ativo</Badge>;
}

// Main admin component
export function PopupNotificationAdmin() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPopup, setEditingPopup] = useState<PopupNotification | null>(null);
  const [previewPopup, setPreviewPopup] = useState<PopupNotification | null>(null);

  const {
    allPopups,
    isLoading,
    error,
    createPopup,
    updatePopup,
    deletePopup,
    isCreating,
    isUpdating,
    isDeleting,
    refresh,
  } = usePopupNotificationAdmin();

  const { toast } = useToast();

  const handleCreateNew = () => {
    setEditingPopup(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (popup: PopupNotification) => {
    setEditingPopup(popup);
    setIsDialogOpen(true);
  };

  const handleDelete = async (popup: PopupNotification) => {
    if (!confirm(`Tem certeza que deseja excluir "${popup.title}"?`)) {
      return;
    }

    try {
      await deletePopup(popup.id);
      toast({
        title: 'Sucesso',
        description: 'Popup excluído com sucesso!',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir popup',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async (data: PopupNotificationInsert | PopupNotificationUpdate) => {
    try {
      if (editingPopup) {
        await updatePopup({ id: editingPopup.id, updates: data });
        toast({
          title: 'Sucesso',
          description: 'Popup atualizado com sucesso!',
        });
      } else {
        await createPopup(data as PopupNotificationInsert);
        toast({
          title: 'Sucesso',
          description: 'Popup criado com sucesso!',
        });
      }
      setIsDialogOpen(false);
      setEditingPopup(null);
    } catch (error: any) {
      throw error; // Let the form handle the error
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Erro ao carregar popups: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Popups</h1>
          <p className="text-muted-foreground">
            Crie e gerencie notificações popup para usuários
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Popup
        </Button>
      </div>

      {/* Popups List */}
      <Card>
        <CardHeader>
          <CardTitle>Popups Existentes</CardTitle>
          <CardDescription>
            {allPopups.length} popup{allPopups.length !== 1 ? 's' : ''} encontrado{allPopups.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : allPopups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum popup encontrado. Crie o primeiro!
            </div>
          ) : (
            <div className="space-y-4">
              {allPopups.map((popup) => (
                <div
                  key={popup.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{popup.title}</h3>
                      <StatusBadge popup={popup} />
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {popup.message || 'Sem mensagem'}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Tipo: {popup.type}</span>
                      <span>Alvo: {popup.target_user_type}</span>
                      <span>Prioridade: {popup.priority}</span>
                      {popup.expires_at && (
                        <span>
                          Expira: {new Date(popup.expires_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewPopup(popup)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(popup)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(popup)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPopup ? 'Editar Popup' : 'Criar Novo Popup'}
            </DialogTitle>
            <DialogDescription>
              {editingPopup
                ? 'Modifique as configurações do popup existente'
                : 'Configure um novo popup para exibir aos usuários'}
            </DialogDescription>
          </DialogHeader>
          <PopupForm
            popup={editingPopup || undefined}
            onSave={handleSave}
            onCancel={() => setIsDialogOpen(false)}
            isLoading={isCreating || isUpdating}
          />
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewPopup} onOpenChange={() => setPreviewPopup(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview: {previewPopup?.title}</DialogTitle>
          </DialogHeader>
          {previewPopup && (
            <PopupNotificationPreview
              notification={previewPopup}
              className="min-h-[400px]"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}