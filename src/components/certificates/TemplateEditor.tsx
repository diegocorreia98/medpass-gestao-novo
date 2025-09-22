import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Move, Plus, Save, Eye, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

// Types
interface TemplateField {
  id: string;
  field_key: string;
  field_label: string;
  field_type: 'text' | 'date' | 'number' | 'qr_code';
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  font_family: string;
  font_size: number;
  font_weight: string;
  font_style: string;
  text_color: string;
  text_align: 'left' | 'center' | 'right';
  is_required: boolean;
  max_length?: number;
  default_value?: string;
  format_mask?: string;
  display_order: number;
}

interface TemplateEditorProps {
  templateId: string;
  templateImageUrl: string;
  imageWidth: number;
  imageHeight: number;
  fields: TemplateField[];
  onFieldsChange: (fields: TemplateField[]) => void;
  onSave: () => void;
}

// Campo padrão para novos campos
const createDefaultField = (x: number, y: number): Omit<TemplateField, 'id'> => ({
  field_key: '',
  field_label: 'Novo Campo',
  field_type: 'text',
  position_x: x,
  position_y: y,
  width: 200,
  height: 30,
  font_family: 'Arial',
  font_size: 16,
  font_weight: 'normal',
  font_style: 'normal',
  text_color: '#000000',
  text_align: 'center',
  is_required: true,
  display_order: 0,
});

