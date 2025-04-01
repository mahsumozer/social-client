export const resizeImage = async (file: File, maxWidth: number, maxHeight: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      // En-boy oranını koru
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
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context oluşturulamadı'));
        return;
      }
      
      // Resmi çiz
      ctx.drawImage(img, 0, 0, width, height);
      
      // Blob olarak dönüştür
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Resim dönüştürülemedi'));
          }
        },
        'image/jpeg',
        0.9
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Resim yüklenemedi'));
    };
  });
}; 