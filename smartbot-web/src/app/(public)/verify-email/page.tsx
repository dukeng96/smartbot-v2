import Link from "next/link"
import { MailCheck } from "lucide-react"


export default function VerifyEmailPage() {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-[#ECFDF5]">
        <MailCheck className="size-6 text-[#059669]" />
      </div>

      <h2 className="mt-4 text-[18px] font-semibold text-foreground">
        Xác minh email
      </h2>
      <p className="mt-1 text-[13px] text-text-secondary">
        Đang xác minh email của bạn...
      </p>

      <Link
        href="/login"
        className="mt-6 inline-flex h-9 w-full items-center justify-center rounded-[8px] bg-primary px-4 text-[13px] font-semibold text-primary-foreground hover:bg-primary-hover"
      >
        Đăng nhập
      </Link>
    </div>
  )
}