export function TemplateEditor({
  templateId,
  templateImageUrl,
  imageWidth,
  imageHeight,
  fields,
  onFieldsChange,
  onSave
}: TemplateEditorProps) {
  const [selectedField, setSelectedField] = useState<TemplateField | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isAddingField, setIsAddingField] = useState(false);
  const [scale, setScale] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calcular escala para caber no container
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 40; // padding
        const containerHeight = 600; // altura máxima desejada

        const scaleX = containerWidth / imageWidth;
        const scaleY = containerHeight / imageHeight;

        setScale(Math.min(scaleX, scaleY, 1)); // não aumentar além do tamanho original
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [imageWidth, imageHeight]);

  const scaledWidth = imageWidth * scale;
  const scaledHeight = imageHeight * scale;

  // Handlers para arrastar campos
  const handleMouseDown = (e: React.MouseEvent, field: TemplateField) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const offsetX = e.clientX - rect.left - (field.position_x * scale);
    const offsetY = e.clientY - rect.top - (field.position_y * scale);

    setSelectedField(field);
    setIsDragging(true);
    setDragOffset({ x: offsetX, y: offsetY });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !selectedField || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const newX = (e.clientX - rect.left - dragOffset.x) / scale;
    const newY = (e.clientY - rect.top - dragOffset.y) / scale;

    // Limitar dentro dos limites da imagem
    const clampedX = Math.max(0, Math.min(imageWidth - selectedField.width, newX));
    const clampedY = Math.max(0, Math.min(imageHeight - selectedField.height, newY));

    const updatedFields = fields.map(field =>
      field.id === selectedField.id
        ? { ...field, position_x: clampedX, position_y: clampedY }
        : field
    );

    onFieldsChange(updatedFields);
  }, [isDragging, selectedField, dragOffset, scale, imageWidth, imageHeight, fields, onFieldsChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Adicionar campo clicando na imagem
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!isAddingField || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    const newField: TemplateField = {
      ...createDefaultField(x, y),
      id: Date.now().toString(),
      field_key: `field_${fields.length + 1}`,
      display_order: fields.length,
    };

    onFieldsChange([...fields, newField]);
    setSelectedField(newField);
    setIsAddingField(false);

    toast.success("Campo adicionado! Configure suas propriedades no painel lateral.");
  };

  // Atualizar campo selecionado
  const updateSelectedField = (updates: Partial<TemplateField>) => {
    if (!selectedField) return;

    const updatedFields = fields.map(field =>
      field.id === selectedField.id
        ? { ...field, ...updates }
        : field
    );

    onFieldsChange(updatedFields);
    setSelectedField({ ...selectedField, ...updates });
  };

  // Remover campo
  const removeField = (fieldId: string) => {
    const updatedFields = fields.filter(field => field.id !== fieldId);
    onFieldsChange(updatedFields);

    if (selectedField?.id === fieldId) {
      setSelectedField(null);
    }

    toast.success("Campo removido!");
  };

  // Predefined field types
  const fieldTypes = [
    { value: 'text', label: 'Texto' },
    { value: 'date', label: 'Data' },
    { value: 'number', label: 'Número' },
    { value: 'qr_code', label: 'QR Code' },
  ];

  const fontFamilies = [
    'Arial', 'Helvetica', 'Times New Roman', 'Georgia',
    'Courier New', 'Verdana', 'Calibri', 'Century Gothic'
  ];

  const textAlignOptions = [
    { value: 'left', label: 'Esquerda' },
    { value: 'center', label: 'Centro' },
    { value: 'right', label: 'Direita' },
  ];

  return (
    <div className="flex h-[800px] gap-6">
      {/* Canvas Principal */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Editor de Template</h3>
            <Badge variant="secondary">
              {fields.length} campo{fields.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={isAddingField ? "default" : "outline"}
              size="sm"
              onClick={() => setIsAddingField(!isAddingField)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {isAddingField ? "Clique na imagem" : "Adicionar Campo"}
            </Button>

            <Button onClick={onSave} size="sm">
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>
        </div>

        {/* Canvas Container */}
        <div
          ref={containerRef}
          className="flex-1 bg-gray-50 rounded-lg p-4 overflow-auto flex items-center justify-center"
        >
          <div
            ref={canvasRef}
            className="relative border-2 border-gray-300 rounded-lg shadow-lg bg-white"
            style={{
              width: scaledWidth,
              height: scaledHeight,
              cursor: isAddingField ? 'crosshair' : 'default'
            }}
            onClick={handleCanvasClick}
          >
            {/* Imagem de fundo */}
            <img
              src={templateImageUrl}
              alt="Template"
              className="absolute inset-0 w-full h-full object-cover rounded-lg"
              style={{ pointerEvents: 'none' }}
            />

            {/* Campos */}
            {fields.map((field) => (
              <div
                key={field.id}
                className={`absolute border-2 border-dashed cursor-move flex items-center justify-center text-center select-none ${
                  selectedField?.id === field.id
                    ? 'border-blue-500 bg-blue-100 bg-opacity-50'
                    : 'border-gray-400 bg-white bg-opacity-70'
                } hover:border-blue-400 hover:bg-blue-50 hover:bg-opacity-70`}
                style={{
                  left: field.position_x * scale,
                  top: field.position_y * scale,
                  width: field.width * scale,
                  height: field.height * scale,
                  fontFamily: field.font_family,
                  fontSize: field.font_size * scale,
                  fontWeight: field.font_weight,
                  fontStyle: field.font_style,
                  color: field.text_color,
                  textAlign: field.text_align,
                }}
                onMouseDown={(e) => handleMouseDown(e, field)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedField(field);
                }}
              >
                <span className="truncate px-1">
                  {field.field_label || `[${field.field_key || 'campo'}]`}
                </span>

                {/* Handle de redimensionar */}
                {selectedField?.id === field.id && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded cursor-se-resize" />
                )}
              </div>
            ))}

            {/* Overlay de instruções quando está no modo adicionar */}
            {isAddingField && (
              <div className="absolute inset-0 bg-blue-500 bg-opacity-10 flex items-center justify-center rounded-lg">
                <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
                  Clique onde deseja adicionar o campo
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info da escala */}
        <div className="text-xs text-gray-500 mt-2 text-center">
          Escala: {Math.round(scale * 100)}% • Tamanho original: {imageWidth}×{imageHeight}px
        </div>
      </div>

      {/* Painel de Propriedades */}
      <div className="w-80 border-l pl-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Propriedades do Campo</h3>

          {selectedField ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Campo Selecionado</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeField(selectedField.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Chave do Campo */}
                <div className="space-y-2">
                  <Label>Chave do Campo</Label>
                  <Input
                    value={selectedField.field_key}
                    onChange={(e) => updateSelectedField({ field_key: e.target.value })}
                    placeholder="ex: student_name"
                  />
                  <p className="text-xs text-gray-500">
                    Identificador único usado na geração
                  </p>
                </div>

                {/* Label do Campo */}
                <div className="space-y-2">
                  <Label>Rótulo</Label>
                  <Input
                    value={selectedField.field_label}
                    onChange={(e) => updateSelectedField({ field_label: e.target.value })}
                    placeholder="Nome do Aluno"
                  />
                </div>

                {/* Tipo do Campo */}
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={selectedField.field_type}
                    onValueChange={(value) => updateSelectedField({ field_type: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Posição */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>X</Label>
                    <Input
                      type="number"
                      value={Math.round(selectedField.position_x)}
                      onChange={(e) => updateSelectedField({ position_x: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Y</Label>
                    <Input
                      type="number"
                      value={Math.round(selectedField.position_y)}
                      onChange={(e) => updateSelectedField({ position_y: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                {/* Tamanho */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Largura</Label>
                    <Input
                      type="number"
                      value={selectedField.width}
                      onChange={(e) => updateSelectedField({ width: parseInt(e.target.value) || 100 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Altura</Label>
                    <Input
                      type="number"
                      value={selectedField.height}
                      onChange={(e) => updateSelectedField({ height: parseInt(e.target.value) || 30 })}
                    />
                  </div>
                </div>

                {/* Fonte */}
                <div className="space-y-2">
                  <Label>Família da Fonte</Label>
                  <Select
                    value={selectedField.font_family}
                    onValueChange={(value) => updateSelectedField({ font_family: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontFamilies.map(font => (
                        <SelectItem key={font} value={font}>
                          {font}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tamanho da Fonte */}
                <div className="space-y-2">
                  <Label>Tamanho da Fonte</Label>
                  <Input
                    type="number"
                    value={selectedField.font_size}
                    onChange={(e) => updateSelectedField({ font_size: parseInt(e.target.value) || 16 })}
                    min="8"
                    max="72"
                  />
                </div>

                {/* Cor do Texto */}
                <div className="space-y-2">
                  <Label>Cor do Texto</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedField.text_color}
                      onChange={(e) => updateSelectedField({ text_color: e.target.value })}
                      className="w-10 h-8 rounded border cursor-pointer"
                    />
                    <Input
                      value={selectedField.text_color}
                      onChange={(e) => updateSelectedField({ text_color: e.target.value })}
                      placeholder="#000000"
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Alinhamento */}
                <div className="space-y-2">
                  <Label>Alinhamento</Label>
                  <Select
                    value={selectedField.text_align}
                    onValueChange={(value) => updateSelectedField({ text_align: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {textAlignOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Valor Padrão */}
                <div className="space-y-2">
                  <Label>Valor Padrão</Label>
                  <Input
                    value={selectedField.default_value || ''}
                    onChange={(e) => updateSelectedField({ default_value: e.target.value })}
                    placeholder="Valor exibido por padrão"
                  />
                </div>

                {/* Campo Obrigatório */}
                <div className="flex items-center justify-between">
                  <Label>Campo Obrigatório</Label>
                  <Switch
                    checked={selectedField.is_required}
                    onCheckedChange={(checked) => updateSelectedField({ is_required: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Selecione um campo para editar suas propriedades</p>
                <p className="text-sm mt-1">
                  Clique em um campo existente ou adicione um novo
                </p>
              </CardContent>
            </Card>
          )}

          {/* Lista de Campos */}
          {fields.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Campos do Template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className={`p-2 rounded border cursor-pointer transition-colors ${
                      selectedField?.id === field.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedField(field)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {field.field_label || 'Campo sem nome'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {field.field_key || 'sem_chave'} • {field.field_type}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {index + 1}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}