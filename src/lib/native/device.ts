/**
 * Device capability discovery point.
 *
 * Photos / camera / geolocation stay in their feature-owned modules; this file
 * re-exports them so `@/lib/native` is the single place to look — there are no
 * duplicate abstractions and no `Capacitor.isNativePlatform()` checks in UI.
 *
 *  - Build My World library scan -> pickNativePhotos / nativePhotoLibrarySource
 *  - Capture (new photo)         -> takePhoto
 *  - Capture (existing media)    -> chooseFromLibrary
 *  - Current location            -> getCurrentLocation
 */
export {
  MEDIA_SOURCES,
  browserFileSource,
  demoSource,
  nativePhotoLibrarySource,
  pickNativeMedia,
  filesToMediaItems,
} from "@/lib/buildworld/mediaSource";

export {
  pickNativePhotos,
  ensureNativePhotoAccess,
  expandLimitedSelection,
  isNativePhotoLibraryAvailable,
} from "./photos";

export {
  takePhoto,
  chooseFromLibrary,
  ensureNativeCameraAccess,
  isNativeCameraAvailable,
  NATIVE_VIDEO_CAPTURE_SUPPORTED,
} from "./camera";

export { getCurrentLocation, ensureLocationAccess } from "./location";
export { PERMISSION_COPY, isUsable } from "./permissionCopy";

export {
  ensureLocationPermission,
  ensureCameraPermission,
  ensurePhotoPermission,
} from "@/lib/permissions";
