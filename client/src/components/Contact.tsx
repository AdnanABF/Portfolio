import React, { useState, useEffect } from "react";
import SectionWrapper from "./SectionWrapper";
import { useForm, useWatch } from "react-hook-form";
import { Send, CheckCircle, AlertCircle, Lock } from "lucide-react";
import emailjs from "@emailjs/browser";

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const Contact: React.FC = () => {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    defaultValues: {
      subject: "",
      message: "",
    },
  });

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subjectValue = useWatch({
    control,
    name: "subject",
  });

  const isAccessRequest = subjectValue
    ?.toLowerCase()
    .includes("request access");

  // Effect to listen for the custom event from Projects.tsx
  useEffect(() => {
    const handleAutoFill = (e: any) => {
      const { subject, message } = e.detail;
      setValue("subject", subject, { shouldValidate: true });
      setValue("message", message, { shouldValidate: true });
    };

    window.addEventListener("contact-autofill", handleAutoFill);
    return () => window.removeEventListener("contact-autofill", handleAutoFill);
  }, [setValue]);

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      const currentTime = new Date().toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });

      const templateParams = {
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
        time: currentTime,
      };

      // 1. Send notification to YOU
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        templateParams,
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
      );

      // 2. Send Auto-Reply to the SENDER
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_AUTOREPLY_TEMPLATE_ID,
        templateParams,
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
      );

      setSuccess(true);
      reset();
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(
        "Failed to transmit. Please check your connection and try again.",
      );
    }
  };

  return (
    <SectionWrapper
      id="contact"
      className="bg-linear-to-b from-black to-surface"
    >
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Let's <span className="text-primary">Connect</span>
            </h2>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Interested in migrating your legacy systems or building the next
              big platform? I'm available for freelance projects and full-time
              opportunities.
            </p>

            <div className="space-y-6">
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <h4 className="text-primary font-mono mb-1">Email</h4>
                <p className="text-white">adnanabf@gmail.com</p>
              </div>
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <h4 className="text-primary font-mono mb-1">Location</h4>
                <p className="text-white">Malappuram, Kerala, India - 679574</p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            id="contact-form"
            className="space-y-6 bg-white/5 p-8 rounded-2xl border border-white/10 backdrop-blur-sm"
          >
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-500 text-sm">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-mono text-gray-400 mb-2">
                  Identify Yourself
                </label>
                <input
                  {...register("name", { required: "Name is required" })}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="John Doe"
                />
                {errors.name && (
                  <span className="flex items-center gap-1 text-red-500 text-xs mt-1">
                    <AlertCircle size={12} /> {errors.name.message}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-mono text-gray-400 mb-2">
                  Comms Channel
                </label>
                <input
                  {...register("email", {
                    required: "Email is required",
                    pattern: { value: /^\S+@\S+$/i, message: "Invalid email" },
                  })}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <span className="flex items-center gap-1 text-red-500 text-xs mt-1">
                    <AlertCircle size={12} /> {errors.email.message}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-mono text-gray-400 mb-2">
                Subject
              </label>
              <input
                {...register("subject", { required: "Subject is required" })}
                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                placeholder="Let's Connect / Freelance Project"
              />
              {errors.subject && (
                <span className="flex items-center gap-1 text-red-500 text-xs mt-1">
                  <AlertCircle size={12} /> {errors.subject.message}
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-mono text-gray-400 mb-2">
                Transmission
              </label>
              <textarea
                {...register("message", {
                  required: "Message is required",
                  minLength: { value: 10, message: "Message too short" },
                })}
                rows={4}
                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
                placeholder="Tell me about your project..."
              />
              {errors.message && (
                <span className="flex items-center gap-1 text-red-500 text-xs mt-1">
                  <AlertCircle size={12} /> {errors.message.message}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || success}
              className={`w-full py-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                success
                  ? "bg-green-500/20 text-green-500 border border-green-500/50"
                  : "bg-primary text-black hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(0,210,255,0.4)]"
              }`}
            >
              {success ? (
                <>
                  {isAccessRequest ? "Request Sent" : "Message Sent"}{" "}
                  <CheckCircle size={20} />
                </>
              ) : isSubmitting ? (
                "Transmitting..."
              ) : isAccessRequest ? (
                <>
                  Send Access Request <Lock size={20} />
                </>
              ) : (
                <>
                  Init Contact <Send size={20} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </SectionWrapper>
  );
};

export default Contact;
