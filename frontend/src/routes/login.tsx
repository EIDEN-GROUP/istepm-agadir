import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await login(email, password);
    setBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#28396C] to-[#1a264f] p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="mb-6 text-center font-display text-2xl font-bold text-foreground">
          School CRM
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-[#28396C]"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-[#28396C]"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-[#28396C] py-2.5 text-sm font-semibold text-white hover:bg-[#1f2d55] disabled:opacity-50"
          >
            {busy ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/login")({ component: LoginPage });
