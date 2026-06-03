import AuthForm from "@/components/Auth";

export const metadata = { title: "Create Account" };

export default function SignupPage() {
    return <AuthForm mode="signup" />;
}
