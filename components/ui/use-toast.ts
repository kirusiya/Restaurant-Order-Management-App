import * as React from "react"

import { ToastProps } from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000 // Changed to a more standard value (1 second)

type ToastsMap = Map<string, ToastProps>

type Action =
  | {
      type: "ADD_TOAST"
      toast: ToastProps
    }
  | {
      type: "UPDATE_TOAST"
      toast: ToastProps
    }
  | {
      type: "DISMISS_TOAST"
      toastId?: string
    }
  | {
      type: "REMOVE_TOAST"
      toastId?: string
    }

interface State {
  toasts: ToastProps[]
}

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      if (toastId) {
        return {
          ...state,
          toasts: state.toasts.map((t) =>
            t.id === toastId ? { ...t, open: false } : t
          ),
        }
      } else {
        return {
          ...state,
          toasts: state.toasts.map((t) => ({ ...t, open: false })),
        }
      }
    }
    case "REMOVE_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => listener(memoryState))
}

type Toast = Omit<ToastProps, "id"> & {
  id?: string
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  // Add this useEffect to handle removing toasts from the DOM after they are dismissed
  React.useEffect(() => {
    const dismissedToasts = state.toasts.filter((toast) => !toast.open)
    if (dismissedToasts.length > 0) {
      const timer = setTimeout(() => {
        dismissedToasts.forEach((toast) => {
          dispatch({ type: "REMOVE_TOAST", toastId: toast.id })
        })
      }, TOAST_REMOVE_DELAY)
      return () => clearTimeout(timer)
    }
  }, [state.toasts])


  const addToast = React.useCallback((toast: Toast) => {
    const id = toast.id || crypto.randomUUID()

    dispatch({
      type: "ADD_TOAST",
      toast: {
        ...toast,
        id,
        open: true,
        onOpenChange: (open) => {
          if (!open) {
            dispatch({ type: "DISMISS_TOAST", toastId: id })
          }
        },
      },
    })
  }, [])

  const dismissToast = React.useCallback((toastId?: string) => {
    dispatch({ type: "DISMISS_TOAST", toastId })
  }, [])

  const removeToast = React.useCallback((toastId?: string) => {
    dispatch({ type: "REMOVE_TOAST", toastId })
  }, [])

  return {
    ...state,
    toast: addToast,
    dismiss: dismissToast,
    remove: removeToast,
  }
}

export { useToast }
