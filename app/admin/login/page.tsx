"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !password) {
      setError("Email və şifrəni daxil edin.");
      return;
    }

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setError("Email və ya şifrə yanlışdır.");
      return;
    }

    window.location.replace("/admin/dashboard");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-200 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-10">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800">
              Smart Restaurant
            </h1>

            <p className="text-gray-500 mt-2">İdarəetmə Paneli</p>
          </div>

          <form onSubmit={handleLogin}>
            {error && (
              <div className="mb-5 rounded-xl bg-red-100 border border-red-300 text-red-700 px-4 py-3">
                {error}
              </div>
            )}

            <div className="mb-5">
              <label className="block mb-2 font-medium text-gray-700">
                Email
              </label>

              <input
                type="email"
                value={email}
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-black"
                placeholder="admin@example.com"
              />
            </div>

            <div className="mb-8">
              <label className="block mb-2 font-medium text-gray-700">
                Şifrə
              </label>

              <input
                type="password"
                value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-black"
                placeholder="********"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-black text-white py-3 font-semibold hover:bg-gray-800 transition disabled:opacity-50"
            >
              {loading ? "Daxil olunur..." : "Daxil ol"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}