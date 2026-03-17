import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

export default function LoginPage() {
  return (
    <>
      <h2 className="text-[18px] font-semibold text-foreground">Đăng nhập</h2>
      <p className="mt-1 text-[13px] text-text-secondary">
        Nhập email và mật khẩu để tiếp tục
      </p>

      <form className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-foreground">Email</label>
          <Input type="email" placeholder="you@company.com" />
        </div>

        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-foreground">Mật khẩu</label>
          <Input type="password" placeholder="••••••••" />
        </div>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-[12px] font-medium text-primary hover:underline"
          >
            Quên mật khẩu?
          </Link>
        </div>

        <Button type="submit" className="w-full">
          Đăng nhập
        </Button>
      </form>

      <div className="relative my-6">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-[12px] text-text-muted">
          hoặc
        </span>
      </div>

      <Button variant="outline" className="w-full">
        Đăng nhập bằng Google
      </Button>

      <p className="mt-6 text-center text-[13px] text-text-secondary">
        Chưa có tài khoản?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Đăng ký
        </Link>
      </p>
    </>
  )
}
