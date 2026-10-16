import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { db } from "../db/db";

/** Object URL of a file kept on the phone; undefined until it is there (it may still be downloading). */
export function useBlobUrl(path?: string) {
  const blob = useLiveQuery(async () => (path ? (await db.blobs.get(path))?.blob : undefined), [path]);
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) { setUrl(undefined); return; }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}
