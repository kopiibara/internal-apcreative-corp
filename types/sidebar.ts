import {
  BarChart3,
  Building2,
  CheckCircle2,
  FileText,
  ClipboardList,
  Home,
  Megaphone,
  UsersRound,
  ListTodo,
  UserRoundCog,
  type LucideIcon,
} from "lucide-react";

export type SidebarMode = "admin" | "employee";

export type SidebarSubItem = {
  title: string;
  href: string;
  badge?: string;
};

export type SidebarItem = {
  title: string;
  href?: string;
  icon: LucideIcon;
  badge?: string;
  subItems?: SidebarSubItem[];
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
        title: "Dashboard",
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
        icon: ListTodo,
        subItems: [
          {
            title: "To-Do Task",
            href: "/admin/to-do/tasks",
          },
          {
            title: "Reminder",
            href: "/admin/to-do/reminders",
          },
        ],
      },
      {
        title: "Daily Progress Report",
        href: "/admin/daily-progress",
        icon: ClipboardList,
      },
    ],
  },
  {
    label: "Paid Media",
    items: [
      {
        title: "Ads Campaigns",
        href: "/admin/ads-campaigns",
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
        href: "/employee/dashboard",
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
        title: "To-Do",
        icon: ListTodo,
        subItems: [
          {
            title: "To-Do Task",
            href: "/employee/to-do/tasks",
          },
          {
            title: "Reminder",
            href: "/employee/to-do/reminders",
          },
        ],
      },
      {
        title: "Daily Progress Report",
        href: "/employee/daily-progress",
        icon: ClipboardList,
      },
      {
        title: "Ads Campaigns",
        href: "/employee/ads-campaigns",
        icon: Megaphone,
      },
    ],
  },
];
