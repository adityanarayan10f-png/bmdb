"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setMessage("Logging in...");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Login successful!");
  }

  return (
    <main className="min-h-screen bg-[#070b14] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-[#0d1320] p-8">
        <h1 className="text-3xl font-bold text-center">
          BMDB
        </h1>

        <p className="mt-2 text-center text-gray-400">
          Sign in to rate Bhojpuri movies
        </p>

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <div>
            <label className="text-sm text-gray-400">
              Email
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-700 bg-[#070b14] px-4 py-3 text-white outline-none focus:border-yellow-400"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400">
              Password
            </label>

            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-700 bg-[#070b14] px-4 py-3 text-white outline-none focus:border-yellow-400"
              placeholder="Your password"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-yellow-400 px-4 py-3 font-semibold text-black transition hover:bg-yellow-300"
          >
            Sign In
          </button>
        </form>

        {message && (
          <p className="mt-5 text-center text-sm text-gray-300">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}