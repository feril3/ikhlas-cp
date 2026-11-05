// Foto dari kamera ponsel sering 3–8 MB, sedangkan batas unggah 4 MB per berkas (4,4 MB per pengajuan).
// Foto diperkecil ke sisi terpanjang 1600px dan disimpan sebagai JPEG sebelum diunggah.
// Format lain yang bisa dibuka peramban (misalnya HEIC di Safari) ikut diubah ke JPEG.
const MAX_SIDE = 1600;
const QUALITY = 0.82;
const KEEP_AS_IS = 900 * 1024;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Foto tidak bisa dibaca.')); };
    image.src = url;
  });
}

export async function prepareUpload(file) {
  if (!file || !file.type.startsWith('image/')) return file;
  const accepted = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
  if (accepted && file.size <= KEEP_AS_IS) return file;

  const image = await loadImage(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.round(image.naturalWidth * scale);
  const height = Math.round(image.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(image, 0, 0, width, height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
  if (!blob) return file;
  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
}

export function formatFileSize(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1).replace('.', ',') + ' MB';
  return Math.max(1, Math.round(bytes / 1024)) + ' KB';
}
