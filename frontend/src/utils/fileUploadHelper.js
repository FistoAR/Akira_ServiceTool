/**
 * Helper to compress images on the client side while preserving visual quality.
 * If file is a PDF, validates file size (<= 5MB).
 * If compressed image or PDF exceeds 5MB, throws an error with instructions.
 */
export async function processUploadFile(file) {
  if (!file) return null;

  const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    if (file.size > MAX_BYTES) {
      throw new Error(
        "The uploaded PDF document is too large (exceeds 5MB). Please compress and upload under 5MB."
      );
    }
    // PDF within 5MB
    return {
      file,
      preview: null,
      isPdf: true,
      name: file.name,
      size: file.size,
    };
  }

  // Handle Images (JPEG, PNG, WEBP, etc.)
  const isImage = file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|bmp)$/i.test(file.name);
  if (!isImage) {
    throw new Error("Only images (JPEG, PNG, WEBP) and PDF files are allowed.");
  }

  // If image is already smaller than 1.5MB, keep it directly or lightly optimize
  if (file.size <= MAX_BYTES && file.size < 1.5 * 1024 * 1024) {
    const preview = await readFileAsDataURL(file);
    return {
      file,
      preview,
      isPdf: false,
      name: file.name,
      size: file.size,
    };
  }

  // Compress image using HTML5 Canvas
  try {
    const compressedBlob = await compressImageToTarget(file, MAX_BYTES);
    if (!compressedBlob || compressedBlob.size > MAX_BYTES) {
      throw new Error(
        "The uploaded document is too large and could not be compressed under 5MB. Please compress and upload under 5MB."
      );
    }

    const compressedFile = new File(
      [compressedBlob],
      file.name.replace(/\.[^/.]+$/, "") + ".webp",
      { type: "image/webp" }
    );
    const preview = await readFileAsDataURL(compressedFile);

    return {
      file: compressedFile,
      preview,
      isPdf: false,
      name: compressedFile.name,
      size: compressedFile.size,
    };
  } catch (err) {
    if (err.message && err.message.includes("under 5MB")) {
      throw err;
    }
    // Fallback check on original size
    if (file.size > MAX_BYTES) {
      throw new Error(
        "The uploaded document is too large. Please compress and upload under 5MB."
      );
    }
    const preview = await readFileAsDataURL(file);
    return {
      file,
      preview,
      isPdf: false,
      name: file.name,
      size: file.size,
    };
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function compressImageToTarget(file, maxBytes) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Keep high resolution: max dimension up to 2560px for crystal clear quality
        const MAX_DIM = 2560;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Try high quality webp first (0.88), then fall down if still over maxBytes
        let quality = 0.88;

        const attemptCompression = (q) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return reject(new Error("Image compression failed"));
              }
              if (blob.size <= maxBytes || q <= 0.5) {
                return resolve(blob);
              }
              // Step down quality slightly without losing clarity
              attemptCompression(Math.max(0.5, q - 0.12));
            },
            "image/webp",
            q
          );
        };

        attemptCompression(quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

