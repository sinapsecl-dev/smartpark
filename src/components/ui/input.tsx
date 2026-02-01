import * as React from "react"
import clsx from "clsx"

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> { }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={clsx(
                    "flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm",
                    "ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium",
                    "placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2",
                    "focus-visible:ring-primary focus-visible:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "dark:border-gray-700 dark:bg-[#1e2a32] dark:ring-offset-gray-950 dark:placeholder:text-gray-500",
                    "dark:focus-visible:ring-primary",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Input.displayName = "Input"

export { Input }
