import {
  addDays,
  addHours,
  format,
  isAfter,
  isBefore,
  isWeekend,
  parseISO,
  startOfDay,
  differenceInHours,
  setHours,
  setMinutes,
} from "date-fns";
import { UnavailableSlot } from "@/types/task";

/**
 * 检查某个日期是否在不可用时间段内
 */
export function isDateUnavailable(
  date: Date,
  unavailableSlots: UnavailableSlot[]
): boolean {
  const dateStr = format(date, "yyyy-MM-dd");

  return unavailableSlots.some((slot) => {
    if (slot.date === dateStr && slot.isFullDay) {
      return true;
    }

    if (slot.date === dateStr && slot.startTime && slot.endTime) {
      const [startHour, startMinute] = slot.startTime.split(":").map(Number);
      const [endHour, endMinute] = slot.endTime.split(":").map(Number);

      const slotStart = setMinutes(setHours(date, startHour), startMinute);
      const slotEnd = setMinutes(setHours(date, endHour), endMinute);

      return !isBefore(date, slotStart) && !isAfter(date, slotEnd);
    }

    return false;
  });
}

/**
 * 计算从现在到 deadline 之间的可用工作小时数
 */
export function calculateAvailableHours(
  deadline: string,
  unavailableSlots: UnavailableSlot[],
  workingHoursPerDay: number = 8
): number {
  const now = new Date();
  const deadlineDate = parseISO(deadline);

  if (isBefore(deadlineDate, now)) {
    return 0;
  }

  let totalHours = 0;
  let currentDate = startOfDay(now);

  while (isBefore(currentDate, deadlineDate)) {
    // 跳过周末
    if (!isWeekend(currentDate)) {
      const isUnavailable = unavailableSlots.some(
        (slot) =>
          slot.date === format(currentDate, "yyyy-MM-dd") && slot.isFullDay
      );

      if (!isUnavailable) {
        totalHours += workingHoursPerDay;
      }
    }

    currentDate = addDays(currentDate, 1);
  }

  return totalHours;
}

/**
 * 获取下一个可用的工作时间
 */
export function getNextAvailableTime(
  startTime: Date,
  unavailableSlots: UnavailableSlot[]
): Date {
  let currentTime = startTime;

  while (
    isWeekend(currentTime) ||
    isDateUnavailable(currentTime, unavailableSlots)
  ) {
    currentTime = addDays(currentTime, 1);
    currentTime = setHours(currentTime, 10); // 设置为工作日早上 10:30
    currentTime = setMinutes(currentTime, 30);
  }

  return currentTime;
}

/**
 * 为任务分配开始时间（考虑不可用时间）
 */
export function scheduleTask(
  startTime: Date,
  durationHours: number,
  unavailableSlots: UnavailableSlot[],
  workingHoursPerDay: number = 8
): Date {
  let currentTime = getNextAvailableTime(startTime, unavailableSlots);
  let remainingHours = durationHours;

  while (remainingHours > 0) {
    const currentHour = currentTime.getHours();

    // 确保在工作时间内（10:30 - 18:00）
    if (currentHour < 10 || (currentHour === 10 && currentTime.getMinutes() < 30)) {
      currentTime = setHours(currentTime, 10);
      currentTime = setMinutes(currentTime, 30);
    }

    if (currentHour >= 18) {
      currentTime = addDays(currentTime, 1);
      currentTime = setHours(currentTime, 10);
      currentTime = setMinutes(currentTime, 30);
      currentTime = getNextAvailableTime(currentTime, unavailableSlots);
      continue;
    }

    // 检查当前时间是否可用
    if (isDateUnavailable(currentTime, unavailableSlots)) {
      currentTime = getNextAvailableTime(
        addDays(currentTime, 1),
        unavailableSlots
      );
      continue;
    }

    // 计算当天剩余可工作小时
    const endOfWorkDay = setHours(setMinutes(currentTime, 0), 18);
    const hoursUntilEndOfDay = differenceInHours(endOfWorkDay, currentTime);

    if (remainingHours <= hoursUntilEndOfDay) {
      return currentTime;
    }

    remainingHours -= hoursUntilEndOfDay;
    currentTime = addDays(currentTime, 1);
    currentTime = setHours(currentTime, 10);
    currentTime = setMinutes(currentTime, 30);
    currentTime = getNextAvailableTime(currentTime, unavailableSlots);
  }

  return currentTime;
}

/**
 * 格式化日期时间为友好格式
 */
export function formatDateTime(date: Date): string {
  return format(date, "yyyy-MM-dd HH:mm");
}
