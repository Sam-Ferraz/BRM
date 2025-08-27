"use client"

import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"
import { useTranslation } from "react-i18next"

interface AnsweredStatusToggleProps {
  value?: boolean
  onChange: (value: boolean) => void
  className?: string
}

export function AnsweredStatusToggle({ value, onChange, className }: AnsweredStatusToggleProps) {
  const { t } = useTranslation()

  return (
    <div className={`flex gap-2 ${className || ""}`}>
      <Button
        type="button"
        variant={value === true ? "default" : "outline"}
        className={`flex-1 ${
          value === true 
            ? "bg-green-600 hover:bg-green-700 text-white" 
            : "border-green-200 text-green-700 hover:bg-green-50"
        }`}
        onClick={() => onChange(true)}
      >
        <Check className="w-4 h-4 mr-2" />
        {t('answered')}
      </Button>
      
      <Button
        type="button"
        variant={value === false ? "default" : "outline"}
        className={`flex-1 ${
          value === false 
            ? "bg-red-600 hover:bg-red-700 text-white" 
            : "border-red-200 text-red-700 hover:bg-red-50"
        }`}
        onClick={() => onChange(false)}
      >
        <X className="w-4 h-4 mr-2" />
        {t('notAnswered')}
      </Button>
    </div>
  )
}