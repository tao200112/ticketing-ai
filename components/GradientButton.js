'use client'

export default function GradientButton({ 
  children, 
  onClick, 
  disabled = false, 
  loading = false,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props 
}) {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variants = {
    primary: 'bg-partytix-gradient text-white hover:shadow-lg hover:scale-105 focus:ring-purple-500',
    secondary: 'bg-slate-700 text-white hover:bg-slate-600 focus:ring-slate-500',
    outline: 'border-2 border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white focus:ring-purple-500',
    ghost: 'text-purple-400 hover:bg-purple-500/10 focus:ring-purple-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
    xl: 'px-10 py-5 text-xl'
  }
  
  const classes = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={classes}
      {...props}
    >
      {loading ? (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>加载中...</span>
        </div>
      ) : (
        children
      )}
    </button>
  )
}

// 预设按钮组件
export function PrimaryButton(props) {
  return <GradientButton variant="primary" {...props} />
}

export function SecondaryButton(props) {
  return <GradientButton variant="secondary" {...props} />
}

export function OutlineButton(props) {
  return <GradientButton variant="outline" {...props} />
}

export function GhostButton(props) {
  return <GradientButton variant="ghost" {...props} />
}

export function DangerButton(props) {
  return <GradientButton variant="danger" {...props} />
}
