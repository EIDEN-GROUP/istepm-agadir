/**
 * Réduit une image à un carré `taille`×`taille` (recadrage centré) et la renvoie
 * en data URL JPEG. Garde l'envoi léger (~40–90 Ko) quelle que soit la
 * résolution source — utilisé pour les photos d'identité étudiant.
 */
export function downscaleImage(file: File, taille = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const cote = Math.min(img.naturalWidth, img.naturalHeight);
      if (!cote) return reject(new Error("empty"));
      const canvas = document.createElement("canvas");
      canvas.width = taille;
      canvas.height = taille;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no-2d"));
      ctx.drawImage(
        img,
        (img.naturalWidth - cote) / 2,
        (img.naturalHeight - cote) / 2,
        cote,
        cote,
        0,
        0,
        taille,
        taille,
      );
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode"));
    };
    img.src = url;
  });
}
