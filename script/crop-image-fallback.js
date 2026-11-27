export const CROP_IMAGE_FALLBACK =
  "/Images/Vegetables/coming%20soon/coming%20soon%20image.png";

export function attachImageFallback(image, onFallbackFailure) {
  image.addEventListener("error", () => {
    if (image.dataset.fallbackApplied !== "true") {
      image.dataset.fallbackApplied = "true";
      image.src = CROP_IMAGE_FALLBACK;
      return;
    }

    image.hidden = true;
    onFallbackFailure?.();
  });
}

export function showImageFallback(image) {
  image.dataset.fallbackApplied = "true";
  image.src = CROP_IMAGE_FALLBACK;
}
