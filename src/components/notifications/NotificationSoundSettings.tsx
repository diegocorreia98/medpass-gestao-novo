import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Play } from "lucide-react";
import { useNotificationSound } from "@/hooks/useNotificationSound";

export function NotificationSoundSettings() {
  const {
    isEnabled,
    volume,
    toggleSounds,
    updateVolume,
    testSound
  } = useNotificationSound();

  const handleVolumeChange = (value: number[]) => {
    updateVolume(value[0]);
  };

  const handleTestSound = async () => {
    try {
      await testSound();
    } catch (error) {
      console.error('Erro ao testar som:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isEnabled ? (
            <Volume2 className="h-5 w-5 text-blue-500" />
          ) : (
            <VolumeX className="h-5 w-5 text-gray-400" />
          )}
          Configurações de Som
        </CardTitle>
        <CardDescription>
          Configure os sons de notificação do sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Sounds */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="sound-toggle" className="text-base">
              Sons de Notificação
            </Label>
            <div className="text-sm text-muted-foreground">
              Ativar sons para notificações do sistema
            </div>
          </div>
          <Switch
            id="sound-toggle"
            checked={isEnabled}
            onCheckedChange={toggleSounds}
          />
        </div>

        {/* Volume Control */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="volume-slider" className="text-base">
              Volume
            </Label>
            <span className="text-sm text-muted-foreground">
              {Math.round(volume * 100)}%
            </span>
          </div>
          <div className="px-3">
            <Slider
              id="volume-slider"
              min={0}
              max={1}
              step={0.1}
              value={[volume]}
              onValueChange={handleVolumeChange}
              disabled={!isEnabled}
              className="w-full"
            />
          </div>
        </div>

        {/* Test Sound */}
        <div className="space-y-3">
          <Label className="text-base">Testar Som</Label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestSound}
              disabled={!isEnabled}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Testar Som de Pagamento
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Clique para testar o som que toca quando um pagamento é confirmado
          </div>
        </div>

        {/* Sound Info */}
        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
          <h4 className="text-sm font-medium">ℹ️ Sobre os Sons</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Os sons de pagamento confirmado sempre tocam, mesmo se desabilitados</li>
            <li>• Os sons funcionam mesmo quando a aplicação está em segundo plano</li>
            <li>• Suas configurações são salvas automaticamente</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}