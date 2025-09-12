import { Building2, Store } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"

export function PanelSelector() {
  const { profile } = useAuth()

  if (!profile) return null

  return (
    <Badge variant="secondary" className="gap-2">
      {profile.user_type === 'matriz' ? (
        <>
          <Building2 className="h-3 w-3" />
          Matriz
        </>
      ) : (
        <>
          <Store className="h-3 w-3" />
          Unidade
        </>
      )}
    </Badge>
  )
}