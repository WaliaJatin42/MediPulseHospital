import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(({ className, type, variant = "default", ...props }, ref) => {
  if (variant === "underline") {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full border-b-[1.5px] border-slate-300 bg-transparent py-2.5 pr-8 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }

  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
