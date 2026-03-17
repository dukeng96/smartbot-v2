import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function ResetPasswordPage() {
  return (
    <>
      <h2 className="text-[18px] font-semibold text-foreground">Đặt lại mật khẩu</h2>
      <p className="mt-1 text-[13px] text-text-secondary">
        Nhập mật khẩu mới cho tài khoản của bạn
      </p>

      <form className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-foreground">Mật khẩu mới</label>
          <Input type="password" placeholder="Ít nhất 8 ký tự" />
        </div>

        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-foreground">Xác nhận mật khẩu</label>
          <Input type="password" placeholder="Nhập lại mật khẩu" />
        </div>

        <Button type="submit" className="w-full">
          Đặt lại mật khẩu
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-text-secondary">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Quay lại đăng nhập
        </Link>
      </p>
    </>
  )
}
