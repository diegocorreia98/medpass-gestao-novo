import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface UserSettings {
  id: string
  user_id: string
  email_notifications: boolean
  push_notifications: boolean
  sms_notifications: boolean
  marketing_emails: boolean
  two_factor_enabled: boolean
  session_timeout: number
  theme: 'system' | 'light' | 'dark'
  language: string
  timezone: string
  created_at: string
  updated_at: string
}

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.functions.invoke('get-user-settings')
      
      if (error) {
        throw error
      }
      
      setSettings(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching user settings:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (updates: Partial<UserSettings>) => {
    try {
      setSaving(true)
      const { data, error } = await supabase.functions.invoke('update-user-settings', {
        body: updates
      })
      
      if (error) {
        throw error
      }
      
      setSettings(data.settings)
      setError(null)
      
      toast({
        title: "Configurações Atualizadas",
        description: "Suas configurações foram salvas com sucesso.",
      })

      return data.settings
    } catch (err) {
      console.error('Error updating user settings:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      
      toast({
        title: "Erro ao Salvar",
        description: errorMessage,
        variant: "destructive"
      })
      
      throw err
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  return {
    settings,
    loading,
    saving,
    error,
    refetch: fetchSettings,
    updateSettings,
  }
}