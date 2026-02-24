import { NotesPage } from "../../components/NotesPage";
import { mockNotes } from "../../mockData";
import { useRuntimeStore } from "../../stores/useRuntimeStore";

export function NotesRoute(): JSX.Element {
  const baseDir = useRuntimeStore((state) => state.baseDir);
  return <NotesPage notes={mockNotes} baseDir={baseDir} />;
}
