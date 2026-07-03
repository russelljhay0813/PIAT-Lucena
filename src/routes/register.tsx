import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { GraduationCap, CheckCircle2, ArrowLeft, User, Phone, BookOpen, ChevronRight, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { emailExists, submitRegistration } from "@/lib/registrations-store";
import { fetchPrograms } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Student Registration — PIAT" },
      { name: "description", content: "Apply for admission to Philtech Institute Of Arts And Technology. Submit your registration for registrar approval." },
    ],
  }),
  component: RegisterPage,
});

const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const SEMESTERS = ["1st Semester", "2nd Semester", "Summer"];
const GENDERS = ["Male", "Female"];
const CIVIL_STATUS = ["Single", "Married", "Widowed", "Separated"];

const step1Schema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  middleName: z.string().optional(),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  suffix: z.string().optional(),
  gender: z.string().optional(),
  dob: z.string().optional(),
  civilStatus: z.string().optional(),
  nationality: z.string().trim().min(1, "Nationality is required"),
  placeOfBirth: z.string().optional(),
});

const step2Schema = z.object({
  email: z.string().trim().email("Invalid email"),
  mobileNumber: z.string().trim().min(10, "Mobile number must be at least 10 digits"),
  homeAddress: z.string().trim().min(1, "Home address is required"),
  province: z.string().trim().optional(),
  city: z.string().trim().optional(),
  barangay: z.string().trim().optional(),
  zipCode: z.string().trim().optional(),
  parentGuardianName: z.string().trim().min(1, "Parent/Guardian name is required"),
  relationship: z.string().trim().min(1, "Relationship is required"),
  parentGuardianContact: z.string().trim().optional(),
});

