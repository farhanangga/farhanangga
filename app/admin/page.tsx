import type { Metadata } from "next";
import { LoginView } from "./loginView";

export const metadata: Metadata = { title: "Sign In" };

export default function LoginPage() {
  return <LoginView />;
}