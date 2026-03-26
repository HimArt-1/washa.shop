import * as React from "react"
import { cn } from "../../lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "gold";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-washa-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-washa-bg disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          {
            "bg-washa-surface text-washa-text hover:bg-washa-elevated border border-washa-border hover:shadow-[0_5px_20px_rgba(0,0,0,0.3)]": variant === "default",
            "bg-washa-gold text-washa-bg hover:bg-washa-gold-light font-bold shadow-[0_4px_15px_rgba(201,168,106,0.3)] hover:shadow-[0_8px_30px_rgba(201,168,106,0.4)] hover:scale-[1.02] active:scale-[0.98]": variant === "gold",
            "border border-washa-border bg-transparent hover:bg-washa-gold/5 text-washa-text hover:border-washa-gold/30": variant === "outline",
            "hover:bg-washa-gold/5 text-washa-text-sec hover:text-washa-gold": variant === "ghost",
            "h-10 px-4 py-2": size === "default",
            "h-9 rounded-lg px-3 text-xs": size === "sm",
            "h-12 rounded-xl px-8 text-base": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
