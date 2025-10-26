import AuthForm from "../../components/AuthForm";
import AuthCard from "../../components/AuthCard";

export default function LoginPage() {
  return (
    <AuthCard>
      <AuthForm mode="login" />
    </AuthCard>
  );
}
