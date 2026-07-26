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
  assert.match(library, /Карточки со сроком на сегодня собраны в одну дневную очередь/);
  assert.match(library, /return "\/study\/reviews"/);
  assert.match(library, /Без папки/);
  assert.match(library, /role="alertdialog"/);
  assert.match(library, /Действительно удалить «\{set\.title\}»\?/);
  assert.match(library, /folder-review-today/);
  assert.match(library, /className="folder-select-menu"/);
  assert.doesNotMatch(library, /<select/);
  assert.match(css, /\.folder-select-menu \{[^}]*overflow:auto;/);
  assert.match(css, /\.folder-delete-modal \{/);
});

test("changing folder membership does not duplicate a daily reminder", async () => {
  const folders = await read("src/lib/folders.ts");

  assert.doesNotMatch(folders, /reminder_sent_at = NULL/);
  assert.doesNotMatch(folders, /reminder_attempted_at = NULL/);
});
