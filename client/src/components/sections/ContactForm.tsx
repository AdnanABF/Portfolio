"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CircleAlert,
  CircleCheck,
  Eraser,
  LoaderCircle,
  Lock,
  Send,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { sendContact } from "@/lib/actions";
import {
  accessRequestPrefill,
  contactSchema,
  isAccessRequest,
  type ContactInput,
} from "@/lib/contact";

type Status = { kind: "idle" } | { kind: "error"; message: string } | { kind: "success" };

export function ContactForm() {
  const searchParams = useSearchParams();
  const requestSlug = searchParams.get("request");
  const prefill = useMemo(
    () => accessRequestPrefill(requestSlug),
    [requestSlug],
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: prefill?.subject ?? "",
      message: prefill?.message ?? "",
      website: "",
      // Real open-time is stamped in the mount effect below (Date.now()
      // is impure and forbidden during render).
      startedAt: 0,
    },
  });

  const [status, setStatus] = useState<Status>({ kind: "idle" });

  // Stamp open-time + prefill on mount (private-repo flow).
  useEffect(() => {
    setValue("startedAt", Date.now(), { shouldDirty: false });
    if (!prefill) return;
    setValue("subject", prefill.subject, { shouldValidate: true, shouldDirty: true });
    setValue("message", prefill.message, { shouldValidate: true, shouldDirty: true });
  }, [prefill, setValue]);

  const subjectValue = useWatch({ control, name: "subject" });
  const accessRequest = isAccessRequest(subjectValue ?? "");

  const onSubmit = async (data: ContactInput) => {
    setStatus({ kind: "idle" });
    const result = await sendContact(data);
    if (result.ok) {
      setStatus({ kind: "success" });
      reset();
      window.setTimeout(() => setStatus({ kind: "idle" }), 6000);
    } else {
      setStatus({ kind: "error", message: result.error ?? "Something went wrong." });
    }
  };

  const success = status.kind === "success";

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      id="contact-form"
      className="space-y-5 rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_0_rgba(28,25,23,0.04),0_8px_24px_-12px_rgba(28,25,23,0.12)] md:p-8 dark:shadow-none"
      noValidate
    >
      {/* Honeypot — hidden from humans and assistive tech */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>

      {status.kind === "error" && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
          <CircleAlert size={16} /> {status.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="mb-2 block font-mono text-sm text-muted">
            Identify Yourself
          </label>
          <input
            id="contact-name"
            {...register("name")}
            placeholder="John Doe"
            autoComplete="name"
            className="w-full rounded-lg border border-line bg-background p-3 text-foreground transition-all outline-none placeholder:text-muted/60 focus:border-primary focus:ring-1 focus:ring-primary"
          />
          {errors.name && (
            <FieldError message={errors.name.message} />
          )}
        </div>

        <div>
          <label htmlFor="contact-email" className="mb-2 block font-mono text-sm text-muted">
            Comms Channel
          </label>
          <input
            id="contact-email"
            {...register("email")}
            placeholder="john@example.com"
            autoComplete="email"
            inputMode="email"
            className="w-full rounded-lg border border-line bg-background p-3 text-foreground transition-all outline-none placeholder:text-muted/60 focus:border-primary focus:ring-1 focus:ring-primary"
          />
          {errors.email && (
            <FieldError message={errors.email.message} />
          )}
        </div>
      </div>

      <div>
        <label htmlFor="contact-subject" className="mb-2 block font-mono text-sm text-muted">
          Subject
        </label>
        <input
          id="contact-subject"
          {...register("subject")}
          placeholder="Let's Connect / Freelance Project"
          className="w-full rounded-lg border border-line bg-background p-3 text-foreground transition-all outline-none placeholder:text-muted/60 focus:border-primary focus:ring-1 focus:ring-primary"
        />
        {errors.subject && (
          <FieldError message={errors.subject.message} />
        )}
      </div>

      <div>
        <label htmlFor="contact-message" className="mb-2 block font-mono text-sm text-muted">
          Transmission
        </label>
        <textarea
          id="contact-message"
          {...register("message")}
          rows={4}
          placeholder="Tell me about your project..."
          className="w-full resize-none rounded-lg border border-line bg-background p-3 text-foreground transition-all outline-none placeholder:text-muted/60 focus:border-primary focus:ring-1 focus:ring-primary"
        />
        {errors.message && (
          <FieldError message={errors.message.message} />
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting || success}
          className={`flex h-14 grow items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition-all active:scale-95 ${
            success
              ? "border border-green-500/50 bg-green-500/15 text-green-700 dark:text-green-400"
              : "bg-primary text-white hover:bg-primary-strong dark:text-black"
          } disabled:cursor-wait disabled:opacity-80 max-[400px]:text-sm`}
        >
          {success ? (
            <>
              {accessRequest ? "Request Sent" : "Message Sent"}{" "}
              <CircleCheck size={20} />
            </>
          ) : isSubmitting ? (
            <>
              Transmitting... <LoaderCircle size={20} className="animate-spin" />
            </>
          ) : accessRequest ? (
            <>
              Send Access Request <Lock size={20} />
            </>
          ) : (
            <>
              Init Contact <Send size={20} />
            </>
          )}
        </button>

        {isDirty && !isSubmitting && !success && (
          <button
            type="button"
            onClick={() => reset()}
            title="Clear form"
            aria-label="Clear form"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-line bg-cream text-muted transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-600 active:scale-95 dark:bg-surface dark:hover:text-red-400"
          >
            <Eraser size={20} />
          </button>
        )}
      </div>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
      <CircleAlert size={12} /> {message}
    </span>
  );
}
