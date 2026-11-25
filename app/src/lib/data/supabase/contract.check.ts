// Compile-time contract: every data function the UI imports exists in BOTH sources with the mock's exact type.
// Not imported at runtime. Adding a function to the UI means adding it here and to supabase/repo.ts.
import type * as Mock from "../repo";
import type * as Supabase from "./repo";

type Contract =
  | "login" | "logout" | "hasSession" | "lastEmail" | "getProfile" | "peekProfile" | "peekCatalog" | "loadCatalog" | "loadFilterCatalog" | "updateDisplayName" | "changePassword" | "passwordRules"
  | "listPackages" | "savePackage" | "archivePackage" | "restorePackage" | "listCrew" | "listPeople"
  | "listBookings" | "listAllBookings" | "countBookings" | "getBooking" | "getKpis" | "getUpcoming" | "getCrewSchedule" | "getInvoiceSnapshot"
  | "saveBooking" | "createInvoice" | "saveBookingAndCreateInvoice" | "cancelBooking" | "nextInvoiceTypes"
  | "getSettings" | "getBusiness" | "updateBusiness" | "NetworkError";

type M = typeof Mock;
type S = typeof Supabase;
type MissingInMock = Exclude<Contract, keyof M>;
type MissingInSupabase = Exclude<Contract, keyof S>;
type Mismatched = { [K in Contract & keyof M & keyof S]: S[K] extends M[K] ? never : K }[Contract & keyof M & keyof S];

export const contractHolds: [MissingInMock, MissingInSupabase, Mismatched] extends [never, never, never] ? true : never = true;
