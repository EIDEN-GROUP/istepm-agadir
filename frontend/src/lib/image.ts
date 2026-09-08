/**
 * Réduit une image à un carré `taille`×`taille` (recadrage centré) et la renvoie
 * en data URL **WebP** (repli JPEG si le navigateur ne sait pas encoder le WebP).
 * WebP divise ~par deux le poids par rapport au JPEG (~15–40 Ko), ce qui garde
 * la photo d'identité bien en-dessous des limites d'envoi et de stockage.
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
      // `toDataURL` renvoie du PNG si le type demandé n'est pas supporté :
      // on ne garde le WebP que s'il a réellement été produit.
      const webp = canvas.toDataURL("image/webp", 0.8);
      resolve(
        webp.startsWith("data:image/webp")
          ? webp
          : canvas.toDataURL("image/jpeg", 0.85),
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode"));
    };
    img.src = url;
  });
}
