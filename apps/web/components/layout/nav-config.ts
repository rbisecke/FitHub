import {
  LayoutDashboard,
  Plus,
  GitBranch,
  Tag,
  TrendingUp,
  History,
  ShieldAlert,
  MessageSquare,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { BarbellIcon } from "@/components/icons/BarbellIcon";

export interface NavItem {
  href: string;
  label: string;
  mobileLabel: string;
  icon: LucideIcon;
  gitCommand: string;
  mobileShow?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    mobileLabel: "Home",
    icon: LayoutDashboard,
    gitCommand: "$ fithub status",
    mobileShow: true,
  },
  {
    href: "/log/new",
    label: "Log Result",
    mobileLabel: "Log",
    icon: Plus,
    gitCommand: "$ git add .",
  },
  {
    href: "/log/tag",
    label: "Tag a Lift",
    mobileLabel: "Tag",
    icon: BarbellIcon,
    gitCommand: "$ git tag",
  },
  {
    href: "/plans",
    label: "Plans",
    mobileLabel: "Plans",
    icon: GitBranch,
    gitCommand: "$ git branch",
  },
  {
    href: "/records",
    label: "Records",
    mobileLabel: "Records",
    icon: Tag,
    gitCommand: "$ git tag --list",
  },
  {
    href: "/analytics",
    label: "Analytics",
    mobileLabel: "Progress",
    icon: TrendingUp,
    gitCommand: "$ git diff",
  },
  {
    href: "/history",
    label: "History",
    mobileLabel: "History",
    icon: History,
    gitCommand: "$ git log --all",
    mobileShow: true,
  },
  {
    href: "/injuries",
    label: "Injuries",
    mobileLabel: "Injuries",
    icon: ShieldAlert,
    gitCommand: "$ git issue --list",
  },
  {
    href: "/coach",
    label: "Coach",
    mobileLabel: "Coach",
    icon: MessageSquare,
    gitCommand: "$ git coach",
    mobileShow: true,
  },
];

// Exported separately so it is never mixed into NAV_ITEMS — callers iterate
// NAV_ITEMS unconditionally, and the admin entry must only be rendered when
// the current user is actually an admin.
export const ADMIN_NAV_ITEM: NavItem = {
  href: "/admin",
  label: "Admin",
  mobileLabel: "Admin",
  icon: ShieldCheck,
  gitCommand: "$ fithub admin",
};

// Items surfaced in the mobile "More" overflow sheet. These routes are not
// reachable from the bottom tab bar directly.
export const MOBILE_MORE_ITEMS: NavItem[] = [
  {
    href: "/log/tag",
    label: "Tag a lift",
    mobileLabel: "Tag",
    icon: BarbellIcon,
    gitCommand: "$ git tag",
  },
  {
    href: "/injuries",
    label: "Injuries",
    mobileLabel: "Injuries",
    icon: ShieldAlert,
    gitCommand: "$ git issue",
  },
  {
    href: "/plans",
    label: "Plans",
    mobileLabel: "Plans",
    icon: GitBranch,
    gitCommand: "$ git branch",
  },
  {
    href: "/records",
    label: "Records",
    mobileLabel: "Records",
    icon: Tag,
    gitCommand: "$ git tag --list",
  },
];

export const LOG_CTA = {
  href: "/log/new",
  label: "Log Workout",
  gitCommand: "$ git commit",
} as const;

export const PAGE_META: Record<
  string,
  { title: string; gitCommand: string; slug: string }
> = {
  "/dashboard": {
    title: "Dashboard",
    gitCommand: "$ fithub status",
    slug: "dashboard",
  },
  "/track": {
    title: "Track",
    gitCommand: "$ git commit -m",
    slug: "track",
  },
  "/records": {
    title: "Records",
    gitCommand: "$ git tag --list",
    slug: "records",
  },
  "/history": {
    title: "History",
    gitCommand: "$ git log --all",
    slug: "history",
  },
  "/analytics": {
    title: "Analytics",
    gitCommand: "$ git diff",
    slug: "analytics",
  },
  "/log/new": {
    title: "Log Result",
    gitCommand: "$ git add .",
    slug: "log/new",
  },
  "/log/tag": {
    title: "Tag Milestone",
    gitCommand: "$ git tag",
    slug: "log/tag",
  },
  "/log": {
    title: "Log Workout",
    gitCommand: "$ git commit",
    slug: "log",
  },
  "/plans": {
    title: "Plans",
    gitCommand: "$ git branch",
    slug: "plans",
  },
  "/injuries": {
    title: "Injuries",
    gitCommand: "$ git issue --list",
    slug: "injuries",
  },
  "/coach": {
    title: "Coach",
    gitCommand: "$ git coach",
    slug: "coach",
  },
  "/settings": {
    title: "Settings",
    gitCommand: "$ git config",
    slug: "settings",
  },
  "/profile": {
    title: "Profile",
    gitCommand: "$ git config --user",
    slug: "profile",
  },
  "/admin": {
    title: "Admin",
    gitCommand: "$ fithub admin",
    slug: "admin",
  },
};

export function getPageMeta(pathname: string): {
  title: string;
  gitCommand: string;
  slug: string;
} {
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  for (const [route, meta] of Object.entries(PAGE_META)) {
    if (pathname.startsWith(route + "/")) return meta;
  }
  return { title: "FitHub", gitCommand: "$ fithub", slug: "fithub" };
}

// Guards against the /dashboard → /dashboard/... false-positive
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}
