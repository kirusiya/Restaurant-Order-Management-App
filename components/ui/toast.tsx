import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from 'lucide-react'

import { cn } from "@/lib/utils"

const toastVariants = cva(
"group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:fade-in-90 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-[transform_200ms_ease-out] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[state=open]:sm:slide-in-from-bottom-full data-[state=closed]:sm:slide-out-to-right-full",
{
  variants: {
    variant: {
      default: "border bg-background text-foreground",
      destructive:
        "destructive group border-destructive bg-destructive text-white",
      success:
        "success group border-emerald-500 bg-emerald-500 text-white",
      dark: "bg-gray-800 text-white",
    },
  },
  defaultVariants: {
    variant: "default",
  },
}
)

const ToastProvider = ToastPrimitives.Provider

type ToastProps = React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
VariantProps<typeof toastVariants> & {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  icon?: React.ReactNode
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
({ className, variant, title, description, action, icon, ...props }, ref) => {
  console.log('Toast Component received props:', { title, description, variant, icon }); // Strategic log
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
      {icon && <div className="flex-shrink-0">{icon}</div>}
      <div className="grid gap-1">
        {title && <div className="text-sm font-semibold">{title}</div>}
        {description && (
          <div className="text-sm">{description}</div> // Removed opacity-90
        )}
      </div>
      {action}
      <ToastClose />
    </ToastPrimitives.Root>
  )
}
)
Toast.displayName = "Toast"

type ToastActionProps = React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>

const ToastAction = React.forwardRef<
React.ElementRef<typeof ToastPrimitives.Action>,
ToastActionProps
>(({ className, ...props }, ref) => (
<ToastPrimitives.Action
  ref={ref}
  className={cn(
    "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
    className
  )}
  {...props}
/>
))
ToastAction.displayName = ToastPrimitives.Action.displayName

type ToastCloseProps = React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>

const ToastClose = React.forwardRef<
React.ElementRef<typeof ToastPrimitives.Close>,
ToastCloseProps
>(({ className, ...props }, ref) => (
<ToastPrimitives.Close
  ref={ref}
  className={cn(
    "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
    className
  )}
  toast-close=""
  {...props}
>
  <X className="h-4 w-4" />
</ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

type ToastTitleProps = React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>

const ToastTitle = React.forwardRef<
React.ElementRef<typeof ToastPrimitives.Title>,
ToastTitleProps
>(({ className, ...props }, ref) => (
<ToastPrimitives.Title
  ref={ref}
  className={cn("text-sm font-semibold", className)}
  {...props}
/>
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

type ToastDescriptionProps = React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>

const ToastDescription = React.forwardRef<
React.ElementRef<typeof ToastPrimitives.Description>,
ToastDescriptionProps
>(({ className, ...props }, ref) => (
<ToastPrimitives.Description
  ref={ref}
  className={cn("text-sm", className)} // Removed opacity-90
  {...props}
/>
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastViewportProps = React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>

const ToastViewport = React.forwardRef<
React.ElementRef<typeof ToastPrimitives.Viewport>,
ToastViewportProps
>(({ className, ...props }, ref) => (
<ToastPrimitives.Viewport
  ref={ref}
  className={cn(
    "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
    className
  )}
  {...props}
/>
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

export {
type ToastProps,
type ToastActionProps,
type ToastCloseProps,
type ToastTitleProps,
type ToastDescriptionProps,
type ToastViewportProps,
Toast,
ToastAction,
ToastClose,
ToastTitle,
ToastDescription,
ToastViewport,
ToastProvider,
toastVariants,
}
