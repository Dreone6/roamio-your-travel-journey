/**
 * Photos / camera / geolocation are already abstracted elsewhere in Roavr.
 * This module re-exports those existing seams so `@/lib/native` is the single
 * discovery point for device capabilities — no duplicate abstractions.
 *
 * Native swap-in points:
 *  - photos      -> nativePhotoLibrarySource (@capacitor/camera pickImages)
 *  - camera      -> CameraPage getUserMedia capture (@capacitor/camera)
 *  - geolocation -> ensureLocationPermission (@capacitor/geolocation)
 */
export {
  MEDIA_SOURCES,
  browserFileSource,
  demoSource,
  nativePhotoLibrarySource,
  filesToMediaItems,
} from "@/lib/buildworld/mediaSource";

export { ensureLocationPermission, ensurePhotoPermission } from "@/lib/permissions";
