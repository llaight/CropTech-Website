import AuthForm from "../../components/AuthForm";
import AuthCard from "../../components/AuthCard";

export default function SignupPage() {
  return (
    <AuthCard>
      <AuthForm mode="signup" />
    </AuthCard>
  );
}
