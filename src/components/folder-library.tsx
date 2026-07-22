"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import type { LibraryData, LibraryStudySet, StudyFolder } from "@/lib/folders";

function LibraryIcon({ name, size = 22 }: { name: "back" | "folder" | "cards" | "plus" | "edit" | "trash" | "arrow"; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    back: <path d="m15 18-6-6 6-6" />,
    folder: <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />,
    cards: <><rect x="4" y="5" width="15" height="14" rx="3"/><path d="M8 9h7M8 13h4M7 5V3h13a2 2 0 0 1 2 2v11h-3"/></>,
    plus: <path d="M12 5v14M5 12h14" />,
    edit: <><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13 7 4 4"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/></>,
    arrow: <path d="m9 18 6-6-6-6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>;
}

function reviewHref(folderId: string | null, setId?: string) {
  return folderId
    ? `/study/reviews/folder/${folderId}`
    : `/study/reviews/set/${setId}`;
}

function SetRow({
  set,
  folders,
  moving,
  onMove,
}: {
  set: LibraryStudySet;
  folders: StudyFolder[];
  moving: boolean;
  onMove: (setId: string, folderId: string | null) => void;
}) {
  return (
    <article className="folder-set-row">
      <Link href={`/study/${set.id}`} transitionTypes={["nav-forward"]} className="folder-set-main">
        <span className="folder-set-icon"><LibraryIcon name="cards" /></span>
        <span className="folder-set-copy">
          <strong>{set.title}</strong>
          <small>{set.count} карточек · {set.progress}% изучено{set.dueCount ? ` · ${set.dueCount} к повторению` : ""}</small>
        </span>
        <LibraryIcon name="arrow" size={18} />
      </Link>
      <label className="folder-set-move">
        <span>Папка</span>
        <select
          value={set.folderId ?? ""}
          onChange={(event) => onMove(set.id, event.target.value || null)}
          disabled={moving}
          aria-label={`Папка для набора ${set.title}`}
        >
          <option value="">Без папки</option>
          {folders.map((folder) => <option value={folder.id} key={folder.id}>{folder.name}</option>)}
        </select>
      </label>
    </article>
  );
}

export function FolderLibrary({ initialLibrary }: { initialLibrary: LibraryData }) {
  const [folders, setFolders] = useState(initialLibrary.folders);
  const [sets, setSets] = useState(initialLibrary.sets);
  const [newFolderName, setNewFolderName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const setsByFolder = useMemo(() => new Map(folders.map((folder) => [
    folder.id,
    sets.filter((set) => set.folderId === folder.id),
  ])), [folders, sets]);
  const unfiledSets = useMemo(() => sets.filter((set) => set.folderId === null), [sets]);

  async function createFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newFolderName.trim();
    if (!name || busy) return;

    setBusy("create");
    setError("");
    try {
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const result = await response.json() as { folder?: StudyFolder; error?: string };
      if (!response.ok || !result.folder) throw new Error(result.error ?? "Не удалось создать папку");
      setFolders((current) => [...current, result.folder!].sort((a, b) => a.name.localeCompare(b.name, "ru")));
      setNewFolderName("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось создать папку");
    } finally {
      setBusy(null);
    }
  }

  async function moveSet(setId: string, folderId: string | null) {
    const previousFolderId = sets.find((set) => set.id === setId)?.folderId ?? null;
    setBusy(`set:${setId}`);
    setError("");
    setSets((current) => current.map((set) => set.id === setId ? { ...set, folderId } : set));
    try {
      const response = await fetch(`/api/sets/${setId}/folder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Не удалось переместить набор");
    } catch (caught) {
      setSets((current) => current.map((set) => set.id === setId ? { ...set, folderId: previousFolderId } : set));
      setError(caught instanceof Error ? caught.message : "Не удалось переместить набор");
    } finally {
      setBusy(null);
    }
  }

  async function renameFolder(folder: StudyFolder) {
    const name = window.prompt("Новое название папки", folder.name)?.trim();
    if (!name || name === folder.name || busy) return;

    setBusy(`folder:${folder.id}`);
    setError("");
    try {
      const response = await fetch(`/api/folders/${folder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const result = await response.json() as { folder?: StudyFolder; error?: string };
      if (!response.ok || !result.folder) throw new Error(result.error ?? "Не удалось переименовать папку");
      setFolders((current) => current.map((item) => item.id === folder.id ? result.folder! : item));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось переименовать папку");
    } finally {
      setBusy(null);
    }
  }

  async function deleteFolder(folder: StudyFolder) {
    if (busy || !window.confirm(`Удалить папку «${folder.name}»? Наборы останутся в библиотеке.`)) return;

    setBusy(`folder:${folder.id}`);
    setError("");
    try {
      const response = await fetch(`/api/folders/${folder.id}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Не удалось удалить папку");
      setFolders((current) => current.filter((item) => item.id !== folder.id));
      setSets((current) => current.map((set) => set.folderId === folder.id ? { ...set, folderId: null } : set));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось удалить папку");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="folder-library-page">
      <header className="folder-library-topbar">
        <Link href="/" transitionTypes={["nav-back"]} aria-label="Вернуться на главную"><LibraryIcon name="back" /></Link>
        <div><span className="folder-library-brand">L</span><strong>Lina</strong></div>
        <span />
      </header>

      <section className="folder-library-shell">
        <div className="folder-library-heading">
          <div><span>Все материалы</span><h1>Библиотека</h1><p>Наборы в одной папке повторяются вместе. Наборы без папки — всегда отдельно.</p></div>
          <form onSubmit={createFolder}>
            <label htmlFor="new-folder">Новая папка</label>
            <div><input id="new-folder" value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} placeholder="Например, Английский B1" maxLength={120}/><button type="submit" disabled={!newFolderName.trim() || busy !== null}><LibraryIcon name="plus" size={18}/> Создать</button></div>
          </form>
        </div>

        {error && <p className="folder-library-error" role="alert">{error}</p>}

        <div className="folder-groups">
          {folders.map((folder) => {
            const folderSets = setsByFolder.get(folder.id) ?? [];
            const dueCount = folderSets.reduce((sum, set) => sum + set.dueCount, 0);
            return (
              <section className="folder-group" key={folder.id}>
                <header>
                  <div className="folder-group-title"><span><LibraryIcon name="folder" /></span><div><h2>{folder.name}</h2><p>{folderSets.length} наборов · единая очередь повторения</p></div></div>
                  <div className="folder-group-actions">
                    {dueCount > 0 && <Link className="folder-review-link" href={reviewHref(folder.id)} transitionTypes={["nav-forward"]}>{dueCount} к повторению</Link>}
                    <button type="button" onClick={() => renameFolder(folder)} disabled={busy !== null} aria-label={`Переименовать папку ${folder.name}`}><LibraryIcon name="edit" size={18}/></button>
                    <button type="button" onClick={() => deleteFolder(folder)} disabled={busy !== null} aria-label={`Удалить папку ${folder.name}`}><LibraryIcon name="trash" size={18}/></button>
                  </div>
                </header>
                <div className="folder-set-list">
                  {folderSets.length
                    ? folderSets.map((set) => <SetRow key={set.id} set={set} folders={folders} moving={busy === `set:${set.id}`} onMove={moveSet}/>)
                    : <p className="folder-empty">Пока пусто. Выберите эту папку в меню нужного набора.</p>}
                </div>
              </section>
            );
          })}

          <section className="folder-group unfiled">
            <header>
              <div className="folder-group-title"><span><LibraryIcon name="cards" /></span><div><h2>Без папки</h2><p>Каждый набор повторяется отдельно</p></div></div>
            </header>
            <div className="folder-set-list">
              {unfiledSets.length
                ? unfiledSets.map((set) => (
                  <div className="unfiled-set" key={set.id}>
                    <SetRow set={set} folders={folders} moving={busy === `set:${set.id}`} onMove={moveSet}/>
                    {set.dueCount > 0 && <Link className="folder-review-link" href={reviewHref(null, set.id)} transitionTypes={["nav-forward"]}>{set.dueCount} к повторению</Link>}
                  </div>
                ))
                : <p className="folder-empty">Все наборы распределены по папкам.</p>}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
