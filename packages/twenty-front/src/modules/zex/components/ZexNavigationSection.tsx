import { useMatch, useResolvedPath } from 'react-router-dom';

import { NavigationDrawerItem } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem';
import { NavigationDrawerSection } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSection';
import { NavigationDrawerSectionTitle } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSectionTitle';
import { ZEX_NAVIGATION_ITEMS } from '@/zex/constants/zex-navigation-items';

export const ZexNavigationSection = () => {
  return (
    <NavigationDrawerSection>
      <NavigationDrawerSectionTitle label="ZEX" />
      {ZEX_NAVIGATION_ITEMS.map((item) => (
        <ZexNavigationDrawerItem
          key={item.id}
          label={item.label}
          path={item.path}
          Icon={item.Icon}
        />
      ))}
    </NavigationDrawerSection>
  );
};

type ZexNavigationDrawerItemProps = {
  label: string;
  path: string;
  Icon: (typeof ZEX_NAVIGATION_ITEMS)[number]['Icon'];
};

const ZexNavigationDrawerItem = ({
  label,
  path,
  Icon,
}: ZexNavigationDrawerItemProps) => {
  const resolvedPath = useResolvedPath(path).pathname;
  const matchResult = useMatch({
    path: resolvedPath,
    end: false,
  });

  return (
    <NavigationDrawerItem
      label={label}
      to={path}
      Icon={Icon}
      active={!!matchResult}
    />
  );
};
