import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface MonthCalendarNavigationProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onDateSelect: (date: Date) => void;
}

export function MonthCalendarNavigation({
  currentMonth,
  onMonthChange,
  onDateSelect,
}: MonthCalendarNavigationProps) {
  // Handle month change
  const handleMonthChange = (monthIndex: string) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(parseInt(monthIndex));
    onMonthChange(newDate);
  };

  // Get Thai month names
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentMonth.getMonth().toString()}
        onValueChange={handleMonthChange}
      >
        <SelectTrigger className="w-[140px] border-none shadow-none hover:bg-gray-100 text-sm font-semibold">
          <SelectValue>
            {thaiMonths[currentMonth.getMonth()]}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {thaiMonths.map((month, index) => (
            <SelectItem key={index} value={index.toString()}>
              {month}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

