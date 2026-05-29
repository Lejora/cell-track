import { SelectCellLog } from "@/db/schema";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * カスタム形式のタイムスタンプ文字列を整形するユーティリティ関数
 * @param timestamp "YYMMDDHHmmssSS" 形式の文字列
 * @returns "YY/MM/DD HH:mm:ss.SS" 形式の文字列
 */
export const formatCustomTimestamp = (timestamp: string | null): string => {
  if (!timestamp || timestamp.length != 14) return timestamp ?? "N/A";

  try {
    const year = `20${timestamp.substring(0, 2)}`;
    const month = timestamp.substring(2, 4);
    const day = timestamp.substring(4, 6);
    const hour = timestamp.substring(6, 8);
    const minute = timestamp.substring(8, 10);
    const second = timestamp.substring(10, 12);
    const millisecond = timestamp.substring(12, 14);

    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      Number(millisecond)
    );

    const ymd = new Intl.DateTimeFormat("ja-JP", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
    const hms = new Intl.DateTimeFormat("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);

    return `${ymd} ${hms}.${millisecond}`;
  } catch (e) {
    console.error(e);
    return timestamp;
  }
};

export const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

export const normalizePoint = (p: SelectCellLog) => {
  const lat = typeof p.lat === "string" ? Number(p.lat) : p.lat;
  const lng = typeof p.lng === "string" ? Number(p.lng) : p.lng;
  return { ...p, lat, lng };
};

export const isLatLngPoint = (
  p: SelectCellLog
): p is SelectCellLog & { lat: number; lng: number } =>
  isFiniteNumber(p.lat) && isFiniteNumber(p.lng);
