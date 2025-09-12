import { useState, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface Step {
  title: string
  description: string
  content: ReactNode
  isValid?: boolean
}

interface MultiStepFormProps {
  steps: Step[]
  onComplete: () => void
  onCancel?: () => void
  isSubmitting?: boolean
}

export function MultiStepForm({ steps, onComplete, onCancel, isSubmitting = false }: MultiStepFormProps) {
  const [currentStep, setCurrentStep] = useState(0)
  
  const progress = ((currentStep + 1) / steps.length) * 100
  const isLastStep = currentStep === steps.length - 1
  const isFirstStep = currentStep === 0
  const canProceed = steps[currentStep]?.isValid !== false

  const handleNext = () => {
    if (isLastStep) {
      onComplete()
    } else {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))
    }
  }

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }

  const handleStepClick = (stepIndex: number) => {
    // Only allow clicking on previous steps or current step
    if (stepIndex <= currentStep) {
      setCurrentStep(stepIndex)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Nova Unidade</h2>
          <div className="text-sm text-muted-foreground">
            Etapa {currentStep + 1} de {steps.length}
          </div>
        </div>
        
        <Progress value={progress} className="h-2" />
        
        {/* Step Navigation */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <button
              key={index}
              onClick={() => handleStepClick(index)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                index === currentStep
                  ? "bg-primary text-primary-foreground"
                  : index < currentStep
                  ? "bg-muted text-foreground hover:bg-muted/80 cursor-pointer"
                  : "text-muted-foreground cursor-not-allowed"
              }`}
              disabled={index > currentStep}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                index === currentStep
                  ? "bg-primary-foreground text-primary"
                  : index < currentStep
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}>
                {index + 1}
              </span>
              <span className="hidden sm:inline">{step.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">{steps[currentStep]?.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {steps[currentStep]?.description}
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="min-h-96">
            {steps[currentStep]?.content}
          </div>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <div>
          {!isFirstStep && (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
            >
              Cancelar
            </Button>
          )}
          
          <Button
            type="button"
            onClick={handleNext}
            disabled={!canProceed || isSubmitting}
            className="flex items-center gap-2"
          >
            {isSubmitting ? (
              "Salvando..."
            ) : isLastStep ? (
              "Finalizar"
            ) : (
              <>
                Próximo
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}