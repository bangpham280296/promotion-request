import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ModifierMatrixContainer from "@/components/(product)/modifier/ModifierMatrixContainer";

export default async function ModifierPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/signin");

  return (
    <div className="p-4 mx-auto max-w-screen-2xl md:p-6">
      <ModifierMatrixContainer />
    </div>
  );
}
