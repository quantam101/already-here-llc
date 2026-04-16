"use client";

import Link from "next/link";
import { FormEvent, useMemo, useRef, useState } from "react";
import {
  dispatchFieldLabels,
  DispatchFieldErrors,
  DispatchFieldName,
  DispatchPayload,
  dispatchInitialValues,
  sanitizeDispatchPayload,
  validateDispatchPayload,
} from "@/lib/dispatch";

type SubmitState = "idle" | "submitting" | "success" | "error";

const stateOptions = ["Arizona", "Nevada", "California", "New Mexico", "Texas", "Other"];
const siteCountOptions = ["One site", "Multi-site"];
const yesNoUnknownOptions = ["No", "Yes", "Unknown"];
const requestedWindowOptions = [
  "Morning",
  "Midday",
  "Afternoon",
  "Evening",
  "After hours",
  "Flexible",
];
const serviceTypeOptions = [
  "Remote Team Support",
  "Infrastructure Field Work",
  "Rollout and Modernization",
  "Healthcare / Controlled Environment",
  "POS / Device / Signage",
  "Merchandising / Audits / Resets",
];
const priorityOptions = ["Standard", "Urgent", "Emergency"];

function fieldClass(error?: string) {
  return [
    "mt-2 w-full rounded-2xl border bg-white px-4 py-3 text-base text-slate-900 outline-none transition",
    error
      ? "border-red-400 ring-2 ring-red-100 focus:border-red-500 focus:ring-red-100"
      : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
  ].join(" ");
}

function textareaClass(error?: string) {
  return [
    "mt-2 min-h-[132px] w-full rounded-2xl border bg-white px-4 py-3 text-base text-slate-900 outline-none transition",
    error
      ? "border-red-400 ring-2 ring-red-100 focus:border-red-500 focus:ring-red-100"
      : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
  ].join(" ");
}

