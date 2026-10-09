import { v4, v5 } from "uuid";

// Fixed namespace so imported records always get the same UUID from the same prototype key.
const IMPORT_NS = "3b8f6a4e-2f1c-4c55-9a5e-6d0f3c9b7a21";

export const importId = (trip: string, kind: string, key: string) => v5(`${trip}:${kind}:${key}`, IMPORT_NS);
export const newId = () => v4();
