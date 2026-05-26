'use client'
import { useCallback } from 'react'

export interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

let _fn: ConfirmFn = () => Promise.resolve(false)

export function _registerConfirm(fn: ConfirmFn): void {
  _fn = fn
}

export function _unregisterConfirm(): void {
  _fn = () => Promise.resolve(false)
}

export function useConfirm(): ConfirmFn {
  return useCallback((opts: ConfirmOptions) => _fn(opts), [])
}
