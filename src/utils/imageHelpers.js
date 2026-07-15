/**
 * Resizes a base64 image data URL using HTML5 Canvas.
 * Useful for keeping thumbnail previews within localStorage/Firestore size limits.
 *
 * @param {string} base64Str - The original data URL
 * @param {number} maxWidth - Max width in pixels
 * @param {number} maxHeight - Max height in pixels
 * @returns {Promise<string>} The resized JPEG data URL
 */
export function resizeImage(base64Str, maxWidth = 300, maxHeight = 300) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
}
