interface NoteLike {
  id: string;
  folderId: string;
}

export function resolveNextCurrentNoteId(noteList: NoteLike[], selectedFolderId: string, currentNoteId: string): string {
  if (noteList.length === 0) return "";

  if (currentNoteId && noteList.some((note) => note.id === currentNoteId)) {
    return currentNoteId;
  }

  const firstInSelectedFolder = noteList.find((note) => note.folderId === selectedFolderId);
  if (firstInSelectedFolder) return firstInSelectedFolder.id;

  return noteList[0].id;
}

