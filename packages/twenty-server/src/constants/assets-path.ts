import path from 'path';

// If the code is built through the testing module, assets are not output to the dist/assets directory.
// path.sep is required so Windows `__dirname` (`...\dist\constants`) matches.
const IS_BUILT_THROUGH_TESTING_MODULE = !__dirname
  .split(path.sep)
  .includes('dist');

export const ASSET_PATH = IS_BUILT_THROUGH_TESTING_MODULE
  ? path.resolve(__dirname, `../`)
  : path.resolve(__dirname, `../assets`);
