/** Addresses drawn by PanelHost. Plain links keep the current detail's page/dialog presentation. */
export function isDetailAddress(href: string) {
  const pathname = href.split(/[?#]/, 1)[0];
  return /^\/office\/admin\/(?:leave-requests|overtime-requests|leave-allowances|employees)\/[0-9a-fA-F-]{36}$/.test(pathname)
    || /^\/(?:meetings|weekly-reports|announcements|requests)\/[0-9a-fA-F-]{36}$/.test(pathname)
    || /^\/office\/schedule\/(?:events|leaves|overtime)\/[0-9a-fA-F-]{36}$/.test(pathname)
    || /^\/office\/schedule\/days\/\d{4}-\d{2}-\d{2}$/.test(pathname);
}
