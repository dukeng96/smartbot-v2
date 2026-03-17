import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

export default function RegisterPage() {
  return (
    <>
      <h2 className="text-[18px] font-semibold text-foreground">Tạo tài khoản</h2>
      <p className="mt-1 text-[13px] text-text-secondary">
        Bắt đầu dùng thử miễn phí, không cần thẻ tín dụng
      </p>

      <form className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-foreground">Họ tên</label>
          <Input type="text" placeholder="Nguyễn Văn A" />
        </div>

        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-foreground">Email</label>
          <Input type="email" placeholder="you@company.com" />
        </div>

        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-foreground">Mật khẩu</label>
          <Input type="password" placeholder="Ít nhất 8 ký tự" />
        </div>

        <Button type="submit" className="w-full">
          Đăng ký
        </Button>
      </form>

      <div className="relative my-6">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-[12px] text-text-muted">
          hoặc
        </span>
      </div>

      <Button variant="outline" className="w-full">
        Đăng ký bằng Google
      </Button>

      <p className="mt-6 text-center text-[13px] text-text-secondary">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Đăng nhập
        </Link>
      </p>
    </>
  )
}
