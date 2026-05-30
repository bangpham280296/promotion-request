"use client";

import RequestInputs from "@/components/form/form-request/request";
import RequestDetailTable from "@/components/form/form-request/requestdetail";
import { useState } from "react";
import useRequest from "@/hooks/useRequest";
import useProfile from "@/hooks/useProfile";
import Protected from "@/components/auth/ProtectPage";
import { toast } from "sonner";
import Button from "@/components/ui/button/Button";


export default function RequestForm() {
    const { profile } = useProfile();
    const { addRequest } = useRequest();

    const [loading, setLoading] = useState(false);

    const [req, setReq] = useState<any>({
        promotionname: "",
        requester: profile?.fullname || "",
        department: "",
        startdate: "",
        enddate: "",
    });

    const [details, setDetails] = useState<any[]>([]);

    const handleSubmit = async () => {
        if (loading) return;

        try {
            setLoading(true);

            // validate
            if (!req.promotionname) {
                toast.error("Please enter promotion name");
                return;
            }
            if (!req.startdate) {
                toast.error("Please select start date");
                return;
            }
            if (!req.enddate) {
                toast.error("Please select end date");
                return;
            }
            if (details.length === 0) {
                toast.error("Please add at least one item");
                return;
            }

            // map detail UI → DB
            const mappedDetails = details.map((d) => ({
                itemcode: d.itemcode,
                itemname: d.itemname,
                description: d.description,
                discount: d.discount ?? null,
                price: d.price ?? null,
                startdate: d.startdate || null,
                enddate: d.enddate || null,
                servicetype: d.servicetype || null,
                notes: d.notes || null,
                itemtype: d.itemtype || null,
            }));

            // map request → DB
            const mappedReq = {
                promotionname: req.promotionname,
                startdate: req.startdate,
                enddate: req.enddate,
                createdate: new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).replace(" ", "T") + "+07:00",
                department: profile.department.id,
                requester: profile.user_id,
                stt: 1,
            };

            // CALL SUPABASE
            await addRequest(mappedReq, mappedDetails);
            toast.success("Request submitted successfully!");


            // reset form
            setReq({
                promotionname: "",
                requester: "",
                department: "",
                startdate: "",
                enddate: "",
            });
            setDetails([]);

        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Protected>
            <div>
                <RequestInputs value={req} onChange={setReq} />
                <RequestDetailTable value={details} onChange={setDetails} />

                <div className="flex justify-center mt-5">
                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
                    >
                        {loading ? "Submitting..." : "Submit"}
                    </Button>
                </div>
            </div>
        </Protected>
    );
}