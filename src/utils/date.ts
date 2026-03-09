export const toDateKey = (value: Date) => value.toISOString().slice(0, 10);

export const prettyDateTime = (date: string, startTime: string, endTime: string) => {
  const day = new Date(`${date}T00:00:00`);
  return `${day.toDateString()} • ${startTime} - ${endTime}`;
};
