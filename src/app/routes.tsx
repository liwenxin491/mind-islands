import { createBrowserRouter } from 'react-router';
import { Hub } from './pages/Hub';
import { IslandDetail } from './pages/IslandDetail';
import { Onboarding } from './pages/Onboarding';
import { Insights } from './pages/Insights';
import { BodyHealthIsland } from './pages/islands/BodyHealthIsland';
import { WorkIsland } from './pages/islands/WorkIsland';
import { LearningIsland } from './pages/islands/LearningIsland';
import { RelationshipsIsland } from './pages/islands/RelationshipsIsland';
import { CuriosityIsland } from './pages/islands/CuriosityIsland';
import { CompassionIsland } from './pages/islands/CompassionIsland';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Hub,
  },
  {
    path: '/island/:islandId',
    Component: IslandDetail,
  },
  {
    path: '/island/body',
    Component: BodyHealthIsland,
  },
  {
    path: '/island/work',
    Component: WorkIsland,
  },
  {
    path: '/island/learning',
    Component: LearningIsland,
  },
  {
    path: '/island/relationships',
    Component: RelationshipsIsland,
  },
  {
    path: '/island/curiosity',
    Component: CuriosityIsland,
  },
  {
    path: '/island/compassion',
    Component: CompassionIsland,
  },
  {
    path: '/onboarding',
    Component: Onboarding,
  },
  {
    path: '/insights',
    Component: Insights,
  },
]);