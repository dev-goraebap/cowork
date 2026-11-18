import { createFileRoute } from '@tanstack/react-router';
import { calendarFeedOptions } from '@/entities/calendar';
import { prepare } from '@/shared/lib/prepare';
import { calendarPlace } from '@/widgets/calendar-board';
import { useCrumbs } from '@/widgets/app-shell';
import { ProjectSchedulePage } from './ui/ProjectSchedulePage';

/** /workspace/projects/{key}/schedule: 프로젝트 일정. 보는 날짜는 주소의 쿼리가 정한다. */
export const Route = createFileRoute('/_app/workspace/projects/$key/schedule/')({
  loaderDeps: ({ search }) => search,
  loader: ({ context, location }) => prepare(context.queryClient, location.href, ({ prime }) => {
    const place = calendarPlace(location.searchStr);
    return prime(calendarFeedOptions(place.days[0] ?? place.day, place.days.at(-1) ?? place.day));
  }),
  component: function ProjectSchedulePageRoute() {
    const { key } = Route.useParams();
    return <ProjectSchedulePage crumbs={useCrumbs()} projectKey={key} />;
  },
});
