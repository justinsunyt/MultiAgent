function isToday(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function isYesterday(dateStr: string) {
  const date = new Date(dateStr);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
}

function daysAgo(dateStr: string) {
  const date = new Date(dateStr);
  const currentDate = new Date();
  const dateDifference = currentDate.getTime() - date.getTime();
  const daysDifference = dateDifference / (1000 * 60 * 60 * 24);
  return Math.floor(daysDifference);
}

export function daysAgoStr(dateStr: string, capitalize: boolean = false) {
  const string = isToday(dateStr)
    ? "today"
    : isYesterday(dateStr)
    ? "yesterday"
    : daysAgo(dateStr).toString() + " days ago";
  if (capitalize) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
  return string;
}
