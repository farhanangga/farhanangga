export type Account = {
  username: string;
  password: string;
  name: string;
  role: "admin" | "user";
};

export const SESSION_COOKIE = "session";

/** Data akun statis. Ganti sesuai kebutuhan. */
export const ACCOUNTS: Account[] = [
  { username: "farhanangga", password: "riversone8911", name: "Farhan Angga Riyanto", role: "admin" },
];

export function findAccount(username: string, password: string): Account | null {
  const u = username.trim().toLowerCase();
  return ACCOUNTS.find((a) => a.username.toLowerCase() === u && a.password === password) ?? null;
}