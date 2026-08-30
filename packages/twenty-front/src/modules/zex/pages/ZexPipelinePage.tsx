import { Navigate } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';

// Pipeline maps to native Opportunities — do not rebuild the pipeline UI.
export const ZexPipelinePage = () => {
  return <Navigate to={AppPath.OpportunitiesPage} replace={true} />;
};
