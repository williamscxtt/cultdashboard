type PurchaseButtonProps = {
  children: React.ReactNode
  className?: string
  href?: string
}

const SKOOL_URL = 'https://www.skool.com/creator/about'

export default function PurchaseButton({ children, className, href = SKOOL_URL }: PurchaseButtonProps) {
  return (
    <span className={className}>
      <a href={href}>
        {children}
      </a>
    </span>
  )
}
