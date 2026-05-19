import {
  BarChart3,
  Building2,
  CheckCircle2,
  FileText,
  Home,
  Megaphone,
  UsersRound,
  UserRoundCog,
  type LucideIcon,
} from "lucide-react";

export type SidebarMode = "admin" | "employee";

export type SidebarItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

export type SidebarGroupItem = {
  label: string;
  items: SidebarItem[];
};

export const adminGroups: SidebarGroupItem[] = [
  {
    label: "Overview",
    items: [
      {
        title: "Executive Dashboard",
        href: "/admin",
        icon: Home,
      },
      {
        title: "Daily Reports",
        href: "/admin/daily-reports",
        icon: FileText,
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        title: "Approval",
        href: "/admin/approvals",
        icon: CheckCircle2,
      },
      {
        title: "Brands",
        href: "/admin/brands",
        icon: Building2,
      },
    ],
  },
  {
    label: "Analytics",
    items: [
      {
        title: "Platform Analytics",
        href: "/admin/platform-analytics",
        icon: BarChart3,
      },
      {
        title: "Staff Accountability",
        href: "/admin/staff-accountability",
        icon: UsersRound,
      },
    ],
  },
  {
    label: "Management",
    items: [
      {
        title: "Account Control",
        href: "/admin/account-control",
        icon: UserRoundCog,
      },
      {
        title: "To-Do",
        href: "/admin/to-do",
        icon: UserRoundCog,
      },
    ],
  },
  {
    label: "Paid Media",
    items: [
      {
        title: "Ads & Campaigns",
        href: "/admin/ads&campaigns",
        icon: Megaphone,
      },
    ],
  },
];

export const employeeGroups: SidebarGroupItem[] = [
  {
    label: "Employee Dashboard",
    items: [
      {
        title: "My Brand Dashboard",
        href: "/employee",
        icon: Home,
      },

      {
        title: "Approvals",
        href: "/employee/approvals",
        icon: CheckCircle2,
      },
      {
        title: "Platform Analytics",
        href: "/employee/platform-analytics",
        icon: BarChart3,
      },
      {
        title: "Ads Performance",
        href: "/employee/ads-performance",
        icon: Megaphone,
      },
    ],
  },
];
