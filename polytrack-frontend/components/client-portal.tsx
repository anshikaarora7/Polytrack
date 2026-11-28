'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { apiClient, formatApiError } from '@/lib/api-client';
import { ProjectInquiry, ClientProfile } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ErrorWarningCard } from '@/components/ui/error-warning';
import {
  Inbox,
  Building2,
  Plus,
  Search,
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
  FolderPlus,
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
  const [portalError, setPortalError] = useState<{ title?: string; message: string; details?: string[] } | null>(null);

  // Data fetching
  const {
    data: inquiriesData,
    mutate: mutateInquiries,
    isLoading: loadingInquiries,
    error: inquiriesError,
  } = useSWR('inquiries', () => apiClient.getInquiries());

  const {
    data: clientsData,
    mutate: mutateClients,
    isLoading: loadingClients,
    error: clientsError,
  } = useSWR('clients', () => apiClient.getClients());

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

  const getInquiryStatusDot = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new':
        return 'bg-info';
      case 'reviewed':
      case 'underreview':
      case 'quoted':
        return 'bg-warning';
      case 'converted':
        return 'bg-success';
      case 'rejected':
        return 'bg-danger';
      default:
        return 'bg-text-muted';
    }
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
      setPortalError(formatApiError(err));
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
      setPortalError(formatApiError(err));
    }
  };

  const handleConvertInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingInquiry) return;
    setIsSubmitting(true);
    setPortalError(null);
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
      setPortalError(formatApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setPortalError(null);
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
      setPortalError(formatApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-[-0.01em] text-text">Client Portal & Inquiries</h1>
            <span className="text-xs px-2 py-0.5 rounded-[8px] bg-accent-tint text-accent font-medium border border-border">
              Phase 2
            </span>
          </div>
          <p className="text-sm text-text-muted mt-0.5">
            Manage prospective client inquiries, project conversion, and client directory
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'inquiries' ? (
            <Button
              onClick={() => setShowNewInquiryModal(true)}
              className="rounded-[8px] bg-accent hover:bg-accent-hover text-white flex items-center gap-1.5 text-sm h-9 px-3.5 shadow-none"
            >
              <Plus className="w-4 h-4" strokeWidth={1.75} />
              <span>New Inquiry</span>
            </Button>
          ) : (
            <Button
              onClick={() => setShowNewClientModal(true)}
              className="rounded-[8px] bg-accent hover:bg-accent-hover text-white flex items-center gap-1.5 text-sm h-9 px-3.5 shadow-none"
            >
              <Plus className="w-4 h-4" strokeWidth={1.75} />
              <span>Add Client</span>
            </Button>
          )}
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-success/10 border border-success/30 rounded-[8px] text-success text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          <span>{actionMessage}</span>
        </div>
      )}

      {portalError && (
        <div className="p-3 bg-danger/10 border border-danger/30 rounded-[8px] text-danger text-xs flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} />
            <div>
              <p className="font-semibold">{portalError.title || 'Request Failed'}</p>
              <p>{portalError.message}</p>
              {portalError.details && portalError.details.length > 0 && (
                <ul className="mt-1 list-disc list-inside space-y-0.5">
                  {portalError.details.map((detail, idx) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <button
            onClick={() => setPortalError(null)}
            className="text-danger hover:opacity-80 p-0.5 text-sm leading-none"
            aria-label="Dismiss error"
          >
            &times;
          </button>
        </div>
      )}

      {inquiriesError && (
        <ErrorWarningCard
          error={inquiriesError}
          type="server"
          title="Failed to Load Inquiries"
          message="Could not load client inquiries from the database."
          onRetry={() => mutateInquiries()}
        />
      )}

      {clientsError && (
        <ErrorWarningCard
          error={clientsError}
          type="server"
          title="Failed to Load Clients"
          message="Could not load client directory from the database."
          onRetry={() => mutateClients()}
        />
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab('inquiries')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-[8px] font-medium text-xs transition-colors ${
            activeTab === 'inquiries'
              ? 'bg-surface-2 text-text border border-border'
              : 'text-text-muted hover:text-text'
          }`}
        >
          <Inbox className="w-4 h-4" strokeWidth={1.75} />
          <span>Inquiries & RFP Pipeline</span>
          <span className="px-1.5 py-0.2 rounded-full text-[11px] bg-surface border border-border text-text-muted tabular-nums">
            {inquiries.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('clients')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-[8px] font-medium text-xs transition-colors ${
            activeTab === 'clients'
              ? 'bg-surface-2 text-text border border-border'
              : 'text-text-muted hover:text-text'
          }`}
        >
          <Building2 className="w-4 h-4" strokeWidth={1.75} />
          <span>Clients Directory</span>
          <span className="px-1.5 py-0.2 rounded-full text-[11px] bg-surface border border-border text-text-muted tabular-nums">
            {clients.length}
          </span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" strokeWidth={1.75} />
          <input
            type="text"
            placeholder={
              activeTab === 'inquiries'
                ? 'Search inquiries by project, client, or company...'
                : 'Search clients by contact name, company, email...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-[8px] text-text placeholder:text-text-muted text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>

        {activeTab === 'inquiries' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['all', 'New', 'Reviewed', 'Converted', 'Rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1.5 rounded-[8px] text-xs font-medium transition-colors whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-accent text-white'
                    : 'bg-surface border border-border text-text-muted hover:text-text'
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
              <Loader2 className="w-6 h-6 animate-spin text-accent" strokeWidth={1.75} />
            </div>
          ) : filteredInquiries.length === 0 ? (
            <Card className="p-12 text-center border border-dashed border-border rounded-[12px] bg-surface-2/30">
              <Inbox className="w-10 h-10 text-text-muted mx-auto mb-2 opacity-50" strokeWidth={1.75} />
              <h3 className="text-base font-semibold text-text">No Inquiries Found</h3>
              <p className="text-xs text-text-muted mt-1">
                {searchQuery || statusFilter !== 'all'
                  ? 'No inquiries match your current filter parameters.'
                  : 'Get started by creating a new client project inquiry.'}
              </p>
              <Button
                onClick={() => setShowNewInquiryModal(true)}
                className="mt-4 bg-accent hover:bg-accent-hover text-white text-xs rounded-[8px]"
              >
                Submit First Inquiry
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredInquiries.map((inquiry) => {
                const sKey = inquiry.status.toLowerCase();

                return (
                  <Card
                    key={inquiry.id}
                    className="p-5 border border-border bg-surface rounded-[12px] hover:border-accent/40 transition-colors shadow-[var(--shadow-pop)] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[8px] bg-surface-2 border border-border text-xs text-text-muted font-medium w-fit">
                            <span className={`w-1.5 h-1.5 rounded-full ${getInquiryStatusDot(sKey)}`} />
                            <span className="capitalize">{inquiry.status}</span>
                          </div>
                          <h3 className="text-base font-semibold text-text mt-2 line-clamp-1">
                            {inquiry.projectTitle}
                          </h3>
                        </div>
                        {inquiry.budgetRange && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-[8px] bg-surface-2 border border-border text-text flex items-center gap-1 shrink-0">
                            <DollarSign className="w-3 h-3 text-success" strokeWidth={1.75} />
                            {inquiry.budgetRange}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-text-muted line-clamp-2 mb-3">
                        {inquiry.projectDescription}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-xs text-text-muted pt-3 border-t border-border">
                        <div className="flex items-center gap-1.5 truncate">
                          <Building2 className="w-3.5 h-3.5 text-text-muted shrink-0" strokeWidth={1.75} />
                          <span className="font-medium text-text truncate">
                            {inquiry.clientName}
                          </span>
                          {inquiry.companyName && (
                            <span className="text-text-muted truncate">
                              ({inquiry.companyName})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3.5 h-3.5 text-text-muted shrink-0" strokeWidth={1.75} />
                          <span className="truncate">{inquiry.email}</span>
                        </div>
                        {inquiry.desiredDeadline && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-text-muted shrink-0" strokeWidth={1.75} />
                            <span>Due: {new Date(inquiry.desiredDeadline).toLocaleDateString()}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-text-muted shrink-0" strokeWidth={1.75} />
                          <span>Submitted: {new Date(inquiry.submittedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedInquiry(inquiry)}
                        className="text-xs rounded-[8px] h-8"
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
                            className="bg-success hover:bg-success/90 text-white text-xs h-8 rounded-[8px] flex items-center gap-1.5"
                          >
                            <FolderPlus className="w-3.5 h-3.5" strokeWidth={1.75} />
                            Convert to Project
                          </Button>
                        )}
                        {inquiry.status === 'Converted' && inquiry.convertedProjectId && (
                          <span className="text-xs text-success font-medium flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" strokeWidth={1.75} />
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
              <Loader2 className="w-6 h-6 animate-spin text-accent" strokeWidth={1.75} />
            </div>
          ) : filteredClients.length === 0 ? (
            <Card className="p-12 text-center border border-dashed border-border rounded-[12px] bg-surface-2/30">
              <Building2 className="w-10 h-10 text-text-muted mx-auto mb-2 opacity-50" strokeWidth={1.75} />
              <h3 className="text-base font-semibold text-text">No Clients Registered</h3>
              <p className="text-xs text-text-muted mt-1">
                Clients are automatically registered when converting inquiries or can be added manually.
              </p>
              <Button
                onClick={() => setShowNewClientModal(true)}
                className="mt-4 bg-accent hover:bg-accent-hover text-white text-xs rounded-[8px]"
              >
                Add Client
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map((client) => (
                <Card
                  key={client.id}
                  className="p-5 border border-border bg-surface rounded-[12px] hover:border-accent/40 transition-colors shadow-[var(--shadow-pop)] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-base font-semibold text-text">
                          {client.companyName || client.contactName}
                        </h3>
                        {client.companyName && (
                          <p className="text-xs text-text-muted mt-0.5">
                            Contact: {client.contactName}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[8px] bg-surface-2 border border-border text-[11px] text-text-muted font-medium">
                        <span className={`w-1.5 h-1.5 rounded-full ${client.isActive ? 'bg-success' : 'bg-text-muted'}`} />
                        <span>{client.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-text-muted pt-2 border-t border-border">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.75} />
                        <span className="truncate">{client.email}</span>
                      </div>
                      {client.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.75} />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      {client.address && (
                        <div className="text-text-muted/80 truncate">
                          {client.address}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-text-muted">Active Projects:</span>
                    <span className="font-medium text-text px-2 py-0.5 rounded-[8px] bg-surface-2 border border-border tabular-nums">
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
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto p-5 bg-surface border border-border rounded-[12px] shadow-[var(--shadow-pop)]">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-semibold text-text flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent" strokeWidth={1.75} />
                Submit Project Inquiry
              </h2>
              <button
                onClick={() => setShowNewInquiryModal(false)}
                className="text-text-muted hover:text-text text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInquiry} className="space-y-4 mt-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text mb-1">
                    Client Contact Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={inquiryForm.clientName}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, clientName: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    placeholder="e.g. Maya Hansen"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={inquiryForm.companyName}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, companyName: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    placeholder="e.g. Apex Visuals"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text mb-1">Email *</label>
                  <input
                    required
                    type="email"
                    value={inquiryForm.email}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    placeholder="client@studio.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text mb-1">Phone</label>
                  <input
                    type="tel"
                    value={inquiryForm.phone}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, phone: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Project Title *
                </label>
                <input
                  required
                  type="text"
                  value={inquiryForm.projectTitle}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, projectTitle: e.target.value })}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  placeholder="e.g. Futuristic Mech Character Asset Pack"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Project Description & Scope *
                </label>
                <textarea
                  required
                  rows={3}
                  value={inquiryForm.projectDescription}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, projectDescription: e.target.value })}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm resize-none focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  placeholder="Outline required 3D models, art style, polygon target, textures, LODs..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text mb-1">
                    Project Type
                  </label>
                  <select
                    value={inquiryForm.projectType}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, projectType: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  >
                    <option value="Character">Character</option>
                    <option value="Environment">Environment</option>
                    <option value="Prop">Prop / Hard Surface</option>
                    <option value="Animation">Animation</option>
                    <option value="Vfx">VFX</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text mb-1">
                    Budget Range
                  </label>
                  <input
                    type="text"
                    value={inquiryForm.budgetRange}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, budgetRange: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    placeholder="e.g. $10,000 - $20,000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text mb-1">
                    Target Deadline
                  </label>
                  <input
                    type="date"
                    value={inquiryForm.desiredDeadline}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, desiredDeadline: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewInquiryModal(false)}
                  className="rounded-[8px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-[8px] bg-accent hover:bg-accent-hover text-white flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.75} />}
                  Submit Inquiry
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal: Inquiry Detail & Status Update */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 bg-surface border border-border rounded-[12px] shadow-[var(--shadow-pop)]">
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[8px] bg-surface-2 border border-border text-xs text-text-muted font-medium w-fit">
                  <span className={`w-1.5 h-1.5 rounded-full ${getInquiryStatusDot(selectedInquiry.status)}`} />
                  <span className="capitalize">{selectedInquiry.status}</span>
                </div>
                <h2 className="text-lg font-semibold text-text mt-1.5">
                  {selectedInquiry.projectTitle}
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  From {selectedInquiry.clientName}{' '}
                  {selectedInquiry.companyName && `(${selectedInquiry.companyName})`}
                </p>
              </div>
              <button
                onClick={() => setSelectedInquiry(null)}
                className="text-text-muted hover:text-text text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 my-4 text-sm">
              <div>
                <h4 className="text-xs font-semibold text-text uppercase tracking-wider mb-1">
                  Scope & Description
                </h4>
                <p className="text-xs text-text bg-surface-2 p-3 rounded-[8px] border border-border whitespace-pre-wrap">
                  {selectedInquiry.projectDescription}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-surface-2 p-3 rounded-[8px] border border-border">
                <div>
                  <span className="text-text-muted block">Client Email:</span>
                  <span className="font-medium text-text">{selectedInquiry.email}</span>
                </div>
                <div>
                  <span className="text-text-muted block">Phone:</span>
                  <span className="font-medium text-text">
                    {selectedInquiry.phone || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block">Budget Range:</span>
                  <span className="font-medium text-text">
                    {selectedInquiry.budgetRange || 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block">Project Type:</span>
                  <span className="font-medium text-text">
                    {selectedInquiry.projectType || 'Standard'}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block">Target Due Date:</span>
                  <span className="font-medium text-text">
                    {selectedInquiry.desiredDeadline
                      ? new Date(selectedInquiry.desiredDeadline).toLocaleDateString()
                      : 'Flexible'}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block">Submitted:</span>
                  <span className="font-medium text-text">
                    {new Date(selectedInquiry.submittedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Status transition dropdown */}
              <div className="pt-2">
                <label className="block text-xs font-medium text-text mb-1">
                  Update Pipeline Status
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedInquiry.status}
                    onChange={(e) => handleUpdateStatus(selectedInquiry.id, e.target.value)}
                    className="px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm flex-1 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  >
                    <option value="New">New</option>
                    <option value="Reviewed">Reviewed</option>
                    <option value="Converted">Converted</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setSelectedInquiry(null)} className="rounded-[8px]">
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
                  className="rounded-[8px] bg-success hover:bg-success/90 text-white flex items-center gap-1.5"
                >
                  <FolderPlus className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Convert to Project
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Modal: Convert Inquiry to Project */}
      {convertingInquiry && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-5 bg-surface border border-border rounded-[12px] shadow-[var(--shadow-pop)]">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-semibold text-text flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-success" strokeWidth={1.75} />
                Convert Inquiry to Project
              </h2>
              <button
                onClick={() => setConvertingInquiry(null)}
                className="text-text-muted hover:text-text text-sm p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-text-muted mt-2">
              This will automatically create a new Studio Project, establish the Client Profile in the directory, and set the inquiry status to Converted.
            </p>

            <form onSubmit={handleConvertInquiry} className="space-y-4 mt-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Project Name *
                </label>
                <input
                  required
                  type="text"
                  value={convertForm.projectName}
                  onChange={(e) => setConvertForm({ ...convertForm, projectName: e.target.value })}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Initial Project Budget ($) *
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  step="500"
                  value={convertForm.budget}
                  onChange={(e) => setConvertForm({ ...convertForm, budget: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConvertingInquiry(null)}
                  className="rounded-[8px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="rounded-[8px] bg-success hover:bg-success/90 text-white flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.75} />}
                  Confirm Conversion
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal: New Client */}
      {showNewClientModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-5 bg-surface border border-border rounded-[12px] shadow-[var(--shadow-pop)]">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-semibold text-text flex items-center gap-2">
                <Building2 className="w-4 h-4 text-accent" strokeWidth={1.75} />
                Register New Client
              </h2>
              <button
                onClick={() => setShowNewClientModal(false)}
                className="text-text-muted hover:text-text text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4 mt-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Contact Person *
                </label>
                <input
                  required
                  type="text"
                  value={clientForm.contactName}
                  onChange={(e) => setClientForm({ ...clientForm, contactName: e.target.value })}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={clientForm.companyName}
                  onChange={(e) => setClientForm({ ...clientForm, companyName: e.target.value })}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  placeholder="e.g. CineVFX Studios"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">Email *</label>
                <input
                  required
                  type="email"
                  value={clientForm.email}
                  onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  placeholder="john@cinevfx.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">Phone</label>
                <input
                  type="tel"
                  value={clientForm.phone}
                  onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">Address / Location</label>
                <input
                  type="text"
                  value={clientForm.address}
                  onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  placeholder="Los Angeles, CA"
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewClientModal(false)}
                  className="rounded-[8px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="rounded-[8px] bg-accent hover:bg-accent-hover text-white flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.75} />}
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
