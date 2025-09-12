import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, CreditCard, AlertCircle } from 'lucide-react';
import InputMask from 'react-input-mask';
import { validateCreditCard, getCreditCardBrand } from '@/utils/validators';
import { CardData } from '@/types/checkout';

interface CardFormProps {
  cardData: Partial<CardData>;
  installments: number;
  onCardDataChange: (data: Partial<CardData>) => void;
  onInstallmentsChange: (installments: number) => void;
  planPrice: number;
  onSubmit?: (cardData: CardData, installments: number) => void;
  isProcessing?: boolean;
}

export function CardForm({ 
  cardData, 
  installments, 
  onCardDataChange, 
  onInstallmentsChange, 
  planPrice,
  onSubmit,
  isProcessing = false
}: CardFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = (field: keyof CardData, value: string) => {
    const newErrors = { ...errors };
    
    switch (field) {
      case 'number':
        if (!validateCreditCard(value)) {
          newErrors[field] = 'Número do cartão inválido';
        } else {
          delete newErrors[field];
        }
        break;
        
      case 'cvv':
        const cleanCvv = value.replace(/\D/g, '');
        if (cleanCvv.length < 3 || cleanCvv.length > 4) {
          newErrors[field] = 'CVV deve ter 3 ou 4 dígitos';
        } else {
          delete newErrors[field];
        }
        break;
        
      case 'holder_name':
        if (!value.trim() || value.trim().length < 3) {
          newErrors[field] = 'Nome deve ter pelo menos 3 caracteres';
        } else {
          delete newErrors[field];
        }
        break;
        
      case 'expiry_month':
        const month = parseInt(value);
        if (month < 1 || month > 12) {
          newErrors[field] = 'Mês inválido';
        } else {
          delete newErrors[field];
        }
        break;
        
      case 'expiry_year':
        const currentYear = new Date().getFullYear();
        const year = parseInt(value);
        if (year < currentYear || year > currentYear + 20) {
          newErrors[field] = 'Ano inválido';
        } else {
          delete newErrors[field];
        }
        break;
    }
    
    setErrors(newErrors);
  };

  const handleChange = (field: keyof CardData, value: string) => {
    onCardDataChange({ ...cardData, [field]: value });
    validateField(field, value);
  };

  const cardBrand = getCreditCardBrand(cardData.number || '');
  
  // Generate installments options
  const installmentOptions = [];
  for (let i = 1; i <= 12; i++) {
    const installmentPrice = planPrice / i;
    installmentOptions.push({
      value: i,
      label: i === 1 
        ? `À vista - R$ ${planPrice.toFixed(2).replace('.', ',')}`
        : `${i}x de R$ ${installmentPrice.toFixed(2).replace('.', ',')} ${i > 6 ? '(com juros)' : 'sem juros'}`
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="w-5 h-5" />
          <span>Dados do Cartão</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="card-number">Número do Cartão</Label>
          <div className="relative">
            <InputMask
              mask="9999 9999 9999 9999"
              value={cardData.number || ''}
              onChange={(e) => handleChange('number', e.target.value)}
              disabled={false}
            >
              {(inputProps: any) => (
                <Input
                  {...inputProps}
                  id="card-number"
                  placeholder="1234 5678 9012 3456"
                  className={errors.number ? 'border-destructive' : ''}
                />
              )}
            </InputMask>
            
            {cardBrand !== 'generic' && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className={`w-8 h-5 rounded text-xs flex items-center justify-center font-bold ${
                  cardBrand === 'visa' ? 'bg-blue-600 text-white' :
                  cardBrand === 'mastercard' ? 'bg-red-600 text-white' :
                  cardBrand === 'amex' ? 'bg-green-600 text-white' :
                  'bg-gray-400 text-white'
                }`}>
                  {cardBrand.toUpperCase().slice(0, 4)}
                </div>
              </div>
            )}
          </div>
          {errors.number && (
            <div className="flex items-center text-destructive text-sm">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.number}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="card-name">Nome no Cartão</Label>
          <Input
            id="card-name"
            placeholder="Nome conforme impresso no cartão"
            value={cardData.holder_name || ''}
            onChange={(e) => handleChange('holder_name', e.target.value.toUpperCase())}
            className={errors.holder_name ? 'border-destructive' : ''}
          />
          {errors.holder_name && (
            <div className="flex items-center text-destructive text-sm">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.holder_name}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="expiry-month">Mês</Label>
            <Select 
              value={cardData.expiry_month || ''} 
              onValueChange={(value) => handleChange('expiry_month', value)}
            >
              <SelectTrigger className={errors.expiry_month ? 'border-destructive' : ''}>
                <SelectValue placeholder="MM" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <SelectItem key={month} value={month.toString().padStart(2, '0')}>
                    {month.toString().padStart(2, '0')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.expiry_month && (
              <div className="text-destructive text-xs">{errors.expiry_month}</div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiry-year">Ano</Label>
            <Select 
              value={cardData.expiry_year || ''} 
              onValueChange={(value) => handleChange('expiry_year', value)}
            >
              <SelectTrigger className={errors.expiry_year ? 'border-destructive' : ''}>
                <SelectValue placeholder="AAAA" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 21 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.expiry_year && (
              <div className="text-destructive text-xs">{errors.expiry_year}</div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cvv">CVV</Label>
            <InputMask
              mask="999"
              maskChar=""
              value={cardData.cvv || ''}
              onChange={(e) => handleChange('cvv', e.target.value)}
              disabled={false}
            >
              {(inputProps: any) => (
                <Input
                  {...inputProps}
                  id="cvv"
                  placeholder="123"
                  type="password"
                  className={errors.cvv ? 'border-destructive' : ''}
                />
              )}
            </InputMask>
            {errors.cvv && (
              <div className="text-destructive text-xs">{errors.cvv}</div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Parcelamento</Label>
          <Select 
            value={installments.toString()} 
            onValueChange={(value) => onInstallmentsChange(parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {installmentOptions.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {onSubmit && (
          <div className="pt-4">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isProcessing}
              onClick={() => {
                if (onSubmit) {
                  const completeCardData: CardData = {
                    holder_name: cardData.holder_name!,
                    number: cardData.number!,
                    cvv: cardData.cvv!,
                    expiry_month: cardData.expiry_month!,
                    expiry_year: cardData.expiry_year!
                  };
                  onSubmit(completeCardData, installments);
                }
              }}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criptografando dados...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Processar Pagamento
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}