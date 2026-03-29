import fs from "fs/promises";
import path from "path";
import { StaticRoot } from "../config/Env";

// Racine physique dédiée au stockage fonctionnel de la plateforme.
export const STOCKAGE_UTILISATEURS_ROOT = path.join(StaticRoot, "stockage-utilisateurs");

export function sanitizeSegment(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._ -]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export function getUserStorageRoot(userId: string) {
  return path.join(STOCKAGE_UTILISATEURS_ROOT, userId);
}

export function resolveFolderAbsolutePath(userId: string, relativeFolderPath?: string | null) {
  return relativeFolderPath
    ? path.join(getUserStorageRoot(userId), relativeFolderPath)
    : getUserStorageRoot(userId);
}

export async function ensureDirectoryExists(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function ensureUserStorageRoot(userId: string) {
  await ensureDirectoryExists(getUserStorageRoot(userId));
}

export function createFolderRelativePath(parentRelativePath: string | null | undefined, folderId: string) {
  return parentRelativePath ? path.join(parentRelativePath, folderId) : folderId;
}

export function createStoredFileName(originalName: string) {
  const extension = path.extname(originalName);
  const baseName = sanitizeSegment(path.basename(originalName, extension)) || "fichier";
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}-${baseName}${extension}`;
}

export async function deleteFileIfExists(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== "ENOENT") throw error;
  }
}

export async function deleteDirectoryIfExists(dirPath: string) {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== "ENOENT") throw error;
  }
}
