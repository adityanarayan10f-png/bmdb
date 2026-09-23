"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();

    setMessage("Creating account...");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      "Account created! Please check your email to confirm your account."
    );
  }

  return (
    <main className="min-h-screen bg-[#070b14] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-[#0d1320] p-8">
        <h1 className="text-3xl font-bold text-center">
          Create BMDB Account
        </h1>

        <p className="mt-2 text-center text-gray-400">
          Create an account to rate Bhojpuri movies
        </p>

        <form onSubmit={handleSignup} className="mt-8 space-y-5">
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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-700 bg-[#070b14] px-4 py-3 text-white outline-none focus:border-yellow-400"
              placeholder="At least 6 characters"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-yellow-400 px-4 py-3 font-semibold text-black transition hover:bg-yellow-300"
          >
            Create Account
          </button>
        </form>

        {message && (
          <p className="mt-5 text-center text-sm text-gray-300">
            {message}
          </p>
        )}

        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{" "}
          <a
            href="/auth/login"
            className="text-yellow-400 hover:text-yellow-300"
          >
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}
