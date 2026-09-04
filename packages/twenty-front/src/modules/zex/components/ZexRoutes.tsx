import { Navigate, Route, Routes } from 'react-router-dom';

import { ZexAgentsPage } from '@/zex/pages/ZexAgentsPage';
import { ZexCustomersPage } from '@/zex/pages/ZexCustomersPage';
import { ZexPipelinePage } from '@/zex/pages/ZexPipelinePage';
import { ZexProspectsPage } from '@/zex/pages/ZexProspectsPage';
import { ZexTodayPage } from '@/zex/pages/ZexTodayPage';

export const ZexRoutes = () => {
  return (
    <Routes>
      <Route path="today" element={<ZexTodayPage />} />
      <Route path="prospects" element={<ZexProspectsPage />} />
      <Route path="customers" element={<ZexCustomersPage />} />
      <Route path="pipeline" element={<ZexPipelinePage />} />
      <Route path="agents" element={<ZexAgentsPage />} />
      <Route path="*" element={<Navigate to="today" replace={true} />} />
    </Routes>
  );
};
