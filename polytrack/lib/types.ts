// ============================================================
// Types matching the PolyTrack ASP.NET Core API exactly
// ============================================================

// ── Auth ──────────────────────────────────────────────────────
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string; // "admin" | "project_manager" | "artist" | "reviewer" | "client"
  avatarUrl?: string;
}

// ── Projects ──────────────────────────────────────────────────
// Status values from backend (PascalCase, from C# enum.ToString()):
// "Draft" | "Planning" | "Active" | "Review" | "OnHold" | "Completed" | "Cancelled"
// Priority values: "Low" | "Normal" | "High" | "Critical"

export interface Project {
  id: string;
  name: string;
  projectCode?: string;
  status: string;
  priority: string;
  projectType?: string;
  endDate?: string;
  completionPercent: number;
  clientName?: string;
  projectManagerName?: string;
  taskCount: number;
  createdAt: string;
}

export interface ProjectsResponse {
  data: Project[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProjectDetail extends Omit<Project, 'taskCount'> {
  description?: string;
  startDate?: string;
  budgetAmount?: number;
  currency?: string;
  milestoneCount: number;
  taskCount: number;
  assetCount: number;
  client?: { id: string; name: string; companyName?: string };
  projectManager?: { id: string; name: string; email: string };
  members: ProjectMember[];
  updatedAt: string;
}

export interface ProjectMember {
  userId: string;
  name: string;
  email: string;
  role: string;
  roleInProject?: string;
}

// ── Tasks ─────────────────────────────────────────────────────
// Status values: "New" | "Assigned" | "InProgress" | "Review" | "Approved" | "Rejected" | "Done"
// Priority values: "Low" | "Normal" | "High" | "Critical"

export interface TaskUser {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

export interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  storyPoints?: number;
  dueDate?: string;
  isOverdue: boolean;
  milestoneName?: string;
  assignedTo?: TaskUser;
  createdAt: string;
}

export interface TasksResponse {
  data: Task[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Comment {
  id: string;
  body: string;
  parentCommentId?: string;
  statusChangeTo?: string;
  author: TaskUser;
  createdAt: string;
  updatedAt: string;
}

// ── Kanban ────────────────────────────────────────────────────
// Backend returns: { new: Task[], inProgress: Task[], review: Task[], done: Task[] }
export interface KanbanBoard {
  new: Task[];
  inProgress: Task[];
  review: Task[];
  done: Task[];
}

// Helper shape used by the UI — converted from KanbanBoard
export interface KanbanColumn {
  id: string;
  title: string;
  tasks: Task[];
}

// ── Milestones ────────────────────────────────────────────────
// Status values: "Pending" | "InProgress" | "Completed" | "Rejected"
export interface Milestone {
  id: string;
  projectId?: string;
  name: string;
  description?: string;
  status: string;
  sortOrder: number;
  startDate?: string;
  endDate?: string;
  clientApproved?: boolean;
  clientApprovedAt?: string;
  clientNotes?: string;
  isOverdue?: boolean;
  totalTasks?: number;
  completedTasks?: number;
  completionPercent?: number;
}

// ── Assets ────────────────────────────────────────────────────
// Status values: "Draft" | "Submitted" | "Review" | "Approved" | "Rejected" | "Archived"
// Category values: "Character" | "Environment" | "Prop" | "Texture" | "Material" | "Animation" | "Audio" | "Vfx"

export interface AssetUser {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface Asset {
  id: string;
  name: string;
  category: string;
  status: string;
  thumbnailUrl?: string;
  tags: string[];
  versionCount: number;
  currentVersionFile?: string;
  createdBy?: AssetUser;
  updatedAt: string;
}

export interface AssetsResponse {
  data: Asset[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AssetVersion {
  id: string;
  versionNumber: number;
  fileName: string;
  filePath: string;
  fileExtension?: string;
  fileSizeBytes?: number;
  thumbnailPath?: string;
  notes?: string;
  status: string;
  polygonCount?: number;
  materialCount?: number;
  textureCount?: number;
  uploadedBy?: AssetUser;
  reviewedBy?: AssetUser;
  reviewNotes?: string;
  reviewedAt?: string;
  uploadedAt: string;
}

export interface AssetDetail extends Omit<Asset, 'versionCount' | 'currentVersionFile'> {
  description?: string;
  projectId: string;
  projectName: string;
  linkedTaskId?: string;
  currentVersion?: AssetVersion;
  versions: AssetVersion[];
  createdAt: string;
}

// ── Dashboard ─────────────────────────────────────────────────
// These top-level stat fields ARE returned directly (not wrapped in `data`)
export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  delayedProjects: number;
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  reviewTasks: number;
  completedTasks: number;
  overdueTasks: number;
  totalAssets: number;
  approvedAssets: number;
  draftAssets: number;
  pendingReviewAssets: number;
  totalUsers: number;
  activeUsers: number;
  totalHoursThisWeek: number;
  totalHoursThisMonth: number;
}

// Activity feed — returned as a PLAIN ARRAY, not { data: [...] }
export interface Activity {
  id: string;
  action: string;
  description: string;
  entityType: string;
  entityId: string;
  projectId?: string;
  projectName?: string;
  actorName?: string;
  actorAvatar?: string;
  createdAt: string;
}

// Projects progress — returned as a PLAIN ARRAY
export interface ProjectProgress {
  id: string;
  name: string;
  projectCode?: string;
  status: string;
  priority: string;
  completionPercent: number;
  endDate?: string;
  isOverdue: boolean;
  totalTasks: number;
  completedTasks: number;
  projectManagerName?: string;
}

// Upcoming deadlines — returned as a PLAIN ARRAY
export interface Deadline {
  id: string;
  title: string;
  type: 'task' | 'milestone';
  dueDate: string;
  daysRemaining: number;
  projectName?: string;
  assigneeName?: string;
}

// ── Team Workload ─────────────────────────────────────────────
// Returned as a PLAIN ARRAY
export interface UserWorkload {
  userId: string;
  name: string;
  avatarUrl?: string;
  assignedTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  hoursThisWeek: number;
  quotaHoursPerDay?: number;
  quotaTasksPerWeek?: number;
  quotaCompletionPercent: number;
}


// ── Inquiries & Client Portal ─────────────────────────────────
export interface ProjectInquiry {
  id: string;
  clientName: string;
  companyName?: string;
  email: string;
  phone?: string;
  projectTitle: string;
  projectDescription: string;
  projectType?: string;
  budgetRange?: string;
  status: string; // "New" | "Reviewed" | "Converted" | "Rejected"
  desiredDeadline?: string;
  additionalNotes?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  convertedProjectId?: string;
  submittedAt: string;
  attachments?: InquiryAttachment[];
}

export interface InquiryAttachment {
  id: string;
  fileName: string;
  fileSizeBytes?: number;
  mimeType?: string;
  uploadedAt: string;
}

export interface ClientProfile {
  id: string;
  contactName: string;
  companyName?: string;
  email: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  activeProjectsCount?: number;
  totalProjectsCount?: number;
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  fileName: string;
  fileSizeBytes?: number;
  mimeType?: string;
  uploadedAt: string;
  uploadedBy?: TaskUser;
}