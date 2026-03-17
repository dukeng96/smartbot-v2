import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function ForgotPasswordPage() {
  return (
    <>
      <h2 className="text-[18px] font-semibold text-foreground">Quên mật khẩu</h2>
      <p className="mt-1 text-[13px] text-text-secondary">
        Nhập email để nhận link đặt lại mật khẩu
      </p>

      <form className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-foreground">Email</label>
          <Input type="email" placeholder="you@company.com" />
        </div>

        <Button type="submit" className="w-full">
          Gửi link đặt lại
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-text-secondary">
        Nhớ mật khẩu rồi?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Đăng nhập
        </Link>
      </p>
    </>
  )
}
