"use client";

import RequestInputs from "@/components/form/form-request/request";
import RequestDetailTable from "@/components/form/form-request/requestdetail";
import SubmitSuccessModal from "@/components/form/form-request/SubmitSuccessModal";
import { useState } from "react";
import useRequest from "@/hooks/useRequest";
import useProfile from "@/hooks/useProfile";
import Protected from "@/components/auth/ProtectPage";
import { toast } from "sonner";
import Button from "@/components/ui/button/Button";
import { useRouter } from "next/navigation";
import { useModal } from "@/hooks/useModal";

const emptyReq = {
    promotionname: "",
    requester: "",
    department: "",
    startdate: "",
    enddate: "",
};

export default function RequestForm() {
    const { profile } = useProfile();
    const { addRequest } = useRequest();
    const router = useRouter();
    const { isOpen: isSuccessOpen, openModal: openSuccess, closeModal: closeSuccess } = useModal();

    const [loading, setLoading] = useState(false);
    const [req, setReq] = useState<any>({ ...emptyReq });
    const [details, setDetails] = useState<any[]>([]);
    const [submittedInfo, setSubmittedInfo] = useState({ requestcode: "", promotionname: "" });
    const [codeRefreshKey, setCodeRefreshKey] = useState(0);

    const resetForm = () => {
        setReq({ ...emptyReq });
        setDetails([]);
        setCodeRefreshKey((k) => k + 1);
    };

    const handleSubmit = async () => {
        if (loading) return;

        try {
            setLoading(true);

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
                metadata: d.itemtype === "discount" && d.metadata ? d.metadata : undefined,
            }));

            const mappedReq = {
                promotionname: req.promotionname,
                startdate: req.startdate,
                enddate: req.enddate,
                createdate: new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).replace(" ", "T") + "+07:00",
                department: profile.department.id,
                requester: profile.user_id,
                stt: 1,
            };

            const result = await addRequest(mappedReq, mappedDetails);

            setSubmittedInfo({
                requestcode: result.requestcode ?? "",
                promotionname: req.promotionname,
            });
            openSuccess();

        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNew = () => {
        closeSuccess();
        resetForm();
    };

    const handleViewHistory = () => {
        closeSuccess();
        router.push("/history-request");
    };

    return (
        <Protected>
            <div>
                <RequestInputs value={req} onChange={setReq} refreshTrigger={codeRefreshKey} />
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

            <SubmitSuccessModal
                isOpen={isSuccessOpen}
                requestcode={submittedInfo.requestcode}
                promotionname={submittedInfo.promotionname}
                onCreateNew={handleCreateNew}
                onViewHistory={handleViewHistory}
            />
        </Protected>
    );
}