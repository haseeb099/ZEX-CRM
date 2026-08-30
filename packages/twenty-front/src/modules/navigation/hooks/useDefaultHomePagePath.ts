import { currentUserState } from '@/auth/states/currentUserState';
import { metadataStoreState } from '@/metadata-store/states/metadataStoreState';
import { metadataStoreStatusFamilySelector } from '@/metadata-store/states/metadataStoreStatusFamilySelector';
import { useIsMobile } from '@/ui/utilities/responsive/hooks/useIsMobile';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useMemo } from 'react';
import { AppPath } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { ZEX_APP_PATH } from '@/zex/constants/zex-app-path';

export const useDefaultHomePagePath = () => {
  const currentUser = useAtomStateValue(currentUserState);
  const isMobile = useIsMobile();
  const metadataStore = useAtomFamilyStateValue(
    metadataStoreState,
    'objectMetadataItems',
  );
  const areObjectMetadataItemsLoaded = metadataStore.status === 'up-to-date';
  const navigationMenuItemsStatus = useAtomFamilySelectorValue(
    metadataStoreStatusFamilySelector,
    'navigationMenuItems',
  );
  const areNavigationMenuItemsLoaded =
    navigationMenuItemsStatus === 'up-to-date';

  const defaultHomePagePath = useMemo(() => {
    if (!isDefined(currentUser)) {
      return AppPath.SignInUp;
    }

    if (isMobile) {
      return AppPath.Home;
    }

    // Both stores are transiently empty during the post-login window;
    // deciding the redirect before they are loaded could strand users on a
    // wrong fallback.
    if (!areObjectMetadataItemsLoaded || !areNavigationMenuItemsLoaded) {
      return AppPath.Index;
    }

    // ZEX: land authenticated desktop customers on the Today shell.
    // Mobile keeps /home. See docs/ZEX_APP_SHELL.md.
    return ZEX_APP_PATH.Today;
  }, [
    currentUser,
    isMobile,
    areObjectMetadataItemsLoaded,
    areNavigationMenuItemsLoaded,
  ]);

  return { defaultHomePagePath };
};
