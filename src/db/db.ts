// Local, offline-first copy of every trip (IndexedDB). localStorage is never used for data.
import Dexie, { type EntityTable } from "dexie";
import type { Booking, Check, Day, LogEntry, Place, PrepSection, Source, Trip } from "../model/types";
import type { FieldTs } from "../sync/merge";
import type { Data, Kind } from "../sync/records";

type WithTrip<T> = T & { tripId: string };

export interface Setting {
  key: string;
  value: unknown;
}

/** Sync bookkeeping per record: last known local copy, field timestamps, server base and unsent fields. */
export interface SyncMeta {
  key: string; // `${tripId}|${kind}:${id}`
  tripId: string;
  kind: Kind;
  id: string;
  shadow: Data;
  ts: FieldTs;
  base: FieldTs;
  dirty: string[];
}

export interface SyncState {
  tripId: string;
  lastRev: number;
  clock: number;
  lastSync?: string;
  error?: string;
}

export interface Conflict {
  id: string;
  tripId: string;
  recordId: string;
  title: string;
  at: string;
  fields: { field: string; mine: unknown; theirs: unknown; kept: "mine" | "theirs" }[];
  dismissed?: boolean;
}

export class TravelDB extends Dexie {
  trips!: EntityTable<Trip, "id">;
  places!: EntityTable<WithTrip<Place>, "id">;
  bookings!: EntityTable<WithTrip<Booking> & { order: number }, "id">;
  days!: Dexie.Table<WithTrip<Day>, [string, string]>;
  sources!: EntityTable<WithTrip<Source>, "id">;
  checks!: EntityTable<WithTrip<Check> & { order: number }, "id">;
  prep!: EntityTable<WithTrip<PrepSection> & { order: number }, "id">;
  log!: EntityTable<WithTrip<LogEntry>, "id">;
  settings!: EntityTable<Setting, "key">;
  syncMeta!: EntityTable<SyncMeta, "key">;
  syncState!: EntityTable<SyncState, "tripId">;
  conflicts!: EntityTable<Conflict, "id">;

  constructor(name = "travel-guide") {
    super(name);
    this.version(1).stores({
      trips: "id",
      places: "id, tripId",
      bookings: "id, tripId",
      days: "[tripId+date], tripId",
      sources: "id, tripId",
      checks: "id, tripId",
      prep: "id, tripId",
      log: "id, tripId, at",
      settings: "key",
    });
    this.version(2).stores({
      syncMeta: "key, tripId",
      syncState: "tripId",
      conflicts: "id, tripId",
    });
  }
}

export const db = new TravelDB();
