import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión · Vital360" };

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bienvenido de vuelta</CardTitle>
        <CardDescription>
          Entra para seguir tu plan de nutrición y entrenos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
