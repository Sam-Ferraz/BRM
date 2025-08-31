import { useState, useEffect } from 'react'

// Mobile device detection utility
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  
  // Check user agent for mobile devices
  const userAgent = window.navigator.userAgent.toLowerCase()
  const mobilePatterns = [
    /android/,
    /iphone/,
    /ipad/,
    /ipod/,
    /blackberry/,
    /windows phone/,
    /mobile/
  ]
  
  const isMobileUA = mobilePatterns.some(pattern => pattern.test(userAgent))
  
  // Also check for touch capability and screen size
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const isSmallScreen = window.innerWidth <= 768
  
  return isMobileUA || (isTouchDevice && isSmallScreen)
}

// Reactive hook to use mobile detection in React components
export function useMobileDetection() {
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(isMobileDevice())
    }
    
    // Check on mount
    checkMobile()
    
    // Re-check on resize (for orientation changes, etc.)
    window.addEventListener('resize', checkMobile)
    
    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])
  
  return isMobile
}