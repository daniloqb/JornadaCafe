/** File extensions and declared MIME types are hints; the bytes and decoder decide. */
export function photoType(bytes: Uint8Array) {
  if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes[bytes.length - 2] === 255 && bytes[bytes.length - 1] === 217) return { ext: 'jpg', mime: 'image/jpeg' };
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length >= 45 && signature.every((n, i) => bytes[i] === n)) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 8, imageData = false;
    while (offset + 12 <= bytes.length) {
      const size = view.getUint32(offset), kind = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
      if (offset + size + 12 > bytes.length) break;
      if (offset === 8 && (kind !== 'IHDR' || size !== 13 || !view.getUint32(offset + 8) || !view.getUint32(offset + 12) || view.getUint32(offset + 8) * view.getUint32(offset + 12) > 40_000_000)) break;
      if (kind === 'IDAT') imageData = true;
      if (kind === 'IEND' && size === 0 && imageData && offset + 12 === bytes.length) return { ext: 'png', mime: 'image/png' };
      offset += size + 12;
    }
  }
  if (bytes.length >= 20 && String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP' && new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, true) + 8 === bytes.length) return { ext: 'webp', mime: 'image/webp' };
  throw new Error('Uma fotografia possui formato inválido ou está incompleta.');
}

export async function validatePhoto(blob: Blob) {
  if (!blob.size || blob.size > 15 * 1024 * 1024) throw new Error('Escolha uma fotografia com até 15 MB.');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const type = photoType(bytes);
  if (typeof Image !== 'undefined') {
    const url = URL.createObjectURL(new Blob([bytes.buffer], { type: type.mime }));
    try {
      const image = new Image(); image.src = url; await image.decode();
      if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 40_000_000) throw new Error('Dimensões da fotografia excedem o limite.');
    } catch { throw new Error('Não foi possível decodificar a fotografia. Escolha uma imagem válida de até 40 megapixels.'); }
    finally { URL.revokeObjectURL(url); }
  }
  return { bytes, ...type };
}
