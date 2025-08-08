"use client"

import {
Toast,
ToastClose,
ToastDescription,
ToastProvider,
ToastTitle,
ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"

export function Toaster() {
const { toasts } = useToast()

return (
  <ToastProvider>
    {toasts.map(function ({ id, title, description, action, ...props }) {
      console.log('Toaster Component mapping toast:', { id, title, description, props }); // Strategic log
      return (
        <Toast key={id} title={title} description={description} {...props}>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && (
              <ToastDescription>{description}</ToastDescription>
            )}
          </div>
          {action}
          <ToastClose />
        </Toast>
      )
    })}
    <ToastViewport side="top" align="end" />
  </ToastProvider>
)
}
