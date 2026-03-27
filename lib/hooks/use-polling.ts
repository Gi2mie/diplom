"use client"

import { useEffect, useRef } from "react"

type UsePollingOptions = {
  intervalMs: number
  enabled?: boolean
  runImmediately?: boolean
}

export function usePolling(
  callback: () => void | Promise<void>,
  { intervalMs, enabled = true, runImmediately = true }: UsePollingOptions
) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!enabled) return

    if (runImmediately) {
      void callbackRef.current()
    }

    const timer = setInterval(() => {
      void callbackRef.current()
    }, intervalMs)

    return () => clearInterval(timer)
  }, [enabled, intervalMs, runImmediately])
}

