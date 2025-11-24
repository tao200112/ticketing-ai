'use client'

import { useEffect, useState } from 'react'

export function useDefaultRegionSlug(fallbackSlug = 'blacksburg') {
  const [slug, setSlug] = useState(fallbackSlug)

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const loadDefaultRegion = async () => {
      try {
        const response = await fetch('/api/regions/default', {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error('Failed to load default region')
        }
        const result = await response.json()
        const nextSlug = result?.data?.slug || fallbackSlug
        if (isMounted) {
          setSlug(nextSlug)
        }
      } catch (error) {
        if (isMounted && !(error instanceof DOMException && error.name === 'AbortError')) {
          setSlug(fallbackSlug)
        }
      }
    }

    loadDefaultRegion()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [fallbackSlug])

  return slug
}

