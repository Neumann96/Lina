"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { LibraryData, LibraryStudySet, StudyFolder } from "@/lib/folders";

const COLLAPSED_FOLDERS_STORAGE_KEY = "lina-collapsed-folder-groups";
const UNFILED_GROUP_ID = "unfiled";

function LibraryIcon({ name, size = 22 }: { name: "back" | "folder" | "cards" | "plus" | "edit" | "trash" | "arrow" | "chevron" | "clock"; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    back: <path d="m15 18-6-6 6-6" />,
    folder: <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />,
    cards: <><rect x="4" y="5" width="15" height="14" rx="3"/><path d="M8 9h7M8 13h4M7 5V3h13a2 2 0 0 1 2 2v11h-3"/></>,
    plus: <path d="M12 5v14M5 12h14" />,
    edit: <><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13 7 4 4"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/></>,
    arrow: <path d="m9 18 6-6-6-6" />,
    chevron: <path d="m8 10 4 4 4-4" />,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>;
}

function reviewHref(folderId: string | null) {
  return folderId
    ? `/study/reviews/folder/${folderId}`
    : "/study/reviews/unfiled/all";
}

function FolderSelect({
  set,
  folders,
  disabled,
  onMove,
}: {
  set: LibraryStudySet;
  folders: StudyFolder[];
  disabled: boolean;
  onMove: (setId: string, folderId: string | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedFolder = folders.find((folder) => folder.id === set.folderId);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  function choose(folderId: string | null) {
    setIsOpen(false);
    if (folderId !== set.folderId) onMove(set.id, folderId);
  }

  return (
    <div className={`folder-select${isOpen ? " is-open" : ""}`} ref={rootRef}>
      <button
        className="folder-select-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Папка для набора ${set.title}`}
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{selectedFolder?.name ?? "Без папки"}</span>
        <LibraryIcon name="chevron" size={16}/>
      </button>
      {isOpen && (
        <div className="folder-select-menu" role="listbox" aria-label={`Выберите папку для набора ${set.title}`}>
          <button type="button" role="option" aria-selected={set.folderId === null} className={set.folderId === null ? "selected" : ""} onClick={() => choose(null)}>
            <span>Без папки</span>
            {set.folderId === null && <span aria-hidden>✓</span>}
          </button>
          {folders.map((folder) => (
            <button type="button" role="option" aria-selected={set.folderId === folder.id} className={set.folderId === folder.id ? "selected" : ""} onClick={() => choose(folder.id)} key={folder.id}>
              <span>{folder.name}</span>
              {set.folderId === folder.id && <span aria-hidden>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DeleteSetModal({
  set,
  pending,
  onClose,
  onConfirm,
}: {
  set: LibraryStudySet;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, pending]);

  return (
    <div className="folder-modal-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !pending && onClose()}>
      <section className="folder-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-set-title" aria-describedby="delete-set-description">
        <button className="folder-modal-close" type="button" onClick={onClose} disabled={pending} aria-label="Закрыть">×</button>
        <span className="folder-delete-icon"><LibraryIcon name="trash" size={24}/></span>
        <span className="folder-delete-eyebrow">Удаление набора</span>
        <h2 id="delete-set-title">Действительно удалить «{set.title}»?</h2>
        <p id="delete-set-description">Все карточки, история повторений и прогресс этого набора будут удалены без возможности восстановления.</p>
        <div className="folder-delete-actions">
          <button ref={cancelRef} className="folder-delete-cancel" type="button" onClick={onClose} disabled={pending}>Оставить набор</button>
          <button className="folder-delete-confirm" type="button" onClick={onConfirm} disabled={pending}>{pending ? "Удаляем…" : "Удалить набор"}</button>
        </div>
      </section>
    </div>
  );
}

function SetRow({
  set,
  folders,
  moving,
  onMove,
  onDelete,
}: {
  set: LibraryStudySet;
  folders: StudyFolder[];
  moving: boolean;
  onMove: (setId: string, folderId: string | null) => void;
  onDelete: (set: LibraryStudySet) => void;
}) {
  return (
    <article className="folder-set-row">
      <Link href={`/study/${set.id}`} transitionTypes={["nav-forward"]} className="folder-set-main">
        <span className="folder-set-icon"><LibraryIcon name="cards" /></span>
        <span className="folder-set-copy">
          <strong>{set.title}</strong>
          <small>{set.count} карточек · {set.progress}% изучено</small>
        </span>
        <LibraryIcon name="arrow" size={18} />
      </Link>
      <div className="folder-set-controls">
        <label className="folder-set-move">
        <span>Папка</span>
          <FolderSelect set={set} folders={folders} disabled={moving} onMove={onMove}/>
        </label>
        <button className="folder-set-delete" type="button" onClick={() => onDelete(set)} disabled={moving} aria-label={`Удалить набор ${set.title}`}>
          <LibraryIcon name="trash" size={18}/>
        </button>
      </div>
    </article>
  );
}

export function FolderLibrary({
  initialLibrary,
  embedded = false,
  onSetDeleted,
  onSetMoved,
  onFolderRenamed,
  onFolderDeleted,
}: {
  initialLibrary: LibraryData;
  embedded?: boolean;
  onSetDeleted?: (set: LibraryStudySet) => void;
  onSetMoved?: (set: LibraryStudySet, folder: StudyFolder | null) => void;
  onFolderRenamed?: (folder: StudyFolder) => void;
  onFolderDeleted?: (folder: StudyFolder, sets: LibraryStudySet[]) => void;
}) {
  const [folders, setFolders] = useState(initialLibrary.folders);
  const [sets, setSets] = useState(initialLibrary.sets);
  const [newFolderName, setNewFolderName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [setToDelete, setSetToDelete] = useState<LibraryStudySet | null>(null);
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<string[]>([]);
  const [collapsePreferencesLoaded, setCollapsePreferencesLoaded] = useState(false);

  const setsByFolder = useMemo(() => new Map(folders.map((folder) => [
    folder.id,
    sets.filter((set) => set.folderId === folder.id),
  ])), [folders, sets]);
  const unfiledSets = useMemo(() => sets.filter((set) => set.folderId === null), [sets]);
  const dueSets = useMemo(() => sets.filter((set) => set.dueCount > 0), [sets]);
  const dueCount = useMemo(() => dueSets.reduce((sum, set) => sum + set.dueCount, 0), [dueSets]);
  const dueGroups = useMemo(() => [
    ...folders.flatMap((folder) => {
      const count = (setsByFolder.get(folder.id) ?? []).reduce((sum, set) => sum + set.dueCount, 0);
      return count > 0
        ? [{ key: `folder:${folder.id}`, title: folder.name, dueCount: count, href: reviewHref(folder.id) }]
        : [];
    }),
    ...(() => {
      const count = unfiledSets.reduce((sum, set) => sum + set.dueCount, 0);
      return count > 0
        ? [{ key: "unfiled:all", title: "Без папки", dueCount: count, href: reviewHref(null) }]
        : [];
    })(),
  ], [folders, setsByFolder, unfiledSets]);

  useEffect(() => {
    let storedGroupIds: string[] = [];
    try {
      const stored = JSON.parse(window.localStorage.getItem(COLLAPSED_FOLDERS_STORAGE_KEY) ?? "[]") as unknown;
      if (Array.isArray(stored)) {
        storedGroupIds = stored.filter((id): id is string => typeof id === "string").slice(0, 200);
      }
    } catch {
      // Ignore malformed or unavailable local storage and keep every group open.
    }
    const animationFrame = window.requestAnimationFrame(() => {
      setCollapsedGroupIds(storedGroupIds);
      setCollapsePreferencesLoaded(true);
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

  useEffect(() => {
    if (!collapsePreferencesLoaded) return;
    try {
      window.localStorage.setItem(COLLAPSED_FOLDERS_STORAGE_KEY, JSON.stringify(collapsedGroupIds));
    } catch {
      // Folder controls still work when storage is unavailable.
    }
  }, [collapsePreferencesLoaded, collapsedGroupIds]);

  function toggleGroup(groupId: string) {
    setCollapsedGroupIds((current) => current.includes(groupId)
      ? current.filter((id) => id !== groupId)
      : [...current, groupId]);
  }

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
    const targetSet = sets.find((set) => set.id === setId);
    const previousFolderId = targetSet?.folderId ?? null;
    const targetFolder = folders.find((folder) => folder.id === folderId) ?? null;
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
      if (targetSet) onSetMoved?.(targetSet, targetFolder);
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
      onFolderRenamed?.(result.folder);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось переименовать папку");
    } finally {
      setBusy(null);
    }
  }

  async function deleteFolder(folder: StudyFolder) {
    if (busy || !window.confirm(`Удалить папку «${folder.name}»? Наборы останутся в библиотеке.`)) return;

    const folderSets = sets.filter((set) => set.folderId === folder.id);
    setBusy(`folder:${folder.id}`);
    setError("");
    try {
      const response = await fetch(`/api/folders/${folder.id}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Не удалось удалить папку");
      setFolders((current) => current.filter((item) => item.id !== folder.id));
      setSets((current) => current.map((set) => set.folderId === folder.id ? { ...set, folderId: null } : set));
      setCollapsedGroupIds((current) => current.filter((id) => id !== folder.id));
      onFolderDeleted?.(folder, folderSets);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось удалить папку");
    } finally {
      setBusy(null);
    }
  }

  async function deleteSet() {
    if (!setToDelete || busy) return;

    const target = setToDelete;
    setBusy(`delete:${target.id}`);
    setError("");
    try {
      const response = await fetch(`/api/sets/${target.id}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Не удалось удалить набор");
      setSets((current) => current.filter((set) => set.id !== target.id));
      onSetDeleted?.(target);
      setSetToDelete(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось удалить набор");
      setSetToDelete(null);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={`folder-library-page${embedded ? " embedded" : ""}`}>
      {!embedded && (
        <header className="folder-library-topbar">
          <Link href="/" transitionTypes={["nav-back"]} aria-label="Вернуться на главную"><LibraryIcon name="back" /></Link>
          <div><span className="folder-library-brand">L</span><strong>Lina</strong></div>
          <span />
        </header>
      )}

      <section className="folder-library-shell">
        <div className="folder-library-heading">
          <div><span>Все материалы</span><h1>Библиотека</h1><p>Повторяйте связанные темы вместе: у каждой папки своя очередь.</p></div>
          <form onSubmit={createFolder}>
            <label htmlFor="new-folder">Новая папка</label>
            <div><input id="new-folder" value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} placeholder="Например, Английский B1" maxLength={120}/><button type="submit" disabled={!newFolderName.trim() || busy !== null}><LibraryIcon name="plus" size={18}/> Создать</button></div>
          </form>
        </div>

        {error && <p className="folder-library-error" role="alert">{error}</p>}

        <section className={`folder-review-today${dueCount ? " has-due" : ""}`} aria-labelledby="review-today-title">
          <div className="folder-review-icon"><LibraryIcon name="clock" size={25}/></div>
          <div className="folder-review-copy">
            <span>Повторение сегодня</span>
            <h2 id="review-today-title">{dueCount ? `${dueCount} карточек ждут повторения` : "На сегодня всё готово"}</h2>
            <p>{dueCount ? "Выберите папку: карточки из разных тем не смешиваются." : "Новые карточки появятся здесь по вашему расписанию."}</p>
          </div>
          {dueGroups.length > 0 && (
            <div className="folder-review-queues" aria-label="Очереди повторения по папкам">
              {dueGroups.map((group) => (
                <Link href={group.href} transitionTypes={["nav-forward"]} key={group.key}>
                  <span><strong>{group.title}</strong><small>Отдельная очередь</small></span>
                  <b>{group.dueCount}</b>
                  <LibraryIcon name="arrow" size={17}/>
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="folder-section-heading">
          <div><span>Основные наборы</span><h2>Папки и материалы</h2></div>
          <p>{sets.length} наборов в библиотеке</p>
        </div>

        <div className="folder-groups">
          {folders.map((folder) => {
            const folderSets = setsByFolder.get(folder.id) ?? [];
            const isCollapsed = collapsedGroupIds.includes(folder.id);
            const contentId = `folder-group-content-${folder.id}`;
            return (
              <section className={`folder-group${isCollapsed ? " collapsed" : ""}`} key={folder.id}>
                <header>
                  <button className="folder-group-toggle" type="button" aria-expanded={!isCollapsed} aria-controls={contentId} aria-label={`${isCollapsed ? "Развернуть" : "Свернуть"} папку ${folder.name}`} onClick={() => toggleGroup(folder.id)}>
                    <span className="folder-group-icon"><LibraryIcon name="folder" /></span>
                    <span className="folder-group-copy"><strong>{folder.name}</strong><small>{folderSets.length} наборов</small></span>
                    <span className="folder-group-chevron"><LibraryIcon name="chevron" size={18}/></span>
                  </button>
                  <div className="folder-group-actions">
                    <button type="button" onClick={() => renameFolder(folder)} disabled={busy !== null} aria-label={`Переименовать папку ${folder.name}`}><LibraryIcon name="edit" size={18}/></button>
                    <button type="button" onClick={() => deleteFolder(folder)} disabled={busy !== null} aria-label={`Удалить папку ${folder.name}`}><LibraryIcon name="trash" size={18}/></button>
                  </div>
                </header>
                <div className="folder-set-list" id={contentId} hidden={isCollapsed}>
                  {folderSets.length
                    ? folderSets.map((set) => <SetRow key={set.id} set={set} folders={folders} moving={busy !== null} onMove={moveSet} onDelete={setSetToDelete}/>)
                    : <p className="folder-empty">Пока пусто. Выберите эту папку в меню нужного набора.</p>}
                </div>
              </section>
            );
          })}

          <section className={`folder-group unfiled${collapsedGroupIds.includes(UNFILED_GROUP_ID) ? " collapsed" : ""}`}>
            <header>
              <button className="folder-group-toggle" type="button" aria-expanded={!collapsedGroupIds.includes(UNFILED_GROUP_ID)} aria-controls="folder-group-content-unfiled" aria-label={`${collapsedGroupIds.includes(UNFILED_GROUP_ID) ? "Развернуть" : "Свернуть"} папку Без папки`} onClick={() => toggleGroup(UNFILED_GROUP_ID)}>
                <span className="folder-group-icon"><LibraryIcon name="cards" /></span>
                <span className="folder-group-copy"><strong>Без папки</strong><small>{unfiledSets.length} наборов</small></span>
                <span className="folder-group-chevron"><LibraryIcon name="chevron" size={18}/></span>
              </button>
            </header>
            <div className="folder-set-list" id="folder-group-content-unfiled" hidden={collapsedGroupIds.includes(UNFILED_GROUP_ID)}>
              {unfiledSets.length
                ? unfiledSets.map((set) => <SetRow key={set.id} set={set} folders={folders} moving={busy !== null} onMove={moveSet} onDelete={setSetToDelete}/>)
                : <p className="folder-empty">Все наборы распределены по папкам.</p>}
            </div>
          </section>
        </div>
      </section>
      {setToDelete && (
        <DeleteSetModal
          set={setToDelete}
          pending={busy === `delete:${setToDelete.id}`}
          onClose={() => !busy && setSetToDelete(null)}
          onConfirm={deleteSet}
        />
      )}
    </div>
  );
}
