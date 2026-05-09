// Lightweight offline trip cache backed by IndexedDB (no external deps).

const DB_NAME = "roavr-offline";
const STORE = "trips";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest) {
  const db = await open();
  return new Promise<any>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveTripOffline(tripId: string, data: any) {
  return withStore("readwrite", (s) => s.put({ ...data, _savedAt: Date.now() }, tripId));
}

export async function isTripOffline(tripId: string): Promise<boolean> {
  try {
    const v = await withStore("readonly", (s) => s.get(tripId));
    return !!v;
  } catch {
    return false;
  }
}

export async function getOfflineTrip(tripId: string) {
  return withStore("readonly", (s) => s.get(tripId));
}

export async function removeTripOffline(tripId: string) {
  return withStore("readwrite", (s) => s.delete(tripId));
}
