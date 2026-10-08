export function pageOf(query: { page?: string; pageSize?: string }) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function listed<T>(data: T[], total: number, page: number, pageSize: number) {
  return { data, meta: { page, pageSize, total } };
}
