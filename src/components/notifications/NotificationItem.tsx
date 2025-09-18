import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle, AlertTriangle, Info, XCircle, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import type { Notification } from "@/hooks/useNotifications";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onRemove: (id: string) => void;
}

const typeIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

const typeColors = {
  info: "text-blue-500",
  success: "text-green-500",
  warning: "text-yellow-500",
  error: "text-red-500",
};

export function NotificationItem({ notification, onMarkAsRead, onRemove }: NotificationItemProps) {
  const Icon = typeIcons[notification.type];
  const iconColor = typeColors[notification.type];
  const navigate = useNavigate();

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!notification.actionUrl) return;

    // Check if it's an external URL or internal route
    if (notification.actionUrl.startsWith('http://') || notification.actionUrl.startsWith('https://')) {
      // External URL - open in new tab
      window.open(notification.actionUrl, '_blank', 'noopener,noreferrer');
    } else {
      // Internal route - use React Router navigation
      navigate(notification.actionUrl);
    }
  };

  const timeAgo = formatDistanceToNow(notification.createdAt, {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <div
      className={cn(
        "relative p-3 rounded-lg border mb-2 cursor-pointer transition-colors",
        notification.read 
          ? "bg-background border-border" 
          : "bg-muted/50 border-primary/20 shadow-sm"
      )}
      onClick={handleClick}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 opacity-60 hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(notification.id);
        }}
      >
        <X className="h-3 w-3" />
      </Button>

      <div className="flex items-start gap-3 pr-8">
        <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", iconColor)} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium truncate">{notification.title}</h4>
            {!notification.read && (
              <Badge variant="secondary" className="h-2 w-2 rounded-full p-0" />
            )}
          </div>
          
          <p className="text-xs text-muted-foreground leading-relaxed mb-2">
            {notification.message}
          </p>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
            
            {notification.actionUrl && notification.actionLabel && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={handleActionClick}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                {notification.actionLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}