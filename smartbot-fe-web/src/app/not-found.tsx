import Link from "next/link"
import { FileQuestion } from "lucide-react"


export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center">
      <div className="flex size-14 items-center justify-center rounded-xl bg-muted">
        <FileQuestion className="size-7 text-text-secondary" />
      </div>
      <h2 className="mt-4 text-xl font-semibold text-foreground">
        Không tìm thấy trang
      </h2>
      <p className="mt-2 max-w-sm text-[13px] text-text-secondary">
        Trang bạn đang tìm không tồn tại hoặc đã bị xoá.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-9 items-center justify-center rounded-[8px] bg-primary px-4 text-[13px] font-semibold text-primary-foreground hover:bg-primary-hover"
      >
        Về trang chủ
      </Link>
    </div>
  )
}
