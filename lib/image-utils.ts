/**
 * Converts an image file to WebP format client-side.
 * @param file The original image file (PNG, JPG, etc.)
 * @param quality Quality from 0 to 1 (default 0.8)
 * @returns A promise that resolves to a new File object in WebP format
 */
export async function convertToWebP(file: File, quality: number = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    // If it's already a webp, return it
    if (file.type === 'image/webp') return resolve(file);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Failed to get canvas context'));
        
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Failed to convert image to WebP'));
            
            // Create a new file from the blob
            const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
            const webpFile = new File([blob], newFileName, {
              type: 'image/webp',
              lastModified: Date.now(),
            });
            
            resolve(webpFile);
          },
          'image/webp',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
}
