type PurchaseButtonProps = {
  children: React.ReactNode
  className?: string
  href?: string
}

export default function PurchaseButton({ children, className, href = '#monthly-membership' }: PurchaseButtonProps) {
  return (
    <span className={className}>
      <a href={href} data-pricing-cta={href.startsWith('#') ? true : undefined}>
        {children}
      </a>
    </span>
  )
}
