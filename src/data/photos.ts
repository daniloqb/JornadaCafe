/** Resize before persistence; domain rows only contain the photo UUID. */
export async function preparePhoto(file: File): Promise<Blob> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Escolha uma imagem JPG, PNG ou WebP.');
  if (file.size > 15 * 1024 * 1024) throw new Error('Escolha uma fotografia com até 15 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível preparar a fotografia.');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Não foi possível converter a fotografia.')), 'image/jpeg', .85));
  } catch (error) { throw error instanceof Error ? error : new Error('Não foi possível ler a fotografia.'); }
  finally { URL.revokeObjectURL(url); }
}
