import { format, parseISO } from "date-fns"
import { vi } from "date-fns/locale" // Để hiển thị tiếng Việt
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { DateRange } from "react-day-picker"

interface DatePickerWithRangeProps {
  className?: string
  date: { from: string; to: string }
  setDate: (date: { from: string; to: string }) => void
}

export function DatePickerWithRange({
  className,
  date,
  setDate,
}: DatePickerWithRangeProps) {
  // Chuyển string YYYY-MM-DD thành Date object cho Calendar hiểu
  const calendarDate: DateRange = {
    from: date.from ? parseISO(date.from) : undefined,
    to: date.to ? parseISO(date.to) : undefined,
  }

  // Khi chọn ngày xong, chuyển ngược lại thành string YYYY-MM-DD cho state
  const handleSelect = (selectedRange: DateRange | undefined) => {
    if (selectedRange?.from) {
      setDate({
        from: format(selectedRange.from, "yyyy-MM-dd"),
        to: selectedRange.to ? format(selectedRange.to, "yyyy-MM-dd") : format(selectedRange.from, "yyyy-MM-dd"),
      })
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-65 justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to && date.from !== date.to ? (
                <>
                  {format(parseISO(date.from), "dd/MM/yyyy")} -{" "}
                  {format(parseISO(date.to), "dd/MM/yyyy")}
                </>
              ) : (
                format(parseISO(date.from), "dd/MM/yyyy")
              )
            ) : (
              <span>Chọn ngày</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={calendarDate.from}
            selected={calendarDate}
            onSelect={handleSelect}
            numberOfMonths={2}
            locale={vi} // Lịch hiển thị tiếng Việt
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}