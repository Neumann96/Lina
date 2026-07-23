import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("supports creating, renaming, deleting and assigning folders", async () => {
  const [folders, folderRoute, setFolderRoute, library] = await Promise.all([
    read("src/lib/folders.ts"),
    read("src/app/api/folders/[folderId]/route.ts"),
    read("src/app/api/sets/[setId]/folder/route.ts"),
    read("src/components/folder-library.tsx"),
  ]);

  assert.match(folders, /createStudyFolder/);
  assert.match(folders, /renameStudyFolder/);
  assert.match(folders, /deleteStudyFolder/);
  assert.match(folders, /moveStudySetToFolder/);
  assert.match(folderRoute, /export async function PATCH/);
  assert.match(folderRoute, /export async function DELETE/);
  assert.match(setFolderRoute, /folderId/);
  assert.match(library, /Карточки со сроком на сегодня собраны в одну дневную очередь/);
  assert.match(library, /return "\/study\/reviews"/);
  assert.match(library, /Без папки/);
});

test("changing folder membership does not duplicate a daily reminder", async () => {
  const folders = await read("src/lib/folders.ts");

  assert.doesNotMatch(folders, /reminder_sent_at = NULL/);
  assert.doesNotMatch(folders, /reminder_attempted_at = NULL/);
});
