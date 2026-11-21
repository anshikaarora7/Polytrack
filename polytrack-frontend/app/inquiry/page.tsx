'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import ThemeToggle from '@/components/theme-toggle';
import {
  Layers,
  Send,
  Upload,
  CheckCircle2,
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  FileText,
  DollarSign,
  Calendar,
  Sparkles,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function PublicInquiryPage() {
  const [form, setForm] = useState({
    clientName: '',
    companyName: '',
    email: '',
    phone: '',
    projectTitle: '',
    projectDescription: '',
    projectType: 'Environment',
    budgetRange: 'Range15kTo30k',
    desiredDeadline: '',
    additionalNotes: '',
  });

  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedInquiryId, setSubmittedInquiryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.clientName || !form.email || !form.projectTitle) {
      setError('Please provide your Contact Name, Email Address, and Project Title.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.createInquiry({
        clientName: form.clientName,
        companyName: form.companyName || undefined,
        email: form.email,
        phone: form.phone || undefined,
        projectTitle: form.projectTitle,
        projectDescription: form.projectDescription || '',
        projectType: form.projectType,
        budgetRange: form.budgetRange,
        desiredDeadline: form.desiredDeadline ? new Date(form.desiredDeadline).toISOString() : undefined,
        additionalNotes: form.additionalNotes || undefined,
      });

      const inqId = res.id;
      if (attachment && inqId) {
        try {
          await apiClient.uploadInquiryAttachment(inqId, attachment);
        } catch (uploadErr) {
          console.warn('Attachment upload failed, but inquiry was recorded:', uploadErr);
        }
      }

      setSubmittedInquiryId(inqId || 'submitted');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit inquiry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col justify-between p-4 md:p-8">
      {/* Navigation */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-[4px] bg-accent text-white flex items-center justify-center font-bold text-xs">
            P
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-text">PolyTrack Studio</h1>
            <p className="text-[11px] text-text-muted">3D Production & Pipeline Tracking</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-colors px-2.5 py-1.5 rounded-[8px] border border-border hover:bg-surface-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Studio Login</span>
          </Link>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-3xl w-full mx-auto my-8">
        {submittedInquiryId ? (
          <Card className="p-8 md:p-12 text-center border border-border bg-surface shadow-[var(--shadow-pop)] rounded-[12px] space-y-5">
            <div className="w-12 h-12 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto border border-success/30">
              <CheckCircle2 className="w-6 h-6" strokeWidth={1.75} />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-text">Inquiry Received Successfully!</h2>
              <p className="text-xs text-text-muted max-w-md mx-auto">
                Thank you, <strong className="text-text">{form.clientName}</strong>. Our production team has received your project details for <strong className="text-text">{form.projectTitle}</strong>.
              </p>
            </div>

            <div className="p-3.5 bg-surface-2 rounded-[8px] border border-border max-w-md mx-auto text-xs text-left space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-text-muted">Reference ID:</span>
                <span className="text-accent font-semibold">{submittedInquiryId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Contact Email:</span>
                <span className="text-text">{form.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Category:</span>
                <span className="text-text">{form.projectType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Status:</span>
                <span className="text-success font-semibold">New (Pending Review)</span>
              </div>
            </div>

            <p className="text-xs text-text-muted">
              A Project Manager will review your scope, convert this inquiry into an active production project, and email you client portal access credentials.
            </p>

            <div className="pt-2 flex items-center justify-center gap-2">
              <Button
                onClick={() => {
                  setSubmittedInquiryId(null);
                  setForm({
                    clientName: '',
                    companyName: '',
                    email: '',
                    phone: '',
                    projectTitle: '',
                    projectDescription: '',
                    projectType: 'Environment',
                    budgetRange: 'Range15kTo30k',
                    desiredDeadline: '',
                    additionalNotes: '',
                  });
                  setAttachment(null);
                }}
                variant="outline"
                className="text-xs rounded-[8px]"
              >
                Submit Another Inquiry
              </Button>
              <Link href="/login">
                <Button className="bg-accent hover:bg-accent-hover text-white text-xs rounded-[8px]">
                  Go to Studio Sign In
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="border border-border bg-surface p-6 md:p-8 shadow-[var(--shadow-pop)] rounded-[12px]">
            <div className="mb-6 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-[8px] bg-accent-tint text-accent font-medium border border-border">
                  Client Portal
                </span>
                <h2 className="text-2xl font-semibold tracking-[-0.01em] text-text">Project Inquiry & Quote Request</h2>
              </div>
              <p className="text-xs text-text-muted">
                Submit your 3D asset, character, environment, or animation scope for studio production evaluation.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-danger/10 border border-danger/30 rounded-[8px] text-xs text-danger flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Contact Information */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-text uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-accent" strokeWidth={1.75} /> Client & Contact Info
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">
                      Contact Name *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. David Vance"
                      value={form.clientName}
                      onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                      className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-xs text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">
                      Company / Studio Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Vance Interactive"
                      value={form.companyName}
                      onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                      className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-xs text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">
                      Email Address *
                    </label>
                    <input
                      required
                      type="email"
                      placeholder="e.g. david@vancegames.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-xs text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 012-3456"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-xs text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                  </div>
                </div>
              </div>

              {/* Project Scope */}
              <div className="space-y-3 pt-3 border-t border-border">
                <h3 className="text-xs font-semibold text-text uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-accent" strokeWidth={1.75} /> Project Scope & Specifications
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">
                      Project Title *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Cyberpunk Modular Street Assets"
                      value={form.projectTitle}
                      onChange={(e) => setForm({ ...form, projectTitle: e.target.value })}
                      className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-xs text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text mb-1">
                      Detailed Project Description *
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Describe target art style, polycount budget, LODs, engine requirements (Unreal/Unity/Blender), and deliverables..."
                      value={form.projectDescription}
                      onChange={(e) => setForm({ ...form, projectDescription: e.target.value })}
                      className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-xs text-text resize-none focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-text mb-1">
                        Asset Category
                      </label>
                      <select
                        value={form.projectType}
                        onChange={(e) => setForm({ ...form, projectType: e.target.value })}
                        className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-xs text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                      >
                        <option value="Environment">Environment & Architecture</option>
                        <option value="Prop">3D Props & Hard-surface</option>
                        <option value="Character">Character & Creature</option>
                        <option value="Vehicle">Vehicles & Machinery</option>
                        <option value="Animation">Animation & Rigging</option>
                        <option value="Other">Custom 3D / VFX</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-text mb-1">
                        Estimated Budget
                      </label>
                      <select
                        value={form.budgetRange}
                        onChange={(e) => setForm({ ...form, budgetRange: e.target.value })}
                        className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-xs text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                      >
                        <option value="Under5k">&lt; $5,000</option>
                        <option value="Range5kTo15k">$5,000 - $15,000</option>
                        <option value="Range15kTo30k">$15,000 - $30,000</option>
                        <option value="Range30kTo50k">$30,000 - $50,000</option>
                        <option value="Over50k">$50,000+</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-text mb-1">
                        Desired Delivery Date
                      </label>
                      <input
                        type="date"
                        value={form.desiredDeadline}
                        onChange={(e) => setForm({ ...form, desiredDeadline: e.target.value })}
                        className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-xs text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text mb-1">
                      Additional Technical Notes (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 4K UDIM textures, Substance Painter sources, rig requirements..."
                      value={form.additionalNotes}
                      onChange={(e) => setForm({ ...form, additionalNotes: e.target.value })}
                      className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-xs text-text focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text mb-1">
                      Reference Concept Art / Brief Document (Optional)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                        className="text-xs text-text file:mr-2 file:py-1 file:px-2.5 file:rounded-[6px] file:border-0 file:text-xs file:bg-surface-2 file:border file:border-border file:text-text hover:file:bg-surface cursor-pointer"
                      />
                      {attachment && (
                        <span className="text-xs text-text-muted truncate max-w-[200px]">
                          {attachment.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t border-border flex items-center justify-between">
                <Link href="/login" className="text-xs text-text-muted hover:text-text">
                  Cancel and Return
                </Link>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-accent hover:bg-accent-hover text-white text-xs font-medium px-4 py-2 rounded-[8px] flex items-center gap-1.5 shadow-none"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.75} />
                      Submitting Inquiry...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" strokeWidth={1.75} />
                      Submit Project Inquiry
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-text-muted py-4 border-t border-border">
        PolyTrack 3D Studio Production Tracking • Linear-Inspired Precision System
      </div>
    </div>
  );
}
