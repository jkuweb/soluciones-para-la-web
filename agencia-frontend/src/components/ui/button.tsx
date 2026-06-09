import * as React from 'react'

const variantClasses = {
  default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
  destructive: 'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90',
  outline: 'border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground',
  secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  link: 'text-primary underline-offset-4 hover:underline',
}

const sizeClasses = {
  clear: '',
  default: 'h-10 px-4 py-2 has-[>svg]:px-3',
  sm: 'h-9 rounded-md px-3 has-[>svg]:px-2.5',
  lg: 'h-11 rounded-md px-8 has-[>svg]:px-4',
  icon: 'size-10',
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variantClasses
  size?: keyof typeof sizeClasses
}

const Button: React.FC<ButtonProps> = ({
  className,
  variant = 'default',
  size = 'default',
  children,
  ...props
}) => {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  )
}

export { Button }
