"use client"

import { loginWithGitHub } from "@/actions/github-login"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Github, Loader2 } from "lucide-react"
import { useTransition } from "react"

export default function LoginPage() {
  const [isPending, startTransition] = useTransition()

  const handleGitHubSignIn = () => {
    startTransition(() => {
      loginWithGitHub()
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Cell Track</CardTitle>
          <CardDescription className="text-center">
            Cell Track は基地局情報から位置情報を追跡するプライベートサービスです。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGitHubSignIn} disabled={isPending} className="w-full" size="lg">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Github className="mr-2 h-4 w-4" />}
            {isPending ? "Signing in..." : "GitHubでサインイン"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