function Label({
  htmlFor,
  label,
  required,
}: {
  htmlFor: DispatchFieldName;
  label: string;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="flex items-center gap-3 text-sm font-semibold text-slate-800">
      <span>{label}</span>
      <span
        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${
          required ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"
        }`}
      >
        {required ? "Required" : "Optional"}
      </span>
    </label>
  );
}

function FieldError({ error }: { error?: string }) {
  return error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null;
}

export default function DispatchPageClient() {
  const [form, setForm] = useState<DispatchPayload>(dispatchInitialValues);
  const [errors, setErrors] = useState<DispatchFieldErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitMessage, setSubmitMessage] = useState("");
  const summaryRef = useRef<HTMLDivElement | null>(null);

  const errorEntries = useMemo(
    () => Object.entries(errors) as Array<[DispatchFieldName, string]>,
    [errors]
  );

  function updateField(field: DispatchFieldName, value: string) {
    setForm((current) => ({ ...current, [field]: value }));

    if (errors[field]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
    }
  }

  function focusSummary() {
    requestAnimationFrame(() => {
      summaryRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedForm = sanitizeDispatchPayload(form);
    const validation = validateDispatchPayload(normalizedForm);

    setErrors(validation.fieldErrors);
    setForm(normalizedForm);

    if (validation.invalidFields.length > 0) {
      setSubmitState("error");
      setSubmitMessage("Review the highlighted required fields before sending the dispatch request.");
      focusSummary();
      return;
    }

    setSubmitState("submitting");
    setSubmitMessage("Submitting your dispatch request for delivery...");

    try {
      const response = await fetch("/api/dispatch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(normalizedForm),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        fieldErrors?: DispatchFieldErrors;
      };

      if (!response.ok || !data.ok) {
        setErrors(data.fieldErrors ?? {});
        setSubmitState("error");
        setSubmitMessage(
          data.message ||
            "Dispatch delivery failed before the request could be submitted. Review the details and try again."
        );
        focusSummary();
        return;
      }

      setErrors({});
      setForm(dispatchInitialValues);
      setSubmitState("success");
      setSubmitMessage(
        data.message ||
          "Dispatch request submitted for delivery to our dispatch inbox. Watch for follow-up if the request is accepted."
      );
      focusSummary();
    } catch (error) {
      console.error("Dispatch submit failed", error);
      setSubmitState("error");
      setSubmitMessage(
        "Dispatch delivery failed before the request could be submitted. Please try again in a minute."
      );
      focusSummary();
    }
  }

  return (
    <main className="bg-slate-50 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14 sm:px-8 lg:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
            Dispatch Intake
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Submit the site, timing, contacts, and scope details in one place.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            This form is the primary intake path for dispatch requests. Required fields are marked clearly,
            optional notes stay optional, and the page only reports success after the server confirms the
            email delivery attempt succeeded.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/services"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
            >
              Review Services
            </Link>
            <Link
              href="/request-coverage"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Request Coverage
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12 sm:px-8 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1.55fr_0.85fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm sm:p-10"
            noValidate
          >
            <section className="pb-8">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                Requester details
              </h2>
              <p className="mt-3 text-lg leading-8 text-slate-600">
                These details identify who is requesting the visit and who should receive follow-up.
              </p>

              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                <div>
                  <Label htmlFor="fullName" label="Full name" required />
                  <input
                    id="fullName"
                    name="fullName"
                    autoComplete="name"
                    value={form.fullName}
                    onChange={(event) => updateField("fullName", event.target.value)}
                    className={fieldClass(errors.fullName)}
                  />
                  <FieldError error={errors.fullName} />
                </div>

                <div>
                  <Label htmlFor="company" label="Company" required />
                  <input
                    id="company"
                    name="company"
                    autoComplete="organization"
                    value={form.company}
                    onChange={(event) => updateField("company", event.target.value)}
                    className={fieldClass(errors.company)}
                  />
                  <FieldError error={errors.company} />
                </div>

                <div>
                  <Label htmlFor="email" label="Email" required />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    className={fieldClass(errors.email)}
                  />
                  <FieldError error={errors.email} />
                </div>

                <div>
                  <Label htmlFor="phone" label="Phone" required />
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    className={fieldClass(errors.phone)}
                  />
                  <FieldError error={errors.phone} />
                </div>
              </div>
            </section>

            <section className="border-t border-slate-200 py-8">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                Site and schedule
              </h2>
              <p className="mt-3 text-lg leading-8 text-slate-600">
                Enter the physical site and timing details needed to qualify the work.
              </p>

              <div className="mt-8">
                <Label htmlFor="fullSiteAddress" label="Full site address" required />
                <input
                  id="fullSiteAddress"
                  name="fullSiteAddress"
                  value={form.fullSiteAddress}
                  onChange={(event) => updateField("fullSiteAddress", event.target.value)}
                  className={fieldClass(errors.fullSiteAddress)}
                />
                <FieldError error={errors.fullSiteAddress} />
              </div>

              <div className="mt-6 grid gap-6 sm:grid-cols-3">
                <div>
                  <Label htmlFor="state" label="State" required />
                  <select
                    id="state"
                    name="state"
                    value={form.state}
                    onChange={(event) => updateField("state", event.target.value)}
                    className={fieldClass(errors.state)}
                  >
                    {stateOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                  <FieldError error={errors.state} />
                </div>

                <div>
                  <Label htmlFor="siteCount" label="One site or multi-site" />
                  <select
                    id="siteCount"
                    name="siteCount"
                    value={form.siteCount}
                    onChange={(event) => updateField("siteCount", event.target.value)}
                    className={fieldClass()}
                  >
                    {siteCountOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="travelLikely" label="Travel likely" />
                  <select
                    id="travelLikely"
                    name="travelLikely"
                    value={form.travelLikely}
                    onChange={(event) => updateField("travelLikely", event.target.value)}
                    className={fieldClass()}
                  >
                    {yesNoUnknownOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 grid gap-6 sm:grid-cols-3">
                <div>
                  <Label htmlFor="requestedDate" label="Requested date" required />
                  <input
                    id="requestedDate"
                    name="requestedDate"
                    type="date"
                    value={form.requestedDate}
                    onChange={(event) => updateField("requestedDate", event.target.value)}
                    className={fieldClass(errors.requestedDate)}
                  />
                  <FieldError error={errors.requestedDate} />
                </div>

                <div>
                  <Label htmlFor="requestedWindow" label="Requested window" required />
                  <select
                    id="requestedWindow"
                    name="requestedWindow"
                    value={form.requestedWindow}
                    onChange={(event) => updateField("requestedWindow", event.target.value)}
                    className={fieldClass(errors.requestedWindow)}
                  >
                    <option value="">Select a window</option>
                    {requestedWindowOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                  <FieldError error={errors.requestedWindow} />
                </div>

                <div>
                  <Label htmlFor="dueByTime" label="Due-by time" />
                  <input
                    id="dueByTime"
                    name="dueByTime"
                    type="time"
                    value={form.dueByTime}
                    onChange={(event) => updateField("dueByTime", event.target.value)}
                    className={fieldClass()}
                  />
                </div>
              </div>

              <div className="mt-6 grid gap-6 sm:grid-cols-3">
                <div>
                  <Label htmlFor="serviceType" label="Service type" required />
                  <select
                    id="serviceType"
                    name="serviceType"
                    value={form.serviceType}
                    onChange={(event) => updateField("serviceType", event.target.value)}
                    className={fieldClass(errors.serviceType)}
                  >
                    <option value="">Select a service type</option>
                    {serviceTypeOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                  <FieldError error={errors.serviceType} />
                </div>

                <div>
                  <Label htmlFor="priority" label="Priority" required />
                  <select
                    id="priority"
                    name="priority"
                    value={form.priority}
                    onChange={(event) => updateField("priority", event.target.value)}
                    className={fieldClass(errors.priority)}
                  >
                    <option value="">Select a priority</option>
                    {priorityOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                  <FieldError error={errors.priority} />
                </div>

                <div>
                  <Label htmlFor="ticketReference" label="Ticket or reference number" />
                  <input
                    id="ticketReference"
                    name="ticketReference"
                    value={form.ticketReference}
                    onChange={(event) => updateField("ticketReference", event.target.value)}
                    className={fieldClass()}
                  />
                </div>
              </div>
            </section>

            <section className="border-t border-slate-200 py-8">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                Onsite contact
              </h2>
              <p className="mt-3 text-lg leading-8 text-slate-600">
                The onsite contact is who our team should coordinate with at the location.
              </p>

              <div className="mt-8 grid gap-6 sm:grid-cols-3">
                <div>
                  <Label htmlFor="onsiteContactName" label="Onsite contact name" required />
                  <input
                    id="onsiteContactName"
                    name="onsiteContactName"
                    value={form.onsiteContactName}
                    onChange={(event) => updateField("onsiteContactName", event.target.value)}
                    className={fieldClass(errors.onsiteContactName)}
                  />
                  <FieldError error={errors.onsiteContactName} />
                </div>

                <div>
                  <Label htmlFor="onsiteContactPhone" label="Onsite contact phone" required />
                  <input
                    id="onsiteContactPhone"
                    name="onsiteContactPhone"
                    type="tel"
                    value={form.onsiteContactPhone}
                    onChange={(event) => updateField("onsiteContactPhone", event.target.value)}
                    className={fieldClass(errors.onsiteContactPhone)}
                  />
                  <FieldError error={errors.onsiteContactPhone} />
                </div>

                <div>
                  <Label htmlFor="onsiteContactEmail" label="Onsite contact email" required />
                  <input
                    id="onsiteContactEmail"
                    name="onsiteContactEmail"
                    type="email"
                    value={form.onsiteContactEmail}
                    onChange={(event) => updateField("onsiteContactEmail", event.target.value)}
                    className={fieldClass(errors.onsiteContactEmail)}
                  />
                  <FieldError error={errors.onsiteContactEmail} />
                </div>
              </div>
            </section>

            <section className="border-t border-slate-200 py-8">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                Billing contact
              </h2>
              <p className="mt-3 text-lg leading-8 text-slate-600">
                The billing contact is who should receive commercial follow-up on approved work.
              </p>

              <div className="mt-8 grid gap-6 sm:grid-cols-3">
                <div>
                  <Label htmlFor="billingContactName" label="Billing contact name" required />
                  <input
                    id="billingContactName"
                    name="billingContactName"
                    value={form.billingContactName}
                    onChange={(event) => updateField("billingContactName", event.target.value)}
                    className={fieldClass(errors.billingContactName)}
                  />
                  <FieldError error={errors.billingContactName} />
                </div>

                <div>
                  <Label htmlFor="billingContactPhone" label="Billing contact phone" required />
                  <input
                    id="billingContactPhone"
                    name="billingContactPhone"
                    type="tel"
                    value={form.billingContactPhone}
                    onChange={(event) => updateField("billingContactPhone", event.target.value)}
                    className={fieldClass(errors.billingContactPhone)}
                  />
                  <FieldError error={errors.billingContactPhone} />
                </div>

                <div>
                  <Label htmlFor="billingContactEmail" label="Billing contact email" required />
                  <input
                    id="billingContactEmail"
                    name="billingContactEmail"
                    type="email"
                    value={form.billingContactEmail}
                    onChange={(event) => updateField("billingContactEmail", event.target.value)}
                    className={fieldClass(errors.billingContactEmail)}
                  />
                  <FieldError error={errors.billingContactEmail} />
                </div>
              </div>

              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <div>
                  <Label htmlFor="liftRequired" label="Lift required" />
                  <select
                    id="liftRequired"
                    name="liftRequired"
                    value={form.liftRequired}
                    onChange={(event) => updateField("liftRequired", event.target.value)}
                    className={fieldClass()}
                  >
                    {yesNoUnknownOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="toolsRequired" label="Tools or staging required" />
                  <select
                    id="toolsRequired"
                    name="toolsRequired"
                    value={form.toolsRequired}
                    onChange={(event) => updateField("toolsRequired", event.target.value)}
                    className={fieldClass()}
                  >
                    {yesNoUnknownOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="border-t border-slate-200 py-8">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                Scope and execution notes
              </h2>
              <p className="mt-3 text-lg leading-8 text-slate-600">
                Keep the required summary concise, then add optional context only where it helps execution.
              </p>

              <div className="mt-8 space-y-6">
                <div>
                  <Label htmlFor="oneLineScopeSummary" label="One-line scope summary" required />
                  <textarea
                    id="oneLineScopeSummary"
                    name="oneLineScopeSummary"
                    value={form.oneLineScopeSummary}
                    onChange={(event) => updateField("oneLineScopeSummary", event.target.value)}
                    className={textareaClass(errors.oneLineScopeSummary)}
                  />
                  <FieldError error={errors.oneLineScopeSummary} />
                </div>

                <div>
                  <Label htmlFor="bridgeDetails" label="Remote bridge details" />
                  <textarea
                    id="bridgeDetails"
                    name="bridgeDetails"
                    value={form.bridgeDetails}
                    onChange={(event) => updateField("bridgeDetails", event.target.value)}
                    className={textareaClass()}
                  />
                </div>

                <div>
                  <Label htmlFor="accessNotes" label="Access notes" />
                  <textarea
                    id="accessNotes"
                    name="accessNotes"
                    value={form.accessNotes}
                    onChange={(event) => updateField("accessNotes", event.target.value)}
                    className={textareaClass()}
                  />
                </div>

                <div>
                  <Label htmlFor="closeoutRequirements" label="Closeout requirements" />
                  <textarea
                    id="closeoutRequirements"
                    name="closeoutRequirements"
                    value={form.closeoutRequirements}
                    onChange={(event) => updateField("closeoutRequirements", event.target.value)}
                    className={textareaClass()}
                  />
                </div>
              </div>
            </section>

            <div ref={summaryRef} className="border-t border-slate-200 pt-8">
              <div className="mb-5 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  This request includes the requester, site, schedule, onsite contact, billing contact, and scope
                  summary. Submission only counts as successful after the server confirms the delivery attempt.
                </div>

                {submitState === "success" ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                    {submitMessage}
                  </div>
                ) : null}

                {submitState === "error" && submitMessage ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                    {submitMessage}
                  </div>
                ) : null}

                {errorEntries.length > 0 ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                    <p className="font-semibold">
                      {errorEntries.length} required field{errorEntries.length === 1 ? "" : "s"} still need attention.
                    </p>
                    <ul className="mt-3 space-y-2">
                      {errorEntries.map(([field, message]) => (
                        <li key={field}>
                          <a href={`#${field}`} className="underline underline-offset-4">
                            {dispatchFieldLabels[field]}
                          </a>
                          : {message}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={submitState === "submitting"}
                className="inline-flex w-full items-center justify-center rounded-full bg-blue-600 px-6 py-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitState === "submitting"
                  ? "Submitting dispatch request..."
                  : "Submit Dispatch Request"}
              </button>
            </div>
          </form>

          <aside className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
                Required to send
              </p>
              <ul className="mt-5 space-y-5 text-lg leading-8 text-slate-700">
                <li>Requester name, company, email, and phone.</li>
                <li>Full site address, state, requested date, and requested window.</li>
                <li>Service type, priority, and one-line scope summary.</li>
                <li>Separate onsite and billing contacts with name, phone, and email.</li>
              </ul>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
                What success means
              </p>
              <p className="mt-5 text-lg leading-8 text-slate-700">
                A success message means the server validated the request and the delivery attempt to the dispatch inbox
                succeeded. It does not promise schedule acceptance or onsite confirmation.
              </p>
            </div>

            <div className="rounded-[28px] border border-slate-900 bg-slate-950 p-6 text-white shadow-sm sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">
                Direct contact
              </p>
              <p className="mt-5 text-3xl font-semibold tracking-tight">
                dispatch@alreadyherellc.com
              </p>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                Keep email for active threads, clarifications, and follow-up. The form above is the primary intake path
                for new dispatch requests.
              </p>
              <div className="mt-6">
                <Link
                  href="/request-coverage"
                  className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                >
                  Review Coverage Path
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
