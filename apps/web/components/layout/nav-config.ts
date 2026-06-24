import {
  LayoutDashboard,
  Tag,
  History,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  mobileLabel: string;
  icon: LucideIcon;
  gitCommand: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    mobileLabel: "Home",
    icon: LayoutDashboard,
    gitCommand: "$ fithub status",
  },
  {
    href: "/records",
    label: "Records",
    mobileLabel: "Records",
    icon: Tag,
    gitCommand: "$ git tag",
  },
  {
    href: "/history",
    label: "History",
    mobileLabel: "History",
    icon: History,
    gitCommand: "$ git log",
  },
  {
    href: "/analytics",
    label: "Progress",
    mobileLabel: "Progress",
    icon: TrendingUp,
    gitCommand: "$ git diff",
  },
];

export const LOG_CTA = {
  href: "/log/new",
  label: "Log Workout",
  gitCommand: "$ git commit",
} as const;

export const PAGE_META: Record<string, { title: string; gitCommand: string }> =
  {
    "/dashboard": { title: "Dashboard", gitCommand: "$ fithub status" },
    "/records": { title: "Records", gitCommand: "$ git tag" },
    "/history": { title: "History", gitCommand: "$ git log" },
    "/analytics": { title: "Progress", gitCommand: "$ git diff" },
    "/log/new": { title: "Log Workout", gitCommand: "$ git commit" },
    "/log": { title: "Log Workout", gitCommand: "$ git commit" },
    "/plans": { title: "Plans", gitCommand: "$ git branch" },
    "/coach": { title: "Coach", gitCommand: "$ git coach" },
    "/settings": { title: "Settings", gitCommand: "$ git config" },
    "/profile": { title: "Profile", gitCommand: "$ git config --user" },
  };

export function getPageMeta(pathname: string): {
  title: string;
  gitCommand: string;
} {
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  for (const [route, meta] of Object.entries(PAGE_META)) {
    if (pathname.startsWith(route + "/")) return meta;
  }
  return { title: "FitHub", gitCommand: "$ fithub" };
}

// Guards against the /dashboard → /dashboard/... false-positive
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}
