/**
 * Mobile app environment detection utility
 * Detects if the web app is running inside a React Native WebView
 */

/**
 * Check if the current environment is a mobile app WebView
 * Uses both query parameter and User-Agent heuristics
 * 
 * @returns true if running inside mobile app WebView, false otherwise
 */
export function isMobileAppEnvironment(): boolean {
  // Only run in browser/client environment
  if (typeof window === 'undefined') {
    return false
  }

  try {
    // Strategy A: Check for query parameter
    const url = new URL(window.location.href)
    const sourceParam = url.searchParams.get('source')
    
    if (sourceParam === 'mobile-app') {
      console.log('[MobileAppDetector] Detected via query param: source=mobile-app')
      return true
    }

    // Strategy B: Check User-Agent for mobile app signatures
    const userAgent = navigator.userAgent || ''
    const mobileAppSignatures = ['Expo', 'PartyTix', 'ReactNative', 'WebView']
    
    const isMobileAppUA = mobileAppSignatures.some(signature =>
      userAgent.includes(signature)
    )

    if (isMobileAppUA) {
      console.log('[MobileAppDetector] Detected via User-Agent:', userAgent)
      return true
    }

    return false
  } catch (error) {
    console.error('[MobileAppDetector] Error detecting mobile app environment:', error)
    return false
  }
}

/**
 * Get the source parameter value from URL
 * @returns 'mobile-app' if present, null otherwise
 */
export function getSourceParam(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const url = new URL(window.location.href)
    return url.searchParams.get('source')
  } catch {
    return null
  }
}

