import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "SignUp Page | Promotions Request Management System",
  description: "This is Next.js SignUp Page Promotions Request Management System",
  // other metadata
};

export default function SignUp() {
  return <SignUpForm />;
}
