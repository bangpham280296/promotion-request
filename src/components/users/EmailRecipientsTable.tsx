"use client";

import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import { Modal } from "@/components/ui/modal";
import { PlusIcon, TrashBinIcon, MailIcon, PencilIcon } from "@/icons";
import { toast } from "sonner";

export type EmailRecipient = {
  id: number;
  email: string;
  name: string | null;
  recipient_type: "TO" | "CC";
  is_active: boolean;
  created_at: string;
};

export default function EmailRecipientsTable() {
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  // Unified Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<EmailRecipient | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [typeInput, setTypeInput] = useState<"TO" | "CC">("TO");
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirm state
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status toggle state
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchRecipients = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/email-recipients");
      const data = await res.json();
      if (res.ok) {
        setRecipients(data.recipients || []);
        if (data.warning) {
          setWarningMsg(data.warning);
        } else {
          setWarningMsg(null);
        }
      } else {
        toast.error(data.error || "Failed to load notification recipients.");
      }
    } catch {
      toast.error("Network error while loading recipients.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipients();
  }, []);

  const handleOpenAddModal = () => {
    setEditingRecipient(null);
    setEmailInput("");
    setNameInput("");
    setTypeInput("TO");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: EmailRecipient) => {
    setEditingRecipient(item);
    setEmailInput(item.email);
    setNameInput(item.name || "");
    setTypeInput(item.recipient_type);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();

    // Validate KFC domain format
    if (!cleanEmail.endsWith("@kfcvietnam.com.vn")) {
      setFormError("Only email addresses ending with @kfcvietnam.com.vn are accepted.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      if (editingRecipient) {
        // Edit mode (PATCH)
        const res = await fetch("/api/admin/email-recipients", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingRecipient.id,
            email: cleanEmail,
            name: nameInput.trim() || null,
            recipient_type: typeInput,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setFormError(data.error || "Failed to update recipient.");
          return;
        }

        toast.success("Recipient updated successfully!");
      } else {
        // Add mode (POST)
        const res = await fetch("/api/admin/email-recipients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: cleanEmail,
            name: nameInput.trim() || undefined,
            recipient_type: typeInput,
            is_active: true,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setFormError(data.error || "Failed to add recipient.");
          return;
        }

        toast.success("Recipient added successfully!");
      }

      setIsModalOpen(false);
      fetchRecipients();
    } catch {
      setFormError("Unable to connect to the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (recipient: EmailRecipient) => {
    setTogglingId(recipient.id);
    const newStatus = !recipient.is_active;

    try {
      const res = await fetch("/api/admin/email-recipients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: recipient.id,
          is_active: newStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to update status.");
        return;
      }

      setRecipients((prev) =>
        prev.map((item) =>
          item.id === recipient.id ? { ...item, is_active: newStatus } : item
        )
      );
      toast.success(
        `Notifications ${newStatus ? "enabled" : "disabled"} for ${recipient.email}`
      );
    } catch {
      toast.error("Error updating notification status.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteRecipient = async () => {
    if (!deletingId) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/admin/email-recipients?id=${deletingId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to delete recipient.");
        return;
      }

      toast.success("Recipient removed successfully!");
      setRecipients((prev) => prev.filter((r) => r.id !== deletingId));
      setDeletingId(null);
    } catch {
      toast.error("Error connecting to server.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Warning if migration hasn't been run */}
      {warningMsg && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm dark:bg-amber-950/20 dark:border-amber-800/30 dark:text-amber-300">
          <p className="font-semibold mb-1">Configuration Notice:</p>
          <p>{warningMsg}</p>
        </div>
      )}

      {/* Toolbar / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Email Notification Recipients
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Team members who receive email alerts when a new promotion request is created. Must end with{" "}
            <span className="font-medium text-brand-500">@kfcvietnam.com.vn</span>.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-colors shadow-sm cursor-pointer"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Add Recipient</span>
        </button>
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.02]">
              <TableRow>
                <TableCell isHeader className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Email Address
                </TableCell>
                <TableCell isHeader className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name / Note
                </TableCell>
                <TableCell isHeader className="px-5 py-3.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </TableCell>
                <TableCell isHeader className="px-5 py-3.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </TableCell>
                <TableCell isHeader className="px-5 py-3.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading recipients...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : recipients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <MailIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                      <p>No email recipients configured yet.</p>
                      <button
                        onClick={handleOpenAddModal}
                        className="text-xs text-brand-500 hover:underline font-medium mt-1 cursor-pointer"
                      >
                        + Add your first recipient
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                recipients.map((item) => (
                  <TableRow
                    key={item.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors"
                  >
                    <TableCell className="px-5 py-3.5 text-sm font-medium text-gray-800 dark:text-white">
                      <div className="flex items-center gap-2">
                        <MailIcon className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>{item.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300">
                      {item.name || "—"}
                    </TableCell>
                    <TableCell className="px-5 py-3.5 text-center text-sm">
                      {item.recipient_type === "TO" ? (
                        <Badge color="primary" size="sm">
                          TO (Direct)
                        </Badge>
                      ) : (
                        <Badge color="info" size="sm">
                          CC (Watcher)
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-3.5 text-center text-sm">
                      <button
                        disabled={togglingId === item.id}
                        onClick={() => handleToggleActive(item)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                          item.is_active
                            ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-500/15 dark:text-green-400"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400"
                        }`}
                        title="Click to toggle email notifications"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.is_active ? "bg-green-600" : "bg-gray-400"
                          }`}
                        />
                        {togglingId === item.id
                          ? "Updating..."
                          : item.is_active
                          ? "Active"
                          : "Inactive"}
                      </button>
                    </TableCell>
                    <TableCell className="px-5 py-3.5 text-right text-sm">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="inline-flex items-center justify-center p-1.5 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg dark:hover:bg-brand-500/10 transition-colors cursor-pointer"
                          title="Edit recipient"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingId(item.id)}
                          className="inline-flex items-center justify-center p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Remove recipient"
                        >
                          <TrashBinIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add / Edit Recipient Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        className="max-w-md w-full p-6"
      >
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editingRecipient ? "Edit Recipient" : "Add Notification Recipient"}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {editingRecipient
              ? "Update recipient details and notification role."
              : "Team member who will receive email alerts when a new promotion request is created."}
          </p>
        </div>

        <form onSubmit={handleSaveRecipient} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Address <span className="text-brand-500">*</span>
            </label>
            <input
              type="email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="e.g. name@kfcvietnam.com.vn"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-white"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Must end with <strong>@kfcvietnam.com.vn</strong>
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name or Department Note
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. Alex Nguyen (Marketing Ops)"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Notification Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                  typeInput === "TO"
                    ? "border-brand-500 bg-brand-50/20 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                    : "border-gray-200 dark:border-white/[0.1] text-gray-700 dark:text-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="recipient_type"
                  value="TO"
                  checked={typeInput === "TO"}
                  onChange={() => setTypeInput("TO")}
                  className="text-brand-500 focus:ring-brand-500"
                />
                <div className="text-xs">
                  <div className="font-semibold">TO</div>
                  <div className="text-gray-400 text-[10px]">Action Taker (Direct)</div>
                </div>
              </label>

              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                  typeInput === "CC"
                    ? "border-blue-500 bg-blue-50/20 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                    : "border-gray-200 dark:border-white/[0.1] text-gray-700 dark:text-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="recipient_type"
                  value="CC"
                  checked={typeInput === "CC"}
                  onChange={() => setTypeInput("CC")}
                  className="text-blue-500 focus:ring-blue-500"
                />
                <div className="text-xs">
                  <div className="font-semibold">CC</div>
                  <div className="text-gray-400 text-[10px]">Watcher (In the loop)</div>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/[0.05]">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors dark:bg-white/[0.05] dark:text-gray-300 dark:hover:bg-white/[0.1] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-colors disabled:opacity-60 shadow-sm cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{editingRecipient ? "Save Changes" : "Add Recipient"}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingId}
        onClose={() => !isDeleting && setDeletingId(null)}
        className="max-w-sm w-full p-6 text-center"
      >
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
          <TrashBinIcon className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
          Remove Recipient
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
          Are you sure you want to remove this recipient? They will no longer receive automated email alerts for new promotion requests.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => setDeletingId(null)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors dark:bg-white/[0.05] dark:text-gray-300 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleDeleteRecipient}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-60 cursor-pointer"
          >
            {isDeleting ? "Removing..." : "Remove"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
