"use server";

import { signIn } from "@/auth";

export async function loginWithGitHub() {
  await signIn("github", {
    redirectTo: "/dashboard",
  });
}
