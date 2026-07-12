'use client'

import { forwardRef } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'md' | 'lg'

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-flame text-white',
  secondary: 'bg-canvas text-ink border border-ink/15',
  ghost: 'bg-transparent text-ink',
}

const sizeClasses: Record<Size, string> = {
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
}

/**
 * Primary button primitive. Black fill / white text by default, consistent
 * radius, and a subtle press animation. Meets the 44px minimum tap target.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'lg',
    loading = false,
    fullWidth = false,
    className = '',
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      disabled={disabled || loading}
      className={`rounded-btn inline-flex min-h-11 items-center justify-center gap-2 font-medium transition-opacity disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading ? <Spinner size={18} /> : children}
    </motion.button>
  )
})
