import {
  LayoutGrid,
  MessageSquare,
  BookOpen,
  MessageCircle,
  BarChart,
  CreditCard,
  Settings,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  matchPaths?: string[]
}

/**
 * Sidebar navigation items — matches Figma B1 spec.
 * `matchPaths` enables active highlight for nested routes.
 */
export const SIDEBAR_NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutGrid,
  },
  {
    label: "Assistants",
    href: "/bots",
    icon: MessageSquare,
    matchPaths: ["/bots"],
  },
  {
    label: "Knowledge Bases",
    href: "/knowledge-bases",
    icon: BookOpen,
    matchPaths: ["/knowledge-bases"],
  },
  {
    label: "Conversations",
    href: "/conversations",
    icon: MessageCircle,
    matchPaths: ["/conversations"],
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart,
    matchPaths: ["/analytics"],
  },
  {
    label: "Billing",
    href: "/billing",
    icon: CreditCard,
    matchPaths: ["/billing"],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    matchPaths: ["/settings"],
  },
]
