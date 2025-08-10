import * as React from 'react'

interface ThemeProviderProps {
  children: React.ReactNode
  attribute?: string
  defaultTheme?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
}

export function ThemeProvider({ 
  children, 
  attribute = "class", 
  defaultTheme = "light",
  enableSystem = true,
  disableTransitionOnChange = false
}: ThemeProviderProps) {
  React.useEffect(() => {
    // Simple theme implementation for light mode
    document.documentElement.classList.add('light')
  }, [])

  return <>{children}</>
}