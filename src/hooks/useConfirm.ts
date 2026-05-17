import { useCallback, useState } from 'react'

interface ConfirmState {
  isOpen: boolean
  message: string
  resolve: ((value: boolean) => void) | null
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({ isOpen: false, message: '', resolve: null })

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise(resolve => {
      setState({ isOpen: true, message, resolve })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    state.resolve?.(true)
    setState({ isOpen: false, message: '', resolve: null })
  }, [state])

  const handleCancel = useCallback(() => {
    state.resolve?.(false)
    setState({ isOpen: false, message: '', resolve: null })
  }, [state])

  return {
    confirm,
    dialogProps: {
      isOpen: state.isOpen,
      message: state.message,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
  }
}
