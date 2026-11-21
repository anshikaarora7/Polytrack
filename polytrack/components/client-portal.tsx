'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import { ProjectInquiry, ClientProfile } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Inbox,
  Building2,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Download,
  Mail,
  Phone,
  FileText,
  DollarSign,
  Calendar,
  Layers,
  Sparkles,
  Loader2,
} from 'lucide-react';

export default function ClientPortal() {
  const [activeTab, setActiveTab] = useState<'inquiries' | 'clients'>('inquiries');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showNewInquiryModal, setShowNewInquiryModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<ProjectInquiry | null>(null);
  const [convertingInquiry, setConvertingInquiry] = useState<ProjectInquiry | null>(null);

  // Forms
  const [inquiryForm, setInquiryForm] = useState({
    clientName: '',
    companyName: '',
    email: '',
    phone: '',
    projectTitle: '',
    projectDescription: '',
    projectType: 'Environment',
    budgetRange: '$5,000 - $15,000',
    desiredDeadline: '',
    additionalNotes: '',
  });

  const [convertForm, setConvertForm] = useState({
    projectName: '',
    budget: 10000,
  });

  const [clientForm, setClientForm] = useState({
    contactName: '',
    companyName: '',
    email: '',
    phone: '',
    address: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Data fetching
  const { data: inquiriesData, mutate: mutateInquiries, isLoading: loadingInquiries } = useSWR(
    'inquiries',
    () => apiClient.getInquiries()
  );

  const { data: clientsData, mutate: mutateClients, isLoading: loadingClients } = useSWR(
    'clients',
    () => apiClient.getClients()
  );

  const inquiries: ProjectInquiry[] = inquiriesData?.data || [];
  const clients: ClientProfile[] = clientsData?.data || [];

  const filteredInquiries = inquiries.filter((inq) => {
    const matchesStatus =
      statusFilter === 'all' || inq.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesSearch =
      inq.projectTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inq.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inq.companyName && inq.companyName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const filteredClients = clients.filter(
    (c) =>
      c.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.companyName && c.companyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusColors: Record<string, string> = {
    new: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    reviewed: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    underreview: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    quoted: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    converted: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/30',
  };

  const handleCreateInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.createInquiry({
        ...inquiryForm,
        desiredDeadline: inquiryForm.desiredDeadline ? new Date(inquiryForm.desiredDeadline).toISOString() : undefined,
      });
      setShowNewInquiryModal(false);
      setInquiryForm({
        clientName: '',
        companyName: '',
        email: '',
        phone: '',
        projectTitle: '',
        projectDescription: '',
        projectType: 'Environment',
        budgetRange: '$5,000 - $15,000',
        desiredDeadline: '',
        additionalNotes: '',
      });
      mutateInquiries();
      setActionMessage('Inquiry submitted successfully!');
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit inquiry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (inquiryId: string, status: string) => {
    try {
      await apiClient.updateInquiryStatus(inquiryId, status);
      mutateInquiries();
      if (selectedInquiry && selectedInquiry.id === inquiryId) {
        setSelectedInquiry({ ...selectedInquiry, status });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleConvertInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingInquiry) return;
    setIsSubmitting(true);
    try {
      const res = await apiClient.convertInquiry(convertingInquiry.id, {
        projectName: convertForm.projectName || convertingInquiry.projectTitle,
        budget: Number(convertForm.budget),
      });
      setConvertingInquiry(null);
      setSelectedInquiry(null);
      mutateInquiries();
      mutateClients();
      setActionMessage(`Inquiry converted! Project created: ${res.projectName || 'Success'}`);
      setTimeout(() => setActionMessage(null), 5000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to convert inquiry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.createClient(clientForm);
      setShowNewClientModal(false);
      setClientForm({
        contactName: '',
        companyName: '',
        email: '',
        phone: '',
        address: '',
      });
      mutateClients();
      setActionMessage('Client registered successfully!');
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to register client');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-foreground">Client Portal & Inquiries</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/20 text-primary font-semibold border border-primary/30">
              Phase 2
            </span>
          </div>
          <p className="text-muted-foreground mt-1">
            Manage prospective client inquiries, project conversion, and client directory
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'inquiries' ? (
            <Button
              onClick={() => setShowNewInquiryModal(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Inquiry
            </Button>
          ) : (
            <Button
              onClick={() => setShowNewClientModal(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Client
            </Button>
          )}
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab('inquiries')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            activeTab === 'inquiries'
              ? 'bg-accent text-accent-foreground border border-border shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Inquiries & RFP Pipeline</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-muted">
            {inquiries.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('clients')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            activeTab === 'clients'
              ? 'bg-accent text-accent-foreground border border-border shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Clients Directory</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-muted">
            {clients.length}
          </span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={
              activeTab === 'inquiries'
                ? 'Search inquiries by project, client, or company...'
                : 'Search clients by contact name, company, email...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>

        {activeTab === 'inquiries' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {['all', 'New', 'Reviewed', 'Converted', 'Rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {status === 'all' ? 'All Statuses' : status}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Inquiries Tab Content */}
      {activeTab === 'inquiries' && (
        <div className="space-y-4">
          {loadingInquiries ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredInquiries.length === 0 ? (
            <Card className="p-12 text-center border-border/50 bg-card/50">
              <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-foreground">No Inquiries Found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery || statusFilter !== 'all'
                  ? 'No inquiries match your current filter parameters.'
                  : 'Get started by creating a new client project inquiry.'}
              </p>
              <Button
                onClick={() => setShowNewInquiryModal(true)}
                className="mt-4 bg-primary text-primary-foreground text-sm"
              >
                Submit First Inquiry
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredInquiries.map((inquiry) => {
                const sKey = inquiry.status.toLowerCase();
                const badgeClass = statusColors[sKey] || 'bg-gray-500/10 text-gray-400 border-gray-500/30';

                return (
                  <Card
                    key={inquiry.id}
                    className="p-5 border-border/60 bg-card/60 hover:border-border transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <span
                            className={`text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-md font-semibold border ${badgeClass}`}
                          >
                            {inquiry.status}
                          </span>
                          <h3 className="text-base font-semibold text-foreground mt-2 line-clamp-1">
                            {inquiry.projectTitle}
                          </h3>
                        </div>
                        {inquiry.budgetRange && (
                          <span className="text-xs font-medium px-2 py-1 rounded bg-muted text-foreground flex items-center gap-1 shrink-0">
                            <DollarSign className="w-3 h-3 text-emerald-400" />
                            {inquiry.budgetRange}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                        {inquiry.projectDescription}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-3 border-t border-border/40">
                        <div className="flex items-center gap-1.5 truncate">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium text-foreground truncate">
                            {inquiry.clientName}
                          </span>
                          {inquiry.companyName && (
                            <span className="text-muted-foreground truncate">
                              ({inquiry.companyName})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{inquiry.email}</span>
                        </div>
                        {inquiry.desiredDeadline && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span>Due: {new Date(inquiry.desiredDeadline).toLocaleDateString()}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span>Submitted: {new Date(inquiry.submittedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedInquiry(inquiry)}
                        className="text-xs"
                      >
                        View Details
                      </Button>

                      <div className="flex items-center gap-2">
                        {inquiry.status !== 'Converted' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setConvertingInquiry(inquiry);
                              setConvertForm({
                                projectName: inquiry.projectTitle,
                                budget: 15000,
                              });
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Convert to Project
                          </Button>
                        )}
                        {inquiry.status === 'Converted' && inquiry.convertedProjectId && (
                          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Active Project
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Clients Tab Content */}
      {activeTab === 'clients' && (
        <div className="space-y-4">
          {loadingClients ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredClients.length === 0 ? (
            <Card className="p-12 text-center border-border/50 bg-card/50">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-foreground">No Clients Registered</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Clients are automatically registered when converting inquiries or can be added manually.
              </p>
              <Button
                onClick={() => setShowNewClientModal(true)}
                className="mt-4 bg-primary text-primary-foreground text-sm"
              >
                Add Client
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map((client) => (
                <Card
                  key={client.id}
                  className="p-5 border-border/60 bg-card/60 hover:border-border transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-base font-bold text-foreground">
                          {client.companyName || client.contactName}
                        </h3>
                        {client.companyName && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Contact: {client.contactName}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          client.isActive
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {client.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground pt-2 border-t border-border/30">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="truncate">{client.email}</span>
                      </div>
                      {client.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      {client.address && (
                        <div className="text-muted-foreground/80 truncate">
                          {client.address}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Active Projects:</span>
                    <span className="font-semibold text-foreground px-2 py-0.5 rounded bg-muted">
                      {client.activeProjectsCount ?? 0}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: New Inquiry */}
      {showNewInquiryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 bg-card border-border shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Submit Project Inquiry
              </h2>
              <button
                onClick={() => setShowNewInquiryModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInquiry} className="space-y-4 mt-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Client Contact Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={inquiryForm.clientName}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, clientName: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                    placeholder="e.g. Maya Hansen"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={inquiryForm.companyName}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, companyName: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                    placeholder="e.g. Apex Visuals"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Email *</label>
                  <input
                    required
                    type="email"
                    value={inquiryForm.email}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                    placeholder="client@studio.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Phone</label>
                  <input
                    type="tel"
                    value={inquiryForm.phone}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Project Title *
                </label>
                <input
                  required
                  type="text"
                  value={inquiryForm.projectTitle}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, projectTitle: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                  placeholder="e.g. Futuristic Mech Character Asset Pack"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Project Description & Scope *
                </label>
                <textarea
                  required
                  rows={3}
                  value={inquiryForm.projectDescription}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, projectDescription: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm resize-none"
                  placeholder="Outline required 3D models, art style, polygon target, textures, LODs..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Project Type
                  </label>
                  <select
                    value={inquiryForm.projectType}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, projectType: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                  >
                    <option value="Character">Character</option>
                    <option value="Environment">Environment</option>
                    <option value="Prop">Prop / Hard Surface</option>
                    <option value="Animation">Animation</option>
                    <option value="Vfx">VFX</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Budget Range
                  </label>
                  <input
                    type="text"
                    value={inquiryForm.budgetRange}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, budgetRange: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                    placeholder="e.g. $10,000 - $20,000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Target Deadline
                  </label>
                  <input
                    type="date"
                    value={inquiryForm.desiredDeadline}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, desiredDeadline: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewInquiryModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary text-primary-foreground flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Submit Inquiry
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal: Inquiry Detail & Status Update */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-card border-border shadow-2xl">
            <div className="flex items-start justify-between pb-4 border-b border-border">
              <div>
                <span
                  className={`text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-md font-semibold border ${
                    statusColors[selectedInquiry.status.toLowerCase()] || ''
                  }`}
                >
                  {selectedInquiry.status}
                </span>
                <h2 className="text-xl font-bold text-foreground mt-2">
                  {selectedInquiry.projectTitle}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  From {selectedInquiry.clientName}{' '}
                  {selectedInquiry.companyName && `(${selectedInquiry.companyName})`}
                </p>
              </div>
              <button
                onClick={() => setSelectedInquiry(null)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 my-4 text-sm">
              <div>
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                  Scope & Description
                </h4>
                <p className="text-sm text-foreground/90 bg-muted/40 p-3 rounded-lg whitespace-pre-wrap">
                  {selectedInquiry.projectDescription}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-card/60 p-3 rounded-lg border border-border/40">
                <div>
                  <span className="text-muted-foreground block">Client Email:</span>
                  <span className="font-medium text-foreground">{selectedInquiry.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Phone:</span>
                  <span className="font-medium text-foreground">
                    {selectedInquiry.phone || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Budget Range:</span>
                  <span className="font-medium text-foreground">
                    {selectedInquiry.budgetRange || 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Project Type:</span>
                  <span className="font-medium text-foreground">
                    {selectedInquiry.projectType || 'Standard'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Target Due Date:</span>
                  <span className="font-medium text-foreground">
                    {selectedInquiry.desiredDeadline
                      ? new Date(selectedInquiry.desiredDeadline).toLocaleDateString()
                      : 'Flexible'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Submitted:</span>
                  <span className="font-medium text-foreground">
                    {new Date(selectedInquiry.submittedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Status transition dropdown */}
              <div className="pt-2">
                <label className="block text-xs font-medium text-foreground mb-1">
                  Update Pipeline Status
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedInquiry.status}
                    onChange={(e) => handleUpdateStatus(selectedInquiry.id, e.target.value)}
                    className="px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm flex-1"
                  >
                    <option value="New">New</option>
                    <option value="Reviewed">Reviewed</option>
                    <option value="Converted">Converted</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setSelectedInquiry(null)}>
                Close
              </Button>
              {selectedInquiry.status !== 'Converted' && (
                <Button
                  size="sm"
                  onClick={() => {
                    setConvertingInquiry(selectedInquiry);
                    setConvertForm({
                      projectName: selectedInquiry.projectTitle,
                      budget: 15000,
                    });
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  Convert to Project
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Modal: Convert Inquiry to Project */}
      {convertingInquiry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 bg-card border-border shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Convert Inquiry to Project
              </h2>
              <button
                onClick={() => setConvertingInquiry(null)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground mt-3">
              This will automatically create a new Studio Project, establish the Client Profile in the directory, and set the inquiry status to Converted.
            </p>

            <form onSubmit={handleConvertInquiry} className="space-y-4 mt-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Project Name *
                </label>
                <input
                  required
                  type="text"
                  value={convertForm.projectName}
                  onChange={(e) => setConvertForm({ ...convertForm, projectName: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Initial Project Budget ($) *
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  step="500"
                  value={convertForm.budget}
                  onChange={(e) => setConvertForm({ ...convertForm, budget: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConvertingInquiry(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Conversion
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal: New Client */}
      {showNewClientModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 bg-card border-border shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Register New Client
              </h2>
              <button
                onClick={() => setShowNewClientModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4 mt-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Contact Person *
                </label>
                <input
                  required
                  type="text"
                  value={clientForm.contactName}
                  onChange={(e) => setClientForm({ ...clientForm, contactName: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={clientForm.companyName}
                  onChange={(e) => setClientForm({ ...clientForm, companyName: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                  placeholder="e.g. CineVFX Studios"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Email *</label>
                <input
                  required
                  type="email"
                  value={clientForm.email}
                  onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                  placeholder="john@cinevfx.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Phone</label>
                <input
                  type="tel"
                  value={clientForm.phone}
                  onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Address / Location</label>
                <input
                  type="text"
                  value={clientForm.address}
                  onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                  placeholder="Los Angeles, CA"
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewClientModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-primary text-primary-foreground flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Register Client
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
