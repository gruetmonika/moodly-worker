import sharp from "sharp";

// Kolaż 9:16 — siatka 3×3
// Każda komórka: 360×640px → całość: 1080×1920px

const CELL_W = 360;
const CELL_H = 640;
const COLS   = 3;
const ROWS   = 3;
const TOTAL_W = CELL_W * COLS; // 1080
const TOTAL_H = CELL_H * ROWS; // 1920

export async function createCollage(imageBuffers: Buffer[]): Promise<Buffer> {
  if (imageBuffers.length !== 9) {
    throw new Error(`Oczekiwano 9 zdjęć, otrzymano ${imageBuffers.length}`);
  }

  // Zmień rozmiar każdego zdjęcia do rozmiaru komórki
  const resized = await Promise.all(
    imageBuffers.map((buf) =>
      sharp(buf)
        .resize(CELL_W, CELL_H, { fit: "cover", position: "top" })
        .jpeg({ quality: 88 })
        .toBuffer()
    )
  );

  // Oblicz pozycje w siatce
  const composites = resized.map((input, i) => ({
    input,
    left: (i % COLS) * CELL_W,
    top:  Math.floor(i / COLS) * CELL_H,
  }));

  // Stwórz czarne canvas i nałóż zdjęcia
  return sharp({
    create: {
      width:      TOTAL_W,
      height:     TOTAL_H,
      channels:   3,
      background: { r: 10, g: 10, b: 10 },
    },
  })
    .composite(composites)
    .jpeg({ quality: 90 })
    .toBuffer();
}
