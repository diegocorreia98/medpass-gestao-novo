import { useParams } from 'react-router-dom';
import { SubscriptionCheckoutForm } from '@/components/checkout/SubscriptionCheckoutForm';

export default function SubscriptionCheckout() {
  const { token } = useParams<{ token: string }>();

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Token inválido</h1>
          <p className="text-muted-foreground">Link de pagamento não encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SubscriptionCheckoutForm token={token} />
    </div>
  );
}