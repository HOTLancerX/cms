import AuthForm from "@/components/Auth";

export const metadata = { title: "Sign In" };

export default function LoginPage() {
    return <AuthForm mode="login" />;
}
