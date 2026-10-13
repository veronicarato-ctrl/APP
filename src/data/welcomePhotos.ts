// Photos shown on the welcome screen to give the urge to travel. Each one must name the place it really shows,
// its author and a licence that allows the commercial use planned in phase 8 (SPEC section 16).
// The files live in public/photos/ so they are precached and the welcome screen also works offline.

export interface WelcomePhoto {
  /** Path under public/, e.g. "photos/lisbon.jpg". */
  src: string;
  place: string;
  country: string;
  author: string;
  licence: string;
  /** Page where the photo and its licence can be checked. */
  sourceUrl: string;
}

/** Empty until photos with a verified licence are supplied; the welcome screen then shows the trip colours. */
export const WELCOME_PHOTOS: WelcomePhoto[] = [];
