interface HolidayDto {
  name: string;
  date: string;
  isOffDay: boolean;
}

interface HolidaysResponseDto {
  year: number;
  days: HolidayDto[];
}

const HOLIDAY_API_URL = 'https://raw.githubusercontent.com/NateScarlet/holiday-cn/master';

export async function getHolidays(year: number): Promise<HolidayDto[]> {
  try {
    const response = await fetch(`${HOLIDAY_API_URL}/${year}.json`);
    if (!response.ok) {
      console.error('Failed to fetch holidays:', response.statusText);
      return [];
    }

    const data: HolidaysResponseDto = await response.json();
    return data.days || [];
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return [];
  }
}

export async function isWorkingDay(date: Date = new Date()): Promise<boolean> {
  // 首先检查是否是节假日
  const year = date.getFullYear();
  const holidays = await getHolidays(year);
  const dateString = date.toISOString().split('T')[0];
  const holiday = holidays.find(h => h.date === dateString);

  if (holiday) {
    // 如果是节假日，返回 !isOffDay
    // 这意味着如果是休息日返回 false，如果是工作日返回 true
    return !holiday.isOffDay;
  }

  // 如果不是节假日，检查是否是周末
  const dayOfWeek = date.getDay();
  return !(dayOfWeek === 0 || dayOfWeek === 6); // 如果是周末返回 false，否则返回 true
} 