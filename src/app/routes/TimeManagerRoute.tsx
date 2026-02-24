import { TimeManagerPage } from "../../components/TimeManagerPage";
import { mockTimeline, mockTodos } from "../../mockData";

export function TimeManagerRoute(): JSX.Element {
  return <TimeManagerPage todos={mockTodos} timelineItems={mockTimeline} />;
}
