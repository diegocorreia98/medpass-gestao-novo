import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { User, Mail, Phone, MapPin, Building, Calendar, Edit, Save, X, Loader2 } from "lucide-react"
import { ProfileImageUploader } from "@/components/profile/ProfileImageUploader"
import { ChangePasswordModal } from "@/components/profile/ChangePasswordModal"
import { useProfile } from "@/hooks/useProfile"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect } from "react"

export default function Profile() {
  const { profile, loading, updateProfile, refetch } = useProfile();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    bio: "",
  });

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        bio: "",
      });
    }
  }, [profile]);

  const handleImageChange = (imageUrl: string) => {
    // Image is already saved to Supabase in ProfileImageUploader
    // No need to do anything here as the profile will be refetched
  };

  const handleUploadComplete = () => {
    refetch();
  };

  const handleSave = async () => {
    if (!profile) return;

    setIsSaving(true);
    try {
      await updateProfile({
        full_name: formData.full_name,
      });
      setIsEditing(false);
    } catch (error) {
      // Error handling is done in useProfile hook
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        bio: "",
      });
    }
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center text-muted-foreground">
        Erro ao carregar perfil
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Perfil</h2>
          <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} className="gap-2">
            <Edit className="h-4 w-4" />
            Editar Perfil
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button 
              onClick={handleSave} 
              className="gap-2"
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleCancel} 
              className="gap-2"
              disabled={isSaving}
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Picture and Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Foto do Perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileImageUploader
              currentImage={profile.avatar_url || ""}
              userName={profile.full_name || "Usuário"}
              onImageChange={handleImageChange}
              onUploadComplete={handleUploadComplete}
              isEditing={isEditing}
            />
            <div className="text-center mt-4">
              <h3 className="font-semibold text-lg">{profile.full_name || "Usuário"}</h3>
              <Badge variant="secondary" className="mt-1">
                {profile.user_type === 'matriz' ? 'Matriz' : 'Unidade'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>
              Suas informações básicas de perfil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                {isEditing ? (
                  <Input
                    id="name"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  />
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {profile.full_name || "Não informado"}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email gerenciado pela autenticação
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Usuário</Label>
                <div className="flex items-center gap-2 text-sm">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  {profile.user_type === 'matriz' ? 'Matriz' : 'Unidade'}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Data de Criação</Label>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>ID do Usuário</Label>
              <p className="text-sm text-muted-foreground font-mono">
                {profile.user_id}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações da Conta</CardTitle>
          <CardDescription>
            Gerencie suas preferências e configurações de segurança
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Alterar Senha</h4>
              <p className="text-sm text-muted-foreground">
                Atualize sua senha para manter sua conta segura
              </p>
            </div>
            <Button 
              variant="outline"
              onClick={() => setIsChangePasswordModalOpen(true)}
            >
              Alterar Senha
            </Button>
          </div>


        </CardContent>
      </Card>

      <ChangePasswordModal
        open={isChangePasswordModalOpen}
        onOpenChange={setIsChangePasswordModalOpen}
      />
    </div>
  )
}