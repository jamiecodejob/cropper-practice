// server/api/avatar.post.ts
import { join } from "node:path";
import { promises as fsp } from "node:fs";

export default defineEventHandler(async (event) => {
  // 讀取 multipart
  const form = await readMultipartFormData(event);
  const file = form?.find((f) => f.name === "file");
  if (!file || !file.data) {
    throw createError({ statusCode: 400, statusMessage: "No file" });
  }

  // 確保目錄存在（存到 /public/uploads）
  const uploadsDir = join(process.cwd(), "public", "uploads");
  await fsp.mkdir(uploadsDir, { recursive: true });

  // 檔名：時間戳 + .jpg
  const filename = `avatar_${Date.now()}.jpg`;
  const filepath = join(uploadsDir, filename);

  // 寫入硬碟
  await fsp.writeFile(filepath, file.data);

  // 回傳可被公開存取的 URL（/public 會被當靜態檔）
  const url = `/uploads/${filename}`;
  return { url };
});
