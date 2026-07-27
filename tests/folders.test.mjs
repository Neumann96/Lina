import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("supports creating, renaming, deleting and assigning folders", async () => {
  const [folders, folderRoute, setFolderRoute, setRoute, learning, library, css] = await Promise.all([
    read("src/lib/folders.ts"),
    read("src/app/api/folders/[folderId]/route.ts"),
    read("src/app/api/sets/[setId]/folder/route.ts"),
    read("src/app/api/sets/[setId]/route.ts"),
    read("src/lib/learning.ts"),
    read("src/components/folder-library.tsx"),
    read("src/app/folders.css"),
  ]);

  assert.match(folders, /createStudyFolder/);
  assert.match(folders, /renameStudyFolder/);
  assert.match(folders, /deleteStudyFolder/);
  assert.match(folders, /moveStudySetToFolder/);
  assert.match(folderRoute, /export async function PATCH/);
  assert.match(folderRoute, /export async function DELETE/);
  assert.match(setFolderRoute, /folderId/);
  assert.match(setRoute, /export async function DELETE/);
  assert.match(setRoute, /deleteStudySet\(user\.id, setId\)/);
  assert.match(learning, /DELETE FROM study_sets[\s\S]+WHERE id = \$1 AND user_id = \$2/);
  assert.match(library, /у каждой папки своя очередь/);
  assert.match(library, /`\/app\/reviews\/folder\/\$\{folderId\}`/);
  assert.match(library, /"\/app\/reviews\/unfiled\/all"/);
  assert.match(library, /unfiledSets\.reduce\(\(sum, set\) => sum \+ set\.dueCount, 0\)/);
  assert.match(library, /key: "unfiled:all", title: "Без папки"/);
  assert.match(library, /карточки из разных тем не смешиваются/);
  assert.match(library, /Без папки/);
  assert.match(library, /role="alertdialog"/);
  assert.match(library, /Действительно удалить «\{set\.title\}»\?/);
  assert.match(library, /folder-review-today/);
  assert.match(library, /folder-review-queues/);
  assert.match(library, /className="folder-select-menu"/);
  assert.doesNotMatch(library, /<select/);
  assert.match(library, /embedded = false/);
  assert.match(library, /folder-library-page\$\{embedded \? " embedded" : ""\}/);
  assert.match(library, /COLLAPSED_FOLDERS_STORAGE_KEY/);
  assert.match(library, /aria-expanded=\{!isCollapsed\}/);
  assert.match(library, /hidden=\{isCollapsed\}/);
  assert.match(library, /toggleGroup\(UNFILED_GROUP_ID\)/);
  assert.match(css, /\.folder-library-page\.embedded \{ min-height:0; background:transparent; \}/);
  assert.match(css, /\.folder-group\.collapsed \.folder-group-chevron \{ transform:rotate\(-90deg\); \}/);
  assert.match(css, /\.folder-set-list\[hidden\] \{ display:none; \}/);
  assert.match(css, /\.folder-select-menu \{[^}]*overflow:auto;/);
  assert.match(css, /\.folder-delete-modal \{/);
});

test("changing folder membership does not duplicate a daily reminder", async () => {
  const folders = await read("src/lib/folders.ts");

  assert.doesNotMatch(folders, /reminder_sent_at = NULL/);
  assert.doesNotMatch(folders, /reminder_attempted_at = NULL/);
});
