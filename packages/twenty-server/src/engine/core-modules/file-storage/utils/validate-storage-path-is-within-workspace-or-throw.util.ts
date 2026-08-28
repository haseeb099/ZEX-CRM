import { posix } from 'path';

import { type FileFolder } from 'twenty-shared/types';

import {
  FileStorageException,
  FileStorageExceptionCode,
} from 'src/engine/core-modules/file-storage/interfaces/file-storage-exception';

export const validateStoragePathIsWithinWorkspaceOrThrow = ({
  onStoragePath,
  workspaceId,
  applicationUniversalIdentifier,
  fileFolder,
}: {
  onStoragePath: string;
  workspaceId: string;
  applicationUniversalIdentifier: string;
  fileFolder: FileFolder;
}): void => {
  const expectedPrefix = posix.join(
    workspaceId,
    applicationUniversalIdentifier,
    fileFolder,
  );

  const normalizedPath = posix.normalize(onStoragePath);
  const normalizedPrefix = posix.normalize(`${expectedPrefix}/`);

  if (!normalizedPath.startsWith(normalizedPrefix)) {
    throw new FileStorageException(
      'Invalid storage path: resolved path escapes the expected directory',
      FileStorageExceptionCode.ACCESS_DENIED,
    );
  }
};
