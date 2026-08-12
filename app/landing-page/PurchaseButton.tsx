type PurchaseButtonProps = {
  children: React.ReactNode
  className?: string
}

export default function PurchaseButton({ children, className }: PurchaseButtonProps) {
  return (
    <span className={className}>
      <a href="#monthly-membership" data-pricing-cta>
        {children}
      </a>
    </span>
  )
}
