"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import { EyeIcon, EyeCloseIcon } from "@/icons";
import { toast } from "sonner";

export interface DepartmentOption {
    id: number;
    deptcode: string;
    deptname: string;
}

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    departments: DepartmentOption[];
    onSuccess: () => void;
}

export default function CreateUserModal({
    isOpen,
    onClose,
    departments,
    onSuccess,
}: CreateUserModalProps) {
    const [fullname, setFullname] = useState("");
    const [employeecode, setEmployeecode] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [departmentId, setDepartmentId] = useState<string>("");
    const [role, setRole] = useState<string>("user");
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const resetForm = () => {
        setFullname("");
        setEmployeecode("");
        setEmail("");
        setPassword("");
        setDepartmentId("");
        setRole("user");
        setShowPassword(false);
    };

    const handleClose = () => {
        if (!submitting) {
            resetForm();
            onClose();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Client validation
        if (!fullname.trim()) {
            toast.error("Please enter full name.");
            return;
        }
        if (!employeecode.trim()) {
            toast.error("Please enter employee code.");
            return;
        }
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            toast.error("Please enter a valid email address.");
            return;
        }
        if (!password || password.length < 6) {
            toast.error("Password must be at least 6 characters.");
            return;
        }
        if (!departmentId) {
            toast.error("Please select a department.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/auth/create-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fullname: fullname.trim(),
                    employeecode: employeecode.trim(),
                    email: email.trim().toLowerCase(),
                    password,
                    department_id: Number(departmentId),
                    role,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "Failed to create user account.");
                return;
            }

            toast.success(`Successfully created user account for ${fullname}!`);
            resetForm();
            onSuccess();
            onClose();
        } catch {
            toast.error("Server connection error. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const departmentSelectOptions = departments.map((d) => ({
        value: String(d.id),
        label: `${d.deptname} (${d.deptcode})`,
    }));

    const roleOptions = [
        { value: "user", label: "User" },
        { value: "admin", label: "Admin" },
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            className="max-w-[580px] p-6 lg:p-8"
        >
            <div>
                {/* Header */}
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                        Add New Member
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Provision a login account and employee profile in the system.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {/* Full Name */}
                        <div>
                            <Label htmlFor="fullname">Full Name *</Label>
                            <Input
                                id="fullname"
                                placeholder="Enter full name..."
                                value={fullname}
                                onChange={(e) => setFullname(e.target.value)}
                                disabled={submitting}
                            />
                        </div>

                        {/* Employee Code */}
                        <div>
                            <Label htmlFor="employeecode">Employee Code *</Label>
                            <Input
                                id="employeecode"
                                placeholder="e.g. 26121988"
                                value={employeecode}
                                onChange={(e) => setEmployeecode(e.target.value)}
                                disabled={submitting}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {/* Email */}
                        <div>
                            <Label htmlFor="email">Email Address *</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="user@kfc.com.vn"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={submitting}
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <Label htmlFor="password">Initial Password *</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Minimum 6 characters..."
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={submitting}
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute -translate-y-1/2 cursor-pointer right-3 top-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <EyeIcon className="w-5 h-5" />
                                    ) : (
                                        <EyeCloseIcon className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {/* Department */}
                        <div>
                            <Label>Department *</Label>
                            <Select
                                key={`dept-${departmentId}-${isOpen}`}
                                options={departmentSelectOptions}
                                placeholder="Select department..."
                                defaultValue={departmentId}
                                onChange={(val) => setDepartmentId(val)}
                            />
                        </div>

                        {/* Role */}
                        <div>
                            <Label>Role *</Label>
                            <Select
                                key={`role-${role}-${isOpen}`}
                                options={roleOptions}
                                defaultValue={role}
                                onChange={(val) => setRole(val)}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/[0.05]">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={submitting}
                        >
                            {submitting ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Creating...</span>
                                </div>
                            ) : (
                                "Create Member"
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
