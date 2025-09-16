import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import InputMask from 'react-input-mask';
import { validateCPF, validateCNPJ, validateEmail, validatePhone, validateCEP } from '@/utils/validators';
import { CustomerData } from '@/types/checkout';
import { User, Mail, Phone, MapPin, AlertCircle } from 'lucide-react';

interface CustomerFormProps {
  customerData: Partial<CustomerData>;
  onCustomerDataChange?: (data: Partial<CustomerData>) => void;
  onSubmit?: (data: CustomerData) => void;
  prefilled?: boolean;
}

const BRAZILIAN_STATES = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' }
];

export function CustomerForm({ customerData, onCustomerDataChange, onSubmit, prefilled = false }: CustomerFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingCEP, setIsLoadingCEP] = useState(false);

  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors };
    
    switch (field) {
      case 'name':
        if (!value.trim() || value.trim().length < 3) {
          newErrors[field] = 'Nome deve ter pelo menos 3 caracteres';
        } else {
          delete newErrors[field];
        }
        break;
        
      case 'email':
        if (!validateEmail(value)) {
          newErrors[field] = 'Email inválido';
        } else {
          delete newErrors[field];
        }
        break;
        
      case 'document':
        const docType = customerData.documentType || 'cpf';
        const isValid = docType === 'cpf' ? validateCPF(value) : validateCNPJ(value);
        if (!isValid) {
          newErrors[field] = docType === 'cpf' ? 'CPF inválido' : 'CNPJ inválido';
        } else {
          delete newErrors[field];
        }
        break;
        
      case 'phone':
        if (value && !validatePhone(value)) {
          newErrors[field] = 'Telefone inválido';
        } else {
          delete newErrors[field];
        }
        break;
        
      case 'zipcode':
        if (value && !validateCEP(value)) {
          newErrors[field] = 'CEP inválido';
        } else {
          delete newErrors[field];
        }
        break;
    }
    
    setErrors(newErrors);
  };

  const handleChange = (field: keyof CustomerData, value: string) => {
    if (onCustomerDataChange) {
      onCustomerDataChange({ ...customerData, [field]: value });
    }
    validateField(field, value);
  };

  const handleAddressChange = (field: string, value: string) => {
    const address = customerData.address || {
      street: '', number: '', neighborhood: '', city: '', state: '', zipcode: ''
    };
    if (onCustomerDataChange) {
      onCustomerDataChange({
        ...customerData,
        address: { ...address, [field]: value }
      });
    }
  };

  const fetchAddressByCEP = async (cep: string) => {
    const cleanCEP = cep.replace(/[^\d]/g, '');
    
    if (cleanCEP.length !== 8) return;
    
    setIsLoadingCEP(true);
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await response.json();
      
      if (!data.erro && onCustomerDataChange) {
        onCustomerDataChange({
          ...customerData,
          address: {
            ...customerData.address,
            street: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || '',
            zipcode: cleanCEP,
          }
        });
      }
    } catch (error) {
      console.error('Error fetching address:', error);
    } finally {
      setIsLoadingCEP(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
            <User className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Dados Pessoais</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
          <div className="space-y-3">
            <Label htmlFor="name" className="text-sm sm:text-base font-medium">
              Nome Completo *
            </Label>
            <Input
              id="name"
              placeholder="Seu nome completo"
              value={customerData.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`h-12 sm:h-14 text-base ${errors.name ? 'border-destructive' : ''}`}
            />
            {errors.name && (
              <div className="flex items-center text-destructive text-sm">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{errors.name}</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label htmlFor="email" className="text-sm sm:text-base font-medium">
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={customerData.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              className={`h-12 sm:h-14 text-base ${errors.email ? 'border-destructive' : ''}`}
            />
            {errors.email && (
              <div className="flex items-center text-destructive text-sm">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{errors.email}</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm sm:text-base font-medium">Tipo de Documento *</Label>
              <Select
                value={customerData.documentType || 'cpf'}
                onValueChange={(value: 'cpf' | 'cnpj') => {
                  if (onCustomerDataChange) {
                    onCustomerDataChange({ ...customerData, documentType: value });
                  }
                }}
              >
                <SelectTrigger className="h-12 sm:h-14 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpf">CPF (Pessoa Física)</SelectItem>
                  <SelectItem value="cnpj">CNPJ (Pessoa Jurídica)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="document" className="text-sm sm:text-base font-medium">
                {customerData.documentType === 'cnpj' ? 'CNPJ' : 'CPF'} *
              </Label>
              <InputMask
                mask={customerData.documentType === 'cnpj' ? '99.999.999/9999-99' : '999.999.999-99'}
                value={customerData.document || ''}
                onChange={(e) => handleChange('document', e.target.value)}
                disabled={false}
              >
                {(inputProps: any) => (
                  <Input
                    {...inputProps}
                    id="document"
                    placeholder={customerData.documentType === 'cnpj' ? '00.000.000/0000-00' : '000.000.000-00'}
                    className={`h-12 sm:h-14 text-base ${errors.document ? 'border-destructive' : ''}`}
                  />
                )}
              </InputMask>
              {errors.document && (
                <div className="flex items-center text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>{errors.document}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="phone" className="text-sm sm:text-base font-medium">
              Telefone
            </Label>
            <InputMask
              mask="(99) 99999-9999"
              value={customerData.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              disabled={false}
            >
              {(inputProps: any) => (
                <Input
                  {...inputProps}
                  id="phone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  className={`h-12 sm:h-14 text-base ${errors.phone ? 'border-destructive' : ''}`}
                />
              )}
            </InputMask>
            {errors.phone && (
              <div className="flex items-center text-destructive text-sm">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{errors.phone}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Endereço</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
          <div className="space-y-4">
            <div className="space-y-3">
              <Label htmlFor="zipcode" className="text-sm sm:text-base font-medium">CEP</Label>
              <div className="flex gap-3">
                <InputMask
                  mask="99999-999"
                  value={customerData.address?.zipcode || ''}
                  onChange={(e) => {
                    handleAddressChange('zipcode', e.target.value);
                    validateField('zipcode', e.target.value);
                  }}
                  disabled={false}
                >
                  {(inputProps: any) => (
                    <Input
                      {...inputProps}
                      id="zipcode"
                      placeholder="00000-000"
                      className={`flex-1 h-12 sm:h-14 text-base ${errors.zipcode ? 'border-destructive' : ''}`}
                    />
                  )}
                </InputMask>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fetchAddressByCEP(customerData.address?.zipcode || '')}
                  disabled={isLoadingCEP}
                  className="h-12 sm:h-14 px-4 sm:px-6 text-base whitespace-nowrap"
                >
                  {isLoadingCEP ? '...' : 'Buscar'}
                </Button>
              </div>
              {errors.zipcode && (
                <div className="flex items-center text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>{errors.zipcode}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="state" className="text-sm sm:text-base font-medium">Estado</Label>
              <Select
                value={customerData.address?.state || ''}
                onValueChange={(value) => handleAddressChange('state', value)}
              >
                <SelectTrigger className="h-12 sm:h-14 text-base">
                  <SelectValue placeholder="Selecione o estado" />
                </SelectTrigger>
                <SelectContent>
                  {BRAZILIAN_STATES.map((state) => (
                    <SelectItem key={state.value} value={state.value}>
                      {state.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <Label htmlFor="street" className="text-sm sm:text-base font-medium">Endereço</Label>
              <Input
                id="street"
                placeholder="Rua, Avenida, Alameda..."
                value={customerData.address?.street || ''}
                onChange={(e) => handleAddressChange('street', e.target.value)}
                className="h-12 sm:h-14 text-base"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="number" className="text-sm sm:text-base font-medium">Número</Label>
              <Input
                id="number"
                placeholder="123"
                value={customerData.address?.number || ''}
                onChange={(e) => handleAddressChange('number', e.target.value)}
                className="h-12 sm:h-14 text-base"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <Label htmlFor="neighborhood" className="text-sm sm:text-base font-medium">Bairro</Label>
              <Input
                id="neighborhood"
                placeholder="Nome do bairro"
                value={customerData.address?.neighborhood || ''}
                onChange={(e) => handleAddressChange('neighborhood', e.target.value)}
                className="h-12 sm:h-14 text-base"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="city" className="text-sm sm:text-base font-medium">Cidade</Label>
              <Input
                id="city"
                placeholder="Nome da cidade"
                value={customerData.address?.city || ''}
                onChange={(e) => handleAddressChange('city', e.target.value)}
                className="h-12 sm:h-14 text-base"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {onSubmit && (
        <div className="pt-4 sm:pt-6">
          <Button
            onClick={() => {
              const isFormValid = !!(
                customerData.name?.trim() &&
                customerData.email?.trim() &&
                customerData.document?.trim() &&
                customerData.documentType &&
                Object.keys(errors).length === 0
              );

              if (isFormValid) {
                onSubmit(customerData as CustomerData);
              }
            }}
            disabled={
              !customerData.name?.trim() ||
              !customerData.email?.trim() ||
              !customerData.document?.trim() ||
              Object.keys(errors).length > 0
            }
            className="w-full h-12 sm:h-14 text-base sm:text-lg touch-manipulation"
            size="lg"
          >
            Continuar para Pagamento
          </Button>
        </div>
      )}
    </div>
  );
}