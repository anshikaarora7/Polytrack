'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
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
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 md:p-8">
      {/* Navigation */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/20 text-primary">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">PolyTrack Studio</h1>
            <p className="text-xs text-muted-foreground">3D Production & Asset Tracking System</p>
          </div>
        </div>

        <Link
          href="/login"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border/60 hover:bg-card/60"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Studio Login
        </Link>
      </div>

      {/* Main Container */}
      <div className="max-w-3xl w-full mx-auto my-8">
        {submittedInquiryId ? (
          <Card className="p-8 md:p-12 text-center border-border/50 bg-card/60 shadow-2xl backdrop-blur-sm space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Inquiry Received Successfully!</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Thank you, <strong className="text-foreground">{form.clientName}</strong>. Our production directors have received your project details for <strong className="text-foreground">{form.projectTitle}</strong>.
              </p>
            </div>

            <div className="p-4 bg-muted/40 rounded-xl border border-border/40 max-w-md mx-auto text-xs text-left space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reference ID:</span>
                <span className="text-primary font-bold">{submittedInquiryId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contact Email:</span>
                <span>{form.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category:</span>
                <span>{form.projectType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="text-emerald-400 font-bold">New (Pending Review)</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              A Project Manager will review your scope, convert this inquiry into an active production project, and email you client portal access credentials.
            </p>

            <div className="pt-4 flex items-center justify-center gap-3">
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
                className="text-xs"
              >
                Submit Another Inquiry
              </Button>
              <Link href="/login">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs">
                  Go to Studio Sign In
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="border-border/50 bg-card/60 backdrop-blur-sm p-6 md:p-8 shadow-xl">
            <div className="mb-6 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/20 text-primary font-semibold border border-primary/30">
                  Client Portal
                </span>
                <h2 className="text-2xl font-bold text-foreground">Project Inquiry & Quote Request</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Submit your 3D asset, character, environment, or animation scope for studio production evaluation.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact Information */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Client & Contact Info
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Contact Name *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. David Vance"
                      value={form.clientName}
                      onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Company / Studio Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Vance Interactive"
                      value={form.companyName}
                      onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Email Address *
                    </label>
                    <input
                      required
                      type="email"
                      placeholder="e.g. david@vancegames.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 012-3456"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              </div>

              {/* Project Scope */}
              <div className="space-y-3 pt-4 border-t border-border/40">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Project Scope & Specifications
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Project Title *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Cyberpunk Modular Street Assets"
                      value={form.projectTitle}
                      onChange={(e) => setForm({ ...form, projectTitle: e.target.value })}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Detailed Project Description *
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Describe target art style, polycount budget, LODs, engine requirements (Unreal/Unity/Blender), and deliverables..."
                      value={form.projectDescription}
                      onChange={(e) => setForm({ ...form, projectDescription: e.target.value })}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Asset Category
                      </label>
                      <select
                        value={form.projectType}
                        onChange={(e) => setForm({ ...form, projectType: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Estimated Budget
                      </label>
                      <select
                        value={form.budgetRange}
                        onChange={(e) => setForm({ ...form, budgetRange: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="Under5k">&lt; $5,000</option>
                        <option value="Range5kTo15k">$5,000 - $15,000</option>
                        <option value="Range15kTo30k">$15,000 - $30,000</option>
                        <option value="Range30kTo50k">$30,000 - $50,000</option>
                        <option value="Over50k">$50,000+</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Desired Delivery Date
                      </label>
                      <input
                        type="date"
                        value={form.desiredDeadline}
                        onChange={(e) => setForm({ ...form, desiredDeadline: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Additional Technical Notes (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 4K UDIM textures, Substance Painter sources, rig requirements..."
                      value={form.additionalNotes}
                      onChange={(e) => setForm({ ...form, additionalNotes: e.target.value })}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Reference Concept Art / Brief Document (Optional)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                        className="text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30 cursor-pointer"
                      />
                      {attachment && (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {attachment.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground">
                  Cancel and Return
                </Link>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-6 py-2.5 rounded-lg flex items-center gap-2 shadow-md"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting Inquiry...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
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
      <div className="text-center text-xs text-muted-foreground py-4 border-t border-border/30">
        PolyTrack 3D Studio Production Tracking Monolith • High-Performance Cloud & Studio Ready • PostgreSQL
      </div>
    </div>
  );
}
