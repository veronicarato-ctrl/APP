// Local, offline-first copy of every trip (IndexedDB). localStorage is never used for data.
import Dexie, { type EntityTable } from "dexie";
import type { Booking, Check, Day, LogEntry, Place, PrepSection, Source, Trip } from "../model/types";

type WithTrip<T> = T & { tripId: string };

export interface Setting {
  key: string;
  value: unknown;
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
  }
}

export const db = new TravelDB();
