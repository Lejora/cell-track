"use client";

import { format } from "date-fns";
import { CalendarIcon, Clock, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Input } from "./ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";

export type DateTimeBoundary = {
  date?: Date;
  time: string;
};

export type DateTimeRangeFilterValue = {
  from: DateTimeBoundary;
  to: DateTimeBoundary;
};

const DEFAULT_FROM_TIME = "00:00:00";
const DEFAULT_TO_TIME = "23:59:59";

export const EMPTY_DATE_TIME_RANGE_FILTER: DateTimeRangeFilterValue = {
  from: { time: DEFAULT_FROM_TIME },
  to: { time: DEFAULT_TO_TIME },
};

function dateKey(date?: Date) {
  if (!date) return "";
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function dateTimeRangeValuesEqual(
  a: DateTimeRangeFilterValue,
  b: DateTimeRangeFilterValue
) {
  return (
    dateKey(a.from.date) === dateKey(b.from.date) &&
    dateKey(a.to.date) === dateKey(b.to.date) &&
    a.from.time === b.from.time &&
    a.to.time === b.to.time
  );
}

function normalizeTimeValue(value: string, fallback: string) {
  if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) return value;
  return fallback;
}

function DateTimeField({
  label,
  value,
  fallbackDate,
  fallbackTime,
  onChange,
}: {
  label: string;
  value: DateTimeBoundary;
  fallbackDate?: Date;
  fallbackTime: string;
  onChange: (value: DateTimeBoundary) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-md border bg-background p-1">
      <span className="px-1 text-xs text-muted-foreground">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-[112px] justify-start px-2 font-mono text-xs font-normal",
              !value.date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {value.date ? format(value.date, "yyyy/MM/dd") : "日付"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={value.date}
            defaultMonth={value.date ?? fallbackDate}
            onSelect={(date) =>
              onChange({
                date,
                time: normalizeTimeValue(value.time, fallbackTime),
              })
            }
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <div className="relative">
        <Clock className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          type="time"
          step="1"
          value={normalizeTimeValue(value.time, fallbackTime)}
          onChange={(event) =>
            onChange({
              ...value,
              date: value.date ?? fallbackDate,
              time: normalizeTimeValue(event.target.value, fallbackTime),
            })
          }
          className="h-8 w-[105px] pl-7 pr-2 font-mono text-xs"
        />
      </div>
    </div>
  );
}

export function DateTimeRangeFilter({
  value,
  fallbackFromDate,
  fallbackToDate,
  resetValue,
  onChange,
}: {
  value: DateTimeRangeFilterValue;
  fallbackFromDate?: Date;
  fallbackToDate?: Date;
  resetValue?: DateTimeRangeFilterValue;
  onChange: (value: DateTimeRangeFilterValue) => void;
}) {
  const hasValue = Boolean(value.from.date || value.to.date);
  const canReset = resetValue
    ? !dateTimeRangeValuesEqual(value, resetValue)
    : hasValue;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DateTimeField
        label="開始"
        value={value.from}
        fallbackDate={fallbackFromDate}
        fallbackTime={DEFAULT_FROM_TIME}
        onChange={(from) => onChange({ ...value, from })}
      />
      <DateTimeField
        label="終了"
        value={value.to}
        fallbackDate={fallbackToDate}
        fallbackTime={DEFAULT_TO_TIME}
        onChange={(to) => onChange({ ...value, to })}
      />
    </div>
  );
}
