export type NavigationKey =
  | 'properties'
  | 'tasks'
  | 'workflows'
  | 'inspect'
  | 'templates'
  | 'contacts'
  | 'calendar'
  | 'history'
  | 'config';

export interface NavigationItem {
  key: NavigationKey;
  path: string;
  label: string;
}

export const allNavigationItems: readonly NavigationItem[] = [
  { key: 'properties', path: '/', label: 'Properties' },
  { key: 'tasks', path: '/tasks', label: 'Tasks' },
  { key: 'workflows', path: '/workflows', label: 'Workflows' },
  { key: 'inspect', path: '/inspect', label: 'Inspect' },
  { key: 'templates', path: '/templates', label: 'Templates' },
  { key: 'contacts', path: '/tenant-contacts', label: 'Contacts' },
  { key: 'calendar', path: '/calendar', label: 'Calendar' },
  { key: 'history', path: '/history', label: 'History' },
  { key: 'config', path: '/config', label: 'Config' },
] as const;

export const mobilePrimaryItems = allNavigationItems.slice(0, 4);
export const mobileMoreItems = allNavigationItems.slice(4);

export const selectedNavigationKey = (pathname: string): NavigationKey => {
  if (pathname === '/' || pathname.startsWith('/properties/')) return 'properties';

  return allNavigationItems.find(item => item.path === pathname)?.key ?? 'properties';
};
