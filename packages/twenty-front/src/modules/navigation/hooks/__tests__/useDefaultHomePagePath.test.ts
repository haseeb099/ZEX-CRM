import { currentUserState } from '@/auth/states/currentUserState';
import { currentUserWorkspaceState } from '@/auth/states/currentUserWorkspaceState';
import { metadataStoreState } from '@/metadata-store/states/metadataStoreState';
import { useDefaultHomePagePath } from '@/navigation/hooks/useDefaultHomePagePath';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { jotaiStore } from '@/ui/utilities/state/jotai/jotaiStore';
import { ZEX_APP_PATH } from '@/zex/constants/zex-app-path';
import { renderHook, waitFor } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { createElement, useEffect, type ReactNode } from 'react';
import { AppPath } from 'twenty-shared/types';
import { mockedUserData } from '~/testing/mock-data/users';
import { getTestEnrichedObjectMetadataItemsMock } from '~/testing/utils/getTestEnrichedObjectMetadataItemsMock';
import { setTestObjectMetadataItemsInMetadataStore } from '~/testing/utils/setTestObjectMetadataItemsInMetadataStore';

let mockIsMobile = false;

jest.mock('@/ui/utilities/responsive/hooks/useIsMobile', () => ({
  useIsMobile: () => mockIsMobile,
}));

const Wrapper = ({ children }: { children: ReactNode }) =>
  createElement(JotaiProvider, { store: jotaiStore }, children);

const renderHooks = ({
  withCurrentUser,
  withObjectMetadataLoaded = true,
  withNavigationMenuItemsLoaded = true,
}: {
  withCurrentUser: boolean;
  withObjectMetadataLoaded?: boolean;
  withNavigationMenuItemsLoaded?: boolean;
}) => {
  if (withObjectMetadataLoaded) {
    setTestObjectMetadataItemsInMetadataStore(
      jotaiStore,
      getTestEnrichedObjectMetadataItemsMock(),
    );
  } else {
    jotaiStore.set(metadataStoreState.atomFamily('objectMetadataItems'), {
      current: [],
      draft: [],
      status: 'empty',
    });
  }

  jotaiStore.set(metadataStoreState.atomFamily('navigationMenuItems'), {
    current: [],
    draft: [],
    status: withNavigationMenuItemsLoaded ? 'up-to-date' : 'empty',
  });

  const { result } = renderHook(
    () => {
      const setCurrentUser = useSetAtomState(currentUserState);
      const setCurrentUserWorkspace = useSetAtomState(
        currentUserWorkspaceState,
      );

      useEffect(() => {
        if (withCurrentUser) {
          setCurrentUser(mockedUserData);
          setCurrentUserWorkspace(mockedUserData.currentUserWorkspace);
        }
      }, [setCurrentUser, setCurrentUserWorkspace]);

      return useDefaultHomePagePath();
    },
    {
      wrapper: Wrapper,
    },
  );
  return { result };
};

describe('useDefaultHomePagePath', () => {
  afterEach(() => {
    mockIsMobile = false;
  });

  it('should return sign-in when no currentUser', async () => {
    const { result } = renderHooks({
      withCurrentUser: false,
    });

    await waitFor(() => {
      expect(result.current.defaultHomePagePath).toEqual(AppPath.SignInUp);
    });
  });

  it('should return ZEX Today when desktop user and metadata are loaded', async () => {
    const { result } = renderHooks({
      withCurrentUser: true,
    });

    await waitFor(() => {
      expect(result.current.defaultHomePagePath).toEqual(ZEX_APP_PATH.Today);
    });
  });

  it('should defer to AppPath.Index when object metadata is not loaded yet', async () => {
    const { result } = renderHooks({
      withCurrentUser: true,
      withObjectMetadataLoaded: false,
    });

    await waitFor(() => {
      expect(result.current.defaultHomePagePath).toEqual(AppPath.Index);
    });
  });

  it('should defer to AppPath.Index when navigation menu items are not loaded yet', async () => {
    const { result } = renderHooks({
      withCurrentUser: true,
      withNavigationMenuItemsLoaded: false,
    });

    await waitFor(() => {
      expect(result.current.defaultHomePagePath).toEqual(AppPath.Index);
    });
  });

  it('should return the mobile home page on mobile', async () => {
    mockIsMobile = true;

    const { result } = renderHooks({
      withCurrentUser: true,
    });

    await waitFor(() => {
      expect(result.current.defaultHomePagePath).toEqual(AppPath.Home);
    });
  });

  it('should still return the sign in page on mobile when there is no currentUser', async () => {
    mockIsMobile = true;
    jotaiStore.set(currentUserState.atom, null);

    const { result } = renderHooks({
      withCurrentUser: false,
    });

    await waitFor(() => {
      expect(result.current.defaultHomePagePath).toEqual(AppPath.SignInUp);
    });
  });
});
