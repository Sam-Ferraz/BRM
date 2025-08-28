import React, { forwardRef, useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: string | number
  onChange?: (value: number | null) => void
  currency?: string
}

// Format cents to Brazilian currency display (123456 -> "1.234,56")
const formatCentsToBRLDisplay = (cents: number): string => {
  const reais = cents / 100
  return reais.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// Convert cents to API format (123456 -> 1234.56)
const formatCentsToAPI = (cents: number): number => {
  return Math.round(cents) / 100
}

// Extract numeric cents from input (remove all non-digits)
const extractCentsFromInput = (input: string): number => {
  const digitsOnly = input.replace(/\D/g, '')
  return parseInt(digitsOnly) || 0
}

// Convert API value to cents for internal use
const apiValueToCents = (apiValue: string | number): number => {
  if (!apiValue || apiValue === "" || apiValue === "0" || apiValue === 0) return 0
  const numValue = typeof apiValue === 'string' ? parseFloat(apiValue) : apiValue
  if (isNaN(numValue)) return 0
  return Math.round(numValue * 100)
}

const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, currency = "BRL", ...props }, ref) => {
    const [cents, setCents] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)

    // Initialize from prop value
    useEffect(() => {
      if (value !== undefined && value !== "") {
        setCents(apiValueToCents(value))
      } else {
        setCents(0)
      }
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      
      // Extract only digits from input
      const newCents = extractCentsFromInput(inputValue)
      setCents(newCents)
      
      // Send formatted value to parent (API format)
      if (newCents === 0) {
        onChange?.(null)
      } else {
        onChange?.(formatCentsToAPI(newCents))
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow navigation and editing keys
      const allowedKeys = [
        'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
        'Home', 'End', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'
      ]
      
      // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      if (e.ctrlKey && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
        return
      }
      
      // Allow allowed keys
      if (allowedKeys.includes(e.key)) {
        return
      }
      
      // Only allow digits
      if (!/^\d$/.test(e.key)) {
        e.preventDefault()
      }
    }

    // Format display value
    const displayValue = cents === 0 ? "" : `R$ ${formatCentsToBRLDisplay(cents)}`

    return (
      <Input
        {...props}
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="R$ 0,00"
        className={cn(className)}
      />
    )
  }
)

CurrencyInput.displayName = "CurrencyInput"

export { CurrencyInput }