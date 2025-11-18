import { usePathname } from 'next/navigation';
import { Icon } from '@iconify/react';

export const NavItems = () => {
  const pathname = usePathname();

  function isNavItemActive(pathname: string, nav: string) {
    return pathname.includes(nav);
  }

  return [
    {
      name: 'Home',
      href: '/',
      icon: <Icon icon="iconamoon:home-thin" width={20} height={20} />,
      active: pathname === '/',
      position: 'top',
    },
    {
      name: 'Fields',
      href: '/fields',
      icon: <Icon icon="ph:farm-thin" width={20} height={20} />,
      active: isNavItemActive(pathname, '/fields'),
      position: 'top',
    },
    {
      name: 'Inventory',
      href: '/inventory',
      icon: <Icon icon="ph:potted-plant-thin" width={20} height={20} />,
      active: isNavItemActive(pathname, '/inventory'),
      position: 'top',
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: (
        <Icon
          icon="material-symbols-light:analytics-outline-rounded"
          width={20}
          height={20}
        />
      ),
      active: isNavItemActive(pathname, '/analytics'),
      position: 'top',
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: <Icon icon="iconamoon:profile-thin" width={20} height={20} />,
      active: isNavItemActive(pathname, '/profile'),
      position: 'bottom',
    },
  ];
};
