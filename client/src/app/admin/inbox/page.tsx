"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Loader2,
  Mail,
  RefreshCw,
  Reply,
} from "lucide-react";
import { getAdminInquiries, updateInquiryStatus } from "@/lib/api-client";

interface InquiryItem {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
}

export default function AdminInboxPage() {
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchInquiries = async () => {
    setLoading(true);
    const token = localStorage.getItem("abf_admin_token") || "";
    const data = await getAdminInquiries(token);
    setInquiries(data);
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem("abf_admin_token") || "";
    getAdminInquiries(token).then((data) => {
      if (isMounted) {
        setInquiries(data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const token = localStorage.getItem("abf_admin_token") || "";
      await updateInquiryStatus(id, newStatus, token);
      await fetchInquiries();
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredInquiries = inquiries.filter((i) => {
    if (filter === "all") return true;
    return i.status?.toLowerCase() === filter.toLowerCase();
  });

  return (
    <div className="min-h-screen bg-background py-10 px-4 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-muted hover:text-primary mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b-2 border-line pb-6 gap-4">
          <div>
            <span className="font-mono text-xs font-bold text-primary">{"// CONTACT INQUIRIES"}</span>
            <h1 className="text-3xl font-extrabold text-foreground">Inbound Messages & Leads</h1>
            <p className="mt-1 text-sm text-muted">
              Review and manage incoming project inquiries, freelance proposals, and messages from the contact form.
            </p>
          </div>
          <button
            onClick={fetchInquiries}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-line bg-surface px-4 py-2 font-mono text-xs font-bold shadow-[2px_2px_0px_var(--shadow-color)] hover:translate-y-[-1px] transition-all self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Filter Pills */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {["all", "unread", "replied", "archived"].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`rounded-lg border-2 border-line px-3 py-1 font-mono text-xs font-bold transition-all cursor-pointer ${
                filter === st
                  ? "bg-primary text-black shadow-[2px_2px_0px_var(--shadow-color)]"
                  : "bg-surface text-muted hover:text-foreground"
              }`}
            >
              {st.toUpperCase()}
            </button>
          ))}
          <div className="ml-auto font-mono text-xs text-muted">
            {filteredInquiries.length} messages
          </div>
        </div>

        {/* Inquiries Feed */}
        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-muted font-mono text-xs">
              <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" />
              Loading messages...
            </div>
          ) : filteredInquiries.length === 0 ? (
            <div className="rounded-2xl border-2 border-line bg-surface p-8 text-center font-mono text-xs text-muted">
              No inquiries found under &apos;{filter}&apos;.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInquiries.map((inq) => {
                const isUnread = inq.status?.toLowerCase() === "unread";
                const isReplied = inq.status?.toLowerCase() === "replied";

                return (
                  <div
                    key={inq.id}
                    className={`rounded-xl border-2 border-line bg-surface p-5 shadow-[3px_3px_0px_var(--shadow-color)] transition-all ${
                      isUnread ? "border-l-8 border-l-primary" : ""
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-foreground text-base">
                            {inq.name}
                          </span>
                          <a
                            href={`mailto:${inq.email}?subject=Re: ${encodeURIComponent(inq.subject || "Your Inquiry")}`}
                            className="font-mono text-xs text-primary hover:underline inline-flex items-center gap-1"
                          >
                            <Mail className="h-3 w-3" />
                            {inq.email}
                          </a>
                          {isUnread && (
                            <span className="inline-flex items-center gap-1 rounded bg-primary/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary border border-primary">
                              <Clock className="h-2.5 w-2.5" />
                              UNREAD
                            </span>
                          )}
                          {isReplied && (
                            <span className="inline-flex items-center gap-1 rounded bg-accent-mint/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-accent-mint border border-accent-mint">
                              <CheckCircle className="h-2.5 w-2.5" />
                              REPLIED
                            </span>
                          )}
                        </div>
                        <h4 className="mt-1 font-bold text-foreground text-sm">
                          {inq.subject || "No Subject"}
                        </h4>
                      </div>

                      <div className="font-mono text-[11px] text-muted shrink-0">
                        {new Date(inq.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg border border-line bg-surface-2 p-3 text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                      {inq.message}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-line">
                      <div className="flex items-center gap-2">
                        {isUnread && (
                          <button
                            disabled={updatingId === inq.id}
                            onClick={() => handleStatusChange(inq.id, "read")}
                            className="rounded-lg border-2 border-line bg-surface px-3 py-1 font-mono text-[11px] font-bold hover:bg-surface-2 cursor-pointer"
                          >
                            Mark Read
                          </button>
                        )}
                        {!isReplied && (
                          <button
                            disabled={updatingId === inq.id}
                            onClick={() => handleStatusChange(inq.id, "replied")}
                            className="rounded-lg border-2 border-line bg-surface px-3 py-1 font-mono text-[11px] font-bold text-accent-mint hover:bg-surface-2 cursor-pointer"
                          >
                            Mark Replied
                          </button>
                        )}
                        {inq.status !== "archived" && (
                          <button
                            disabled={updatingId === inq.id}
                            onClick={() => handleStatusChange(inq.id, "archived")}
                            className="rounded-lg border-2 border-line bg-surface px-3 py-1 font-mono text-[11px] font-bold text-muted hover:text-foreground cursor-pointer"
                          >
                            Archive
                          </button>
                        )}
                      </div>

                      <a
                        href={`mailto:${inq.email}?subject=Re: ${encodeURIComponent(inq.subject || "Portfolio Inquiry")}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border-2 border-line bg-primary px-3 py-1 font-mono text-xs font-bold text-black shadow-[2px_2px_0px_var(--shadow-color)] hover:translate-y-[-1px] transition-all"
                      >
                        <Reply className="h-3.5 w-3.5" />
                        Reply via Email
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
