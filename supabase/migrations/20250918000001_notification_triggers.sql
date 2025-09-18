-- Migration to add notification triggers for production

-- Function to create system notifications
CREATE OR REPLACE FUNCTION create_system_notification(
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_user_type TEXT DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_action_label TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- If user_type is specified, create notifications for all users of that type
  IF p_user_type IS NOT NULL THEN
    FOR target_user_id IN
      SELECT user_id FROM profiles WHERE user_type = p_user_type
    LOOP
      INSERT INTO notificacoes (
        user_id,
        titulo,
        mensagem,
        tipo,
        action_url,
        action_label,
        lida
      ) VALUES (
        target_user_id,
        p_title,
        p_message,
        p_type,
        p_action_url,
        p_action_label,
        false
      );
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for new beneficiarios
CREATE OR REPLACE FUNCTION notify_new_beneficiario()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for matriz users about new beneficiario
  PERFORM create_system_notification(
    'Novo Beneficiário Cadastrado',
    'Novo beneficiário ' || NEW.nome || ' foi cadastrado e aguarda confirmação de pagamento.',
    'info',
    'matriz',
    '/beneficiarios',
    'Ver Beneficiários'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for payment status changes
CREATE OR REPLACE FUNCTION notify_payment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if payment_status actually changed
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN

    -- Payment confirmed
    IF NEW.payment_status = 'paid' THEN
      PERFORM create_system_notification(
        'Pagamento Confirmado',
        'Pagamento do beneficiário ' || NEW.nome || ' foi confirmado. A adesão será processada automaticamente.',
        'success',
        'matriz',
        '/beneficiarios',
        'Ver Beneficiários'
      );

    -- Payment failed
    ELSIF NEW.payment_status = 'failed' THEN
      PERFORM create_system_notification(
        'Falha no Pagamento',
        'Pagamento do beneficiário ' || NEW.nome || ' falhou. Verifique os dados de pagamento.',
        'error',
        'matriz',
        '/beneficiarios',
        'Ver Beneficiários'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for cancelamentos
CREATE OR REPLACE FUNCTION notify_cancelamento()
RETURNS TRIGGER AS $$
DECLARE
  beneficiario_nome TEXT;
  beneficiario_cpf TEXT;
BEGIN
  -- Get beneficiario details
  SELECT nome, cpf INTO beneficiario_nome, beneficiario_cpf
  FROM beneficiarios
  WHERE id = NEW.beneficiario_id;

  -- Create notification for matriz users about cancelamento
  PERFORM create_system_notification(
    'Cancelamento Realizado',
    'Beneficiário ' || COALESCE(beneficiario_nome, 'N/A') ||
    ' (CPF: ' || COALESCE(beneficiario_cpf, 'N/A') || ') foi cancelado. Motivo: ' || NEW.motivo,
    'warning',
    'matriz',
    '/cancelamento',
    'Ver Cancelamentos'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_notify_new_beneficiario ON beneficiarios;
DROP TRIGGER IF EXISTS trigger_notify_payment_status_change ON beneficiarios;
DROP TRIGGER IF EXISTS trigger_notify_cancelamento ON cancelamentos;

-- Create triggers

-- Trigger for new beneficiarios (INSERT)
CREATE TRIGGER trigger_notify_new_beneficiario
  AFTER INSERT ON beneficiarios
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_beneficiario();

-- Trigger for payment status changes (UPDATE)
CREATE TRIGGER trigger_notify_payment_status_change
  AFTER UPDATE ON beneficiarios
  FOR EACH ROW
  EXECUTE FUNCTION notify_payment_status_change();

-- Trigger for new cancelamentos (INSERT)
CREATE TRIGGER trigger_notify_cancelamento
  AFTER INSERT ON cancelamentos
  FOR EACH ROW
  EXECUTE FUNCTION notify_cancelamento();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_system_notification TO authenticated;
GRANT EXECUTE ON FUNCTION notify_new_beneficiario TO authenticated;
GRANT EXECUTE ON FUNCTION notify_payment_status_change TO authenticated;
GRANT EXECUTE ON FUNCTION notify_cancelamento TO authenticated;