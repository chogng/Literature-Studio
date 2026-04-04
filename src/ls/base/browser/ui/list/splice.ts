export function splice<T>(
  array: T[],
  start: number,
  deleteCount: number,
  items: Iterable<T> = [],
) {
  array.splice(start, deleteCount, ...items);
  return array;
}
