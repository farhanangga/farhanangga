import type { Metadata } from "next";
import { LoginView } from "./loginView";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return <LoginView />;
}