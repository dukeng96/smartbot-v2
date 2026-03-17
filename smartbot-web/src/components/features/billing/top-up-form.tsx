"use client"

import { useState } from "react"
import { CreditCard } from "lucide-react"

import { formatVnd } from "@/lib/utils/format-currency"
import { formatNumber } from "@/lib/utils/format-number"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface TopUpFormProps {
  onSubmit: (data: { credits: number; paymentMethod: string }) => void
  submitting?: boolean
}

const PACKAGES: readonly { credits: number; price: number; label: string; badge?: string }[] = [
  { credits: 500, price: 49_000, label: "500 credits" },
  { credits: 2_000, price: 179_000, label: "2.000 credits", badge: "Best Value" },
  { credits: 5_000, price: 399_000, label: "5.000 credits" },
]

const PAYMENT_METHODS = [
  { id: "vnpay", name: "VNPay", desc: "Thanh toán qua VNPay" },
  { id: "momo", name: "MoMo", desc: "Thanh toán qua MoMo" },
] as const

/**
 * Credit top-up form for G3 page.
 * Package selector + custom input + payment method + submit.
 */
export function TopUpForm({ onSubmit, submitting }: TopUpFormProps) {
  const [selectedPkg, setSelectedPkg] = useState<number>(1) // default "Best Value"
  const [customCredits, setCustomCredits] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("vnpay")
  const isCustom = selectedPkg === -1

  const credits = isCustom
    ? parseInt(customCredits, 10) || 0
    : PACKAGES[selectedPkg].credits

  const price = isCustom
    ? Math.ceil(credits * 0.09) // ~0.09₫ per credit estimate
    : PACKAGES[selectedPkg].price

  return (
    <div className="space-y-6">
      {/* Package selector */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-[13px] font-semibold text-foreground mb-4">
          Chọn gói Credits
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PACKAGES.map((pkg, i) => (
            <button
              key={pkg.credits}
              onClick={() => setSelectedPkg(i)}
              className={cn(
                "relative rounded-xl border p-4 text-left transition-colors",
                selectedPkg === i
                  ? "border-[#6D28D9] border-2 bg-[#EDE9FE]"
                  : "border-border bg-white hover:bg-[#F9FAFB]",
              )}
            >
              {pkg.badge && (
                <span className="absolute -top-2.5 right-3 rounded-full bg-[#6D28D9] px-2 py-0.5 text-[10px] font-medium text-white">
                  {pkg.badge}
                </span>
              )}
              <p className="text-[15px] font-semibold text-foreground">
                {formatNumber(pkg.credits)}
              </p>
              <p className="mt-0.5 text-[13px] text-text-secondary">
                {formatVnd(pkg.price)}
              </p>
            </button>
          ))}

          {/* Custom input card */}
          <button
            onClick={() => setSelectedPkg(-1)}
            className={cn(
              "rounded-xl border p-4 text-left transition-colors",
              isCustom
                ? "border-[#6D28D9] border-2 bg-[#EDE9FE]"
                : "border-border bg-white hover:bg-[#F9FAFB]",
            )}
          >
            <p className="text-[15px] font-semibold text-foreground">
              Tùy chỉnh
            </p>
            {isCustom ? (
              <Input
                type="number"
                min={100}
                value={customCredits}
                onChange={(e) => setCustomCredits(e.target.value)}
                placeholder="Nhập số credits"
                className="mt-2 h-8 text-[13px]"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <p className="mt-0.5 text-[13px] text-text-muted">
                Nhập số lượng
              </p>
            )}
          </button>
        </div>
      </div>

      {/* Payment method */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-[13px] font-semibold text-foreground mb-4">
          Phương thức thanh toán
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method.id}
              onClick={() => setPaymentMethod(method.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                paymentMethod === method.id
                  ? "border-[#6D28D9] border-2 bg-[#EDE9FE]"
                  : "border-border bg-white hover:bg-[#F9FAFB]",
              )}
            >
              <CreditCard className="size-5 text-text-secondary" />
              <div>
                <p className="text-[13px] font-medium text-foreground">
                  {method.name}
                </p>
                <p className="text-[12px] text-text-muted">{method.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Order summary + actions */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-5">
        <div className="text-[13px]">
          <span className="text-text-muted">Tổng: </span>
          <span className="text-[16px] font-bold text-foreground">
            {formatNumber(credits)} credits
          </span>
          <span className="ml-2 text-text-secondary">
            — {formatVnd(price)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/billing/subscription"
            className="inline-flex items-center justify-center rounded-[8px] text-primary hover:bg-primary-light h-8 px-3 text-xs font-semibold transition-all"
          >
            Hủy
          </a>
          <Button
            size="sm"
            disabled={credits <= 0 || submitting}
            onClick={() => onSubmit({ credits, paymentMethod })}
          >
            {submitting ? "Đang xử lý..." : "Mua Credits"}
          </Button>
        </div>
      </div>
    </div>
  )
}
