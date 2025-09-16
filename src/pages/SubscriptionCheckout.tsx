import { useParams } from 'react-router-dom';
import { SubscriptionCheckoutForm } from '@/components/checkout/SubscriptionCheckoutForm';

export default function SubscriptionCheckout() {
  const { token } = useParams<{ token: string }>();

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="text-center max-w-md mx-auto">
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6"
            aria-hidden="true"
          >
            <svg
              className="w-8 h-8 sm:w-10 sm:h-10 text-destructive"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-destructive mb-2 sm:mb-4">
            Token inválido
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Link de pagamento não encontrado ou expirado
          </p>
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