const step3Schema = z.object({
  program: z.string().min(1, "Program is required"),
  yearLevel: z.string().min(1, "Year level is required"),
  semester: z.string().min(1, "Semester is required"),
  academicYear: z.string().min(1, "Academic year is required"),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;

type FormState = Step1Data & Step2Data & Step3Data;

function RegisterPage() {
  const navigate = useNavigate();
  const { loginAs } = useAuth();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [programs, setPrograms] = useState<string[]>([]);
  const currentYear = new Date().getFullYear();
  const [previewData, setPreviewData] = useState<FormState | null>(null);

  const form = useForm<FormState>({
    resolver: zodResolver(step1Schema.merge(step2Schema).merge(step3Schema)),
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      suffix: "",
      gender: "Male",
      dob: "",
      civilStatus: "Single",
      nationality: "Filipino",
      placeOfBirth: "",
      email: "",
      mobileNumber: "",
      homeAddress: "",
      province: "",
      city: "",
      barangay: "",
      zipCode: "",
      parentGuardianName: "",
      relationship: "Father",
      parentGuardianContact: "",
      program: "",
      yearLevel: "1st Year",
      semester: "1st Semester",
      academicYear: `${currentYear}-${currentYear + 1}`,
    },
  });

  useEffect(() => {
    fetchPrograms()
      .then(setPrograms)
      .catch(() => setPrograms([]));
  }, []);

  const watchAll = form.watch();

  useEffect(() => {
    if (step === 4 && previewData) {
      setPreviewData({ ...watchAll });
    }
  }, [step, watchAll]);

  const validateStep = async (currentStep: number) => {
    let isValid = false;
    switch (currentStep) {
      case 1:
        isValid = await form.trigger(["firstName", "middleName", "lastName", "suffix", "gender", "dob", "civilStatus", "nationality", "placeOfBirth"]);
        break;
      case 2:
        isValid = await form.trigger(["email", "mobileNumber", "homeAddress", "province", "city", "barangay", "zipCode", "parentGuardianName", "relationship", "parentGuardianContact"]);
        break;
      case 3:
        isValid = await form.trigger(["program", "yearLevel", "semester", "academicYear"]);
        break;
    }
    return isValid;
  };

  const nextStep = async () => {
    const isValid = await validateStep(step);
    if (isValid) {
      if (step === 3) {
        setPreviewData(form.getValues());
      }
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    const data = form.getValues();
    if (await emailExists(data.email || "")) {
      form.setError("email", { message: "This email is already registered" });
      return;
    }

    await submitRegistration({
      firstName: data.firstName,
      middleName: data.middleName || undefined,
      lastName: data.lastName,
      email: data.email,
      password: Math.random().toString(36).slice(2, 8),
      educationLevel: "College",
      program: data.program,
      yearLevel: data.yearLevel,
      gradeLevel: "",
      strand: "",
      academicYear: data.academicYear,
      semester: data.semester,
      gender: data.gender || undefined,
      dob: data.dob || undefined,
      civilStatus: data.civilStatus || undefined,
      nationality: data.nationality,
      contactNumber: data.mobileNumber || "",
      address: data.homeAddress,
      parentName: data.parentGuardianName || undefined,
      parentContact: data.parentGuardianContact || undefined,
      studentType: "new",
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h1 className="font-heading text-xl font-bold text-foreground">Registration Submitted Successfully</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your application has been submitted and is awaiting review by the Registrar.
            You will be able to access your Student Dashboard once your registration has been approved.
          </p>
          <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <ArrowLeft className="h-4 w-4" /> Back to Login
          </Link>
        </motion.div>
      </div>
    );
  }

  const stepTitles = [
    { step: 1, title: "Personal Information", icon: User },
    { step: 2, title: "Contact Information", icon: Phone },
    { step: 3, title: "Academic Information", icon: BookOpen },
    { step: 4, title: "Review Information", icon: CheckCircle2 },
  ];

  return (
    <div className="flex min-h-screen items-start justify-center bg-background px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Student Registration</h1>
          <p className="mt-1 text-sm text-muted-foreground">Complete all steps to submit your application for registrar approval.</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-6 flex items-center justify-center">
          <div className="flex items-center gap-2">
            {stepTitles.map((s, i) => (
              <div key={s.step} className="flex items-center">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${step >= s.step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {s.step}
                </div>
                {i < stepTitles.length - 1 && (
                  <div className={`h-0.5 w-12 ${step > s.step ? "bg-primary" : "bg-muted"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <form className="space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="rounded-2xl border bg-card p-6 shadow-sm"
            >
              <div className="mb-4 flex items-center gap-2 border-b pb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                  {step === 1 && <User className="h-4 w-4" />}
                  {step === 2 && <Phone className="h-4 w-4" />}
                  {step === 3 && <BookOpen className="h-4 w-4" />}
                  {step === 4 && <CheckCircle2 className="h-4 w-4" />}
                </span>
                <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-foreground">
                  {stepTitles[step - 1].title}
                </h2>
              </div>

              {step === 1 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="First Name *" error={form.formState.errors.firstName?.message}>
                    <input {...form.register("firstName")} className="input" />
                  </Field>
                  <Field label="Middle Name">
                    <input {...form.register("middleName")} className="input" />
                  </Field>
                  <Field label="Last Name *" error={form.formState.errors.lastName?.message}>
                    <input {...form.register("lastName")} className="input" />
                  </Field>
                  <Field label="Suffix">
                    <input {...form.register("suffix")} className="input" placeholder="Jr, III, etc." />
                  </Field>
                  <Field label="Gender">
                    <select {...form.register("gender")} className="input">
                      <option value="">Select...</option>
                      {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </Field>
                  <Field label="Date of Birth">
                    <input type="date" {...form.register("dob")} className="input" />
                  </Field>
                  <Field label="Civil Status">
                    <select {...form.register("civilStatus")} className="input">
                      {CIVIL_STATUS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Nationality *" error={form.formState.errors.nationality?.message}>
                    <input {...form.register("nationality")} className="input" />
                  </Field>
                  <Field label="Place of Birth" className="sm:col-span-2 lg:col-span-3">
                    <input {...form.register("placeOfBirth")} className="input" />
                  </Field>
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Email Address *" error={form.formState.errors.email?.message}>
                    <input type="email" {...form.register("email")} className="input" />
                  </Field>
                  <Field label="Mobile Number *" error={form.formState.errors.mobileNumber?.message}>
                    <input {...form.register("mobileNumber")} className="input" />
                  </Field>
                  <Field label="Home Address *" error={form.formState.errors.homeAddress?.message} className="sm:col-span-2 lg:col-span-3">
                    <input {...form.register("homeAddress")} className="input" />
                  </Field>
                  <Field label="Province">
                    <input {...form.register("province")} className="input" />
                  </Field>
                  <Field label="City/Municipality">
                    <input {...form.register("city")} className="input" />
                  </Field>
                  <Field label="Barangay">
                    <input {...form.register("barangay")} className="input" />
                  </Field>
                  <Field label="ZIP Code">
                    <input {...form.register("zipCode")} className="input" />
                  </Field>
                  <Field label="Parent/Guardian Name *" error={form.formState.errors.parentGuardianName?.message}>
                    <input {...form.register("parentGuardianName")} className="input" />
                  </Field>
                  <Field label="Relationship *" error={form.formState.errors.relationship?.message}>
                    <select {...form.register("relationship")} className="input">
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Guardian">Guardian</option>
                    </select>
                  </Field>
                  <Field label="Parent/Guardian Contact">
                    <input {...form.register("parentGuardianContact")} className="input" />
                  </Field>
                </div>
              )}

              {step === 3 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Program *" error={form.formState.errors.program?.message}>
                    <select {...form.register("program")} className="input">
                      <option value="">Select program...</option>
                      {programs.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </Field>
                  <Field label="Year Level *">
                    <select {...form.register("yearLevel")} className="input">
                      {YEAR_LEVELS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </Field>
                  <Field label="Semester *">
                    <select {...form.register("semester")} className="input">
                      {SEMESTERS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Academic Year *">
                    <input {...form.register("academicYear")} className="input" readOnly />
                  </Field>
                </div>
              )}

              {step === 4 && previewData && (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <PreviewSection title="Personal Information">
                      <PreviewItem label="Full Name" value={`${previewData.firstName} ${previewData.middleName || ""} ${previewData.lastName} ${previewData.suffix || ""}`} />
                      <PreviewItem label="Gender" value={previewData.gender} />
                      <PreviewItem label="Date of Birth" value={previewData.dob} />
                      <PreviewItem label="Civil Status" value={previewData.civilStatus} />
                      <PreviewItem label="Nationality" value={previewData.nationality} />
                      <PreviewItem label="Place of Birth" value={previewData.placeOfBirth} />
                    </PreviewSection>
                    <PreviewSection title="Contact Information">
                      <PreviewItem label="Email" value={previewData.email} />
                      <PreviewItem label="Mobile" value={previewData.mobileNumber} />
                      <PreviewItem label="Address" value={previewData.homeAddress} />
                      <PreviewItem label="Parent/Guardian" value={previewData.parentGuardianName} />
                      <PreviewItem label="Relationship" value={previewData.relationship} />
                      <PreviewItem label="Parent Contact" value={previewData.parentGuardianContact} />
                    </PreviewSection>
                  </div>
                  <PreviewSection title="Academic Information">
                    <PreviewItem label="Program" value={previewData.program} />
                    <PreviewItem label="Year Level" value={previewData.yearLevel} />
                    <PreviewItem label="Semester" value={previewData.semester} />
                    <PreviewItem label="Academic Year" value={previewData.academicYear} />
                  </PreviewSection>
                  <div className="rounded-lg bg-warning/10 p-4 text-sm text-warning">
                    <p className="font-medium">Important:</p>
                    <p>By submitting this application, you confirm that all information provided is accurate. Your application will be reviewed by the Registrar's Office and you will receive credentials once approved.</p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between pt-2">
            <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3 w-3" /> Back to Login
            </Link>
            <div className="flex gap-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="inline-flex items-center gap-1 rounded-lg border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
              )}
              {step < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="rounded-lg bg-success px-6 py-2.5 text-sm font-medium text-success-foreground hover:opacity-90"
                >
                  Submit Registration
                </button>
              )}
            </div>
          </div>
        </form>
      </motion.div>
      <style>{`.input{width:100%;border:1px solid hsl(var(--border));background:transparent;border-radius:0.5rem;padding:0.5rem 0.75rem;font-size:0.875rem;color:hsl(var(--foreground));outline:none}.input:focus{border-color:hsl(var(--accent));box-shadow:0 0 0 2px hsl(var(--accent)/0.2)}`}</style>
    </div>
  );
}

function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className || ""}`}>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <h3 className="font-heading text-xs font-semibold uppercase text-muted-foreground mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function PreviewItem({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{value || "—"}</span>
    </div>
  );
}