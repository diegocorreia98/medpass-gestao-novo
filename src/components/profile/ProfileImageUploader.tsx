import { useRef, useState } from "react";
import { Upload, Camera, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ProfileImageUploaderProps {
  currentImage?: string;
  userName: string;
  onImageChange: (imageUrl: string) => void;
  isEditing?: boolean;
  onUploadComplete?: () => void;
}

export function ProfileImageUploader({ 
  currentImage, 
  userName, 
  onImageChange, 
  isEditing = false,
  onUploadComplete
}: ProfileImageUploaderProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (file: File) => {
    // Enhanced security validations
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB limit
    
    // Validate MIME type
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Erro",
        description: "Tipo de arquivo não permitido. Use apenas JPG, PNG, GIF ou WebP.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

    // Validate file name (basic sanitization)
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '');
    if (sanitizedName.length === 0) {
      toast({
        title: "Erro",
        description: "Nome do arquivo inválido.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreviewImage(result);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleSaveImage = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      // Criar nome único e seguro para o arquivo
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      
      if (!fileExt || !allowedExtensions.includes(fileExt)) {
        throw new Error("Extensão de arquivo não permitida");
      }
      
      const timestamp = Date.now();
      const fileName = `${user.id}/avatar-${timestamp}.${fileExt}`;

      // Fazer upload do arquivo
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, selectedFile, {
          upsert: true // Sobrescrever se já existir
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL pública da imagem
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Atualizar perfil do usuário
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) {
        throw updateError;
      }

      onImageChange(publicUrl);
      onUploadComplete?.();
      toast({
        title: "Sucesso",
        description: "Foto de perfil atualizada com sucesso!",
      });

      setIsDialogOpen(false);
      setPreviewImage(null);
      setSelectedFile(null);
    } catch (error) {
      console.error('Erro ao salvar imagem:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar a foto de perfil. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      // Remover arquivo do storage (se existir)
      const fileName = `${user.id}/avatar.jpg`; // Tentar diferentes extensões
      await supabase.storage.from('avatars').remove([fileName]);
      await supabase.storage.from('avatars').remove([`${user.id}/avatar.png`]);
      await supabase.storage.from('avatars').remove([`${user.id}/avatar.jpeg`]);

      // Atualizar perfil do usuário
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', user.id);

      if (updateError) {
        throw updateError;
      }

      onImageChange("");
      onUploadComplete?.();
      toast({
        title: "Sucesso",
        description: "Foto de perfil removida com sucesso!",
      });

      setIsDialogOpen(false);
      setPreviewImage(null);
      setSelectedFile(null);
    } catch (error) {
      console.error('Erro ao remover imagem:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover a foto de perfil. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const userInitials = userName.split(' ').map(n => n[0]).join('');

  return (
    <div className="flex flex-col items-center space-y-4">
      <Avatar className="w-32 h-32">
        <AvatarImage src={currentImage} alt={userName} />
        <AvatarFallback className="text-2xl">
          {userInitials}
        </AvatarFallback>
      </Avatar>

      {isEditing && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Camera className="h-4 w-4" />
              Alterar Foto
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Alterar Foto de Perfil</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Preview Area */}
              <div className="flex justify-center">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={previewImage || currentImage} alt={userName} />
                  <AvatarFallback className="text-lg">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragging 
                    ? "border-primary bg-primary/5" 
                    : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  Arraste uma imagem aqui ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  PNG, JPG, GIF até 5MB
                </p>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={triggerFileInput}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Selecionar Arquivo
                </Button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {previewImage && (
                  <Button 
                    onClick={handleSaveImage} 
                    className="flex-1 gap-2"
                    disabled={isUploading}
                  >
                    {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isUploading ? "Salvando..." : "Salvar Foto"}
                  </Button>
                )}
                
                {(currentImage || previewImage) && (
                  <Button
                    variant="outline"
                    onClick={handleRemoveImage}
                    className="gap-2"
                    disabled={isUploading}
                  >
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                    Remover
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setPreviewImage(null);
                    setSelectedFile(null);
                  }}
                  disabled={isUploading}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}