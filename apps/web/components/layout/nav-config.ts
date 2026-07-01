import {
  LayoutDashboard,
  GitCommit,
  Plus,
  GitBranch,
  Tag,
  TrendingUp,
  History,
  MessageSquare,
  User,
  type LucideIcon,
} from "lucide-react";

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
    href: "/track",
    label: "Track",
    mobileLabel: "Track",
    icon: GitCommit,
    gitCommand: "$ git commit -m",
  },
  {
    href: "/log/new",
    label: "Log Result",
    mobileLabel: "Log",
    icon: Plus,
    gitCommand: "$ git add .",
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
    href: "/coach",
    label: "Coach",
    mobileLabel: "Coach",
    icon: MessageSquare,
    gitCommand: "$ git coach",
    mobileShow: true,
  },
  {
    href: "/profile",
    label: "Profile",
    mobileLabel: "Profile",
    icon: User,
    gitCommand: "$ git config --user",
    mobileShow: true,
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
