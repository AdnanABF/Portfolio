export interface Skill {
  id?: string;
  name: string;
  /** Free text, as in the CV ("Languages", ".NET & Backend", ...). Skills are grouped by it. */
  category: string;
}

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  period: string;
  location?: string;
  description: string[];
  tech: string[];
}

export interface EducationItem {
  id: string;
  institution: string;
  qualification: string;
  location: string;
  period: string;
  details: string[];
}

export interface CertificationItem {
  id: string;
  title: string;
  issuer: string;
  issuedOn: string;
  credentialUrl: string;
}

// ---- Home page admin (the editable lists, as the API sends them to admins) -------------------

export interface AdminSkill {
  id: string;
  category: string;
  name: string;
  iconName?: string | null;
  sortOrder: number;
  isVisible: boolean;
}

export interface AdminExperience {
  id: string;
  role: string;
  company: string;
  location: string;
  period: string;
  achievements: string[];
  sortOrder: number;
  isVisible: boolean;
}

export interface AdminEducation {
  id: string;
  institution: string;
  qualification: string;
  location: string;
  period: string;
  details: string[];
  sortOrder: number;
  isVisible: boolean;
}

export interface AdminCertification {
  id: string;
  title: string;
  issuer: string;
  issuedOn: string;
  credentialUrl: string;
  sortOrder: number;
  isVisible: boolean;
}

export interface AdminProject {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  heroImageUrl: string;
  tags: string[];
  screenshots: string[];
  liveUrl: string;
  githubUrl: string;
  isFeatured: boolean;
  isPublished: boolean;
  isRepoPrivate: boolean;
  sortOrder: number;
  keyMetricsJson?: string | null;
  contentMarkdown: string;
  updatedAt: string;
}

export interface ProjectItem {
  id: string;
  /** URL key for /projects/[slug] */
  slug: string;
  title: string;
  description: string;
  techStack: string[];
  githubUrl?: string;
  liveUrl?: string;
  imageUrl: string;
  isPrivate?: boolean;
  isPublished?: boolean;
  /** A short label such as "Ongoing, 2025", taken from the bold first line of the project's details text. */
  badge?: string;
}

export interface PostItem {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
}

// ---- Admin inbox ----------------------------------------------------------

/** unread, read, replied or archived. Replied implies read; archived is hidden from the default view. */
export type InquiryStatus = "unread" | "read" | "replied" | "archived";

/** "contact" for a normal message, "repo_request" for a request for access to a private repository. */
export type InquiryType = "contact" | "repo_request";

export interface InquiryItem {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: InquiryStatus;
  type: InquiryType;
  projectId?: string | null;
  projectTitle?: string | null;
  projectSlug?: string | null;
  createdAt: string;
}

export interface InquiryPage {
  items: InquiryItem[];
  /** Messages matching the filters, across all pages. */
  totalCount: number;
  page: number;
  pageSize: number;
  /** All unread messages, whatever the filters are. */
  unreadCount: number;
}

export interface InquiryQuery {
  search?: string;
  /** Empty means everything except archived. */
  status?: string;
  type?: string;
  /** ISO instants: from is inclusive, to is exclusive. */
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

// ---- Admin activity and system logs ---------------------------------------------------------

export interface ActivityLogItem {
  id: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
  detailsJson?: string;
  ipAddress?: string;
  deviceInfo?: string;
  timestamp: string;
}

export interface ActivityLogPage {
  items: ActivityLogItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  /** Every action / entity type in the log (ignores filters), for the filter dropdowns. */
  actions: string[];
  entityTypes: string[];
}

export interface SystemLogItem {
  id: string;
  level: string;
  message: string;
  exception?: string;
  stackTrace?: string;
  path?: string;
  httpMethod?: string;
  statusCode?: number;
  ipAddress?: string;
  timestamp: string;
}

export interface SystemLogPage {
  items: SystemLogItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  /** Totals per level across all logs (ignore filters). */
  errorCount: number;
  warningCount: number;
  informationCount: number;
}

export interface LogQuery {
  search?: string;
  /** ISO instants: from is inclusive, to is exclusive. */
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface ActivityLogQuery extends LogQuery {
  action?: string;
  entityType?: string;
}

export interface SystemLogQuery extends LogQuery {
  level?: string;
}

// ---- Members (admin users panel) -----------------------------------------------------------------

export type MemberRole = "SuperAdmin" | "Admin" | "Member";
export type MemberStatus = "active" | "pending" | "inactive" | "deleted";

export interface MemberItem {
  id: string;
  fullName: string;
  email: string;
  userName: string;
  role: MemberRole;
  status: MemberStatus;
  /** The owner account. It cannot be changed, turned off or deleted. */
  isSuperAdmin: boolean;
  emailConfirmed: boolean;
  /** False when the member is turned off. */
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  lastLoginMethod: string | null;
  lastLoginIp: string | null;
  deletedAt: string | null;
  /** Sessions that are signed in right now. */
  activeSessions: number;
}

/** Counts for the whole user table. They ignore the list's search and filters. */
export interface MemberStats {
  /** Everyone who is not soft-deleted. */
  totalUsers: number;
  active: number;
  pending: number;
  inactive: number;
  deleted: number;
  admins: number;
  members: number;
  loggedInLast30Days: number;
}

export interface MemberPage {
  items: MemberItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  stats: MemberStats;
}

export interface MemberQuery {
  search?: string;
  role?: string;
  /** Empty means everyone except deleted members. */
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface MemberFormValues {
  fullName: string;
  email: string;
  /** Admin or Member: SuperAdmin cannot be assigned. */
  role: "Admin" | "Member";
}

/** Result of creating or editing a member: emailSent is false when the invite or verification email failed. */
export interface MemberActionResult {
  member: MemberItem;
  emailSent: boolean;
}

export interface SessionItem {
  id: string;
  userId: string;
  userEmail: string;
  loginMethod: string;
  deviceInfo: string;
  ipAddress: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  isOnline: boolean;
  isRevoked: boolean;
  isCurrent: boolean;
}
