
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export async function loadRandomMap(room: any): Promise<string> {
  const mapsDirectory = path.join(process.cwd(), "maps");

  const mapFiles = (await readdir(mapsDirectory)).filter((file) =>
    file.toLowerCase().endsWith(".hbs")
  );

  if (mapFiles.length === 0) {
    throw new Error("Không tìm thấy file map .hbs trong thư mục maps.");
  }

  const selectedFile =
    mapFiles[Math.floor(Math.random() * mapFiles.length)];
  if (!selectedFile) {
    throw new Error("Không thể chọn map.");
  }

  const mapContents = await readFile(
    path.join(mapsDirectory, selectedFile),
    "utf8"
  );

  // Kiểm tra nội dung có phải JSON hợp lệ không.
  JSON.parse(mapContents);

  // Nạp map custom vào phòng.
  room.setCustomStadium(mapContents);

  console.log(`[MAP] Đã chọn map: ${selectedFile}`);
  return selectedFile;
}
