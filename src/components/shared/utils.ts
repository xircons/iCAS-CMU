import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  LucideIcon,
} from "lucide-react";

export type StatusType =
  | "pending"
  | "approved"
  | "rejected"
  | "active"
  | "inactive"
  | "revision";

export interface StatusConfig {
  label: string;
  icon: LucideIcon;
  className: string;
}

export const STATUS_CONFIG: Record<StatusType, StatusConfig> = {
  pending: {
    label: "รอการอนุมัติ",
    icon: Clock,
    className: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  },
  approved: {
    label: "อนุมัติแล้ว",
    icon: CheckCircle,
    className: "bg-green-100 text-green-700 hover:bg-green-100",
  },
  rejected: {
    label: "ปฏิเสธแล้ว",
    icon: XCircle,
    className: "bg-red-100 text-red-700 hover:bg-red-100",
  },
  active: {
    label: "ใช้งานอยู่",
    icon: CheckCircle,
    className: "bg-green-100 text-green-700 hover:bg-green-100",
  },
  inactive: {
    label: "ไม่ใช้งาน",
    icon: XCircle,
    className: "bg-red-100 text-red-700 hover:bg-red-100",
  },
  revision: {
    label: "ต้องแก้ไข",
    icon: AlertCircle,
    className: "bg-orange-100 text-orange-700 hover:bg-orange-100",
  },
};

export function formatDate(date: string | Date, locale: string = "th-TH"): string {
  return new Date(date).toLocaleDateString(locale);
}

export function formatUserName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.substring(0, 1)}${lastName.substring(0, 1)}`;
}

