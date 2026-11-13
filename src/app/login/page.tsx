import { LoginForm } from "@/components/login-form";
import { isAuthConfigured, parseServerEnv } from "@/lib/env";

export default function LoginPage() {
  const configured = isAuthConfigured(parseServerEnv(process.env));
  return <LoginForm configured={configured} />;
}
