import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import HistoryRequestTable from "@/components/history-request/HistoryRequestTable";

export default async function HistoryRequestPage() {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/signin");

    return <HistoryRequestTable />;
}
