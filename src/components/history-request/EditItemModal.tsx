"use client";

import React from "react";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import MultiSelect from "@/components/form/MultiSelect";
import DatePicker from "@/components/form/date-picker";
import { Modal } from "@/components/ui/modal";
import Radio from "@/components/form/input/Radio";
import ComboDescriptionTable from "./ComboDescriptionTable";
import { useServiceTypes } from "@/hooks/useServiceTypes";

export type FormState = {
    itemcode: string;
    itemname: string;
    description: string;
    servicetype: string[];
    discount: "" | string;
    price: "" | number;
    startdate: string;
    enddate: string;
    notes: string;
};

type Props = {
    isOpen: boolean;
    editingIndex: number | null;
    form: FormState;
    resetKey: number;
    selectedType: string;
    onFormChange: (field: string, value: any) => void;
    onTypeChange: (value: string) => void;
    onComboTotalChange: (total: number) => void;
    onConfirm: () => void;
    onCancel: () => void;
};

const discountOptions = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
];

export default function EditItemModal({
    isOpen,
    editingIndex,
    form,
    resetKey,
    selectedType,
    onFormChange,
    onTypeChange,
    onComboTotalChange,
    onConfirm,
    onCancel,
}: Props) {
    const serviceTypeOptions = useServiceTypes();

    return (
        <Modal isOpen={isOpen} onClose={onCancel} className="max-w-[1100px] max-h-[90vh] flex flex-col p-0">
            {/* Fixed Header */}
            <div className="flex-shrink-0 px-6 lg:px-8 pt-14 pb-4 border-b border-gray-100 dark:border-white/[0.07]">
                <h4 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">
                    {editingIndex !== null ? "Edit Promotion Item" : "Add Promotion Item"}
                </h4>
                <div className="flex flex-row items-center gap-6">
                    <Radio
                        id="hr-item"
                        name="hr-promotionType"
                        value="Item"
                        label="Item"
                        checked={selectedType === "Item"}
                        onChange={onTypeChange}
                    />
                    <Radio
                        id="hr-combo"
                        name="hr-promotionType"
                        value="Combo"
                        label="Combo"
                        checked={selectedType === "Combo"}
                        onChange={onTypeChange}
                    />
                    <Radio
                        id="hr-discount"
                        name="hr-promotionType"
                        value="Discount"
                        label="Discount"
                        checked={selectedType === "Discount"}
                        onChange={onTypeChange}
                    />
                </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto min-h-0 px-6 lg:px-8 py-6">
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                    <div>
                        <Label>Item Code</Label>
                        <Input
                            type="text"
                            placeholder="Enter item code"
                            value={form.itemcode}
                            onChange={(e) => onFormChange("itemcode", e.target.value)}
                        />
                    </div>

                    <div>
                        <Label>Item Name</Label>
                        <Input
                            type="text"
                            placeholder="Enter item name"
                            value={form.itemname}
                            onChange={(e) => onFormChange("itemname", e.target.value)}
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <Label>Description</Label>
                        {selectedType === "Combo" ? (
                            <ComboDescriptionTable
                                key={`combo-${resetKey}-${editingIndex ?? "new"}`}
                                defaultValue={form.description}
                                onChange={(serialized, total) => {
                                    onFormChange("description", serialized);
                                    onComboTotalChange(total);
                                }}
                            />
                        ) : (
                            <Input
                                type="text"
                                placeholder="Enter description"
                                value={form.description}
                                onChange={(e) => onFormChange("description", e.target.value)}
                            />
                        )}
                    </div>

                    <div>
                        <DatePicker
                            key={`hr-startdate-${resetKey}`}
                            id="hr-modal-detail-startdate"
                            label="Start Date"
                            placeholder="Select start date"
                            defaultDate={form.startdate || undefined}
                            onChange={(_dates, dateStr) => onFormChange("startdate", dateStr)}
                        />
                    </div>

                    <div>
                        <DatePicker
                            key={`hr-enddate-${resetKey}`}
                            id="hr-modal-detail-enddate"
                            label="End Date"
                            placeholder="Select end date"
                            defaultDate={form.enddate || undefined}
                            onChange={(_dates, dateStr) => onFormChange("enddate", dateStr)}
                        />
                    </div>

                    <div>
                        <MultiSelect
                            key={`hr-servicetype-${resetKey}-${editingIndex ?? "new"}`}
                            label="Service Type"
                            options={serviceTypeOptions}
                            defaultSelected={form.servicetype}
                            onChange={(vals) => onFormChange("servicetype", vals)}
                        />
                    </div>

                    <div>
                        <Label>Discount</Label>
                        <Select
                            options={discountOptions}
                            placeholder="Select discount"
                            defaultValue={form.discount}
                            onChange={(val) => onFormChange("discount", val)}
                        />
                    </div>

                    <div>
                        <Label>Price</Label>
                        <Input
                            type="number"
                            placeholder="Enter price"
                            min="0"
                            value={form.price === "" ? "" : form.price}
                            onChange={(e) =>
                                onFormChange("price", e.target.value === "" ? "" : Number(e.target.value))
                            }
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <Label>Notes</Label>
                        <Input
                            type="text"
                            placeholder="Additional notes..."
                            value={form.notes}
                            onChange={(e) => onFormChange("notes", e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Fixed Footer */}
            <div className="flex-shrink-0 flex items-center justify-end gap-3 px-6 lg:px-8 py-4 border-t border-gray-100 dark:border-white/[0.07]">
                <Button size="sm" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button size="sm" onClick={onConfirm}>
                    {editingIndex !== null ? "Save" : "Add"}
                </Button>
            </div>
        </Modal>
    );
}
