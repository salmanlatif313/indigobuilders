import { storage } from './services/storage';
import { files } from './services/files';

const BASE = '/api';

function getToken(): string | null {
  return storage.get('ib_token');
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    storage.remove('ib_token');
    storage.remove('ib_user');
    window.dispatchEvent(new CustomEvent('auth:expired'));
    throw new Error('Unauthorized');
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Server error (${res.status}) — API returned non-JSON response. Check that the server is running.`);
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<{ token: string; user: AppUser }>('POST', '/auth/login', { username, password }),
  me: () => request<{ user: AppUser }>('GET', '/auth/me'),
  getRoles: () => request<{ roles: Role[] }>('GET', '/auth/roles'),
  getUsers: () => request<{ users: UserRow[]; count: number }>('GET', '/auth/users'),
  createUser: (data: CreateUserInput) => request<{ message: string }>('POST', '/auth/users', data),
  updateUser: (id: number, data: UserUpdateInput) => request<{ message: string }>('PUT', `/auth/users/${id}`, data),

  // Dashboard
  getDashboard: () => request<DashboardData>('GET', '/dashboard'),

  // Projects
  getProjects: () => request<{ projects: Project[]; count: number }>('GET', '/projects'),
  getProject: (id: number) => request<{ project: Project }>('GET', `/projects/${id}`),
  createProject: (data: Partial<Project>) => request<{ message: string; projectId: number }>('POST', '/projects', data),
  updateProject: (id: number, data: Partial<Project>) => request<{ message: string }>('PUT', `/projects/${id}`, data),
  deleteProject: (id: number) => request<{ message: string }>('DELETE', `/projects/${id}`),

  // Labor
  getLabor: (params?: { active?: boolean; projectId?: number }) => {
    const qs = new URLSearchParams();
    if (params?.active !== undefined) qs.set('active', String(params.active));
    if (params?.projectId) qs.set('projectId', String(params.projectId));
    return request<{ labor: Labor[]; count: number }>('GET', `/labor?${qs}`);
  },
  getLaborById: (id: number) => request<{ labor: Labor }>('GET', `/labor/${id}`),
  createLabor: (data: Partial<Labor>) => request<{ message: string; laborId: number }>('POST', '/labor', data),
  updateLabor: (id: number, data: Partial<Labor>) => request<{ message: string }>('PUT', `/labor/${id}`, data),
  deleteLabor: (id: number) => request<{ message: string }>('DELETE', `/labor/${id}`),
  downloadWPS: (month: string) => {
    const token = getToken();
    fetch(`${BASE}/labor/wps/generate?month=${month}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => files.download(blob, `WPS_${month}_IndigoBuilders.sif`));
  },

  // WPS Payroll
  getWPSRuns: () => request<{ runs: WPSRun[]; count: number }>('GET', '/wps'),
  getWPSLines: (id: number) => request<{ lines: WPSLine[]; count: number }>('GET', `/wps/${id}/lines`),
  createWPSRun: (payrollMonth: string) => request<{ message: string; runId: number; totalLabor: number; totalAmount: number }>('POST', '/wps', { payrollMonth }),
  updateWPSStatus: (id: number, status: string) => request<{ message: string }>('PUT', `/wps/${id}/status`, { status }),
  updateWPSLine: (runId: number, lineId: number, deductions: number) =>
    request<{ message: string; netSalary: number }>('PUT', `/wps/${runId}/lines/${lineId}`, { deductions }),
  deleteWPSRun: (id: number) => request<{ message: string }>('DELETE', `/wps/${id}`),
  downloadSIF: (id: number, fileName: string) => {
    const token = getToken();
    fetch(`${BASE}/wps/${id}/sif`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => files.download(blob, fileName));
  },

  // Compliance
  getCompliance: () => request<ComplianceData>('GET', '/compliance'),

  // Project financials
  getProjectFinancials: (id: number) => request<ProjectFinancials>('GET', `/projects/${id}/financials`),

  // Password
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('PUT', '/auth/me/password', { currentPassword, newPassword }),
  resetUserPassword: (userId: number, newPassword: string) =>
    request<{ message: string }>('PUT', `/auth/users/${userId}/reset-password`, { newPassword }),

  // Expenses
  getExpenses: (params?: { projectId?: number; category?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.projectId) qs.set('projectId', String(params.projectId));
    if (params?.category)  qs.set('category', params.category);
    if (params?.from)      qs.set('from', params.from);
    if (params?.to)        qs.set('to', params.to);
    return request<{ expenses: Expense[]; count: number; total: number }>('GET', `/expenses?${qs}`);
  },
  createExpense: (data: ExpenseInput) => request<{ message: string; expenseId: number }>('POST', '/expenses', data),
  updateExpense: (id: number, data: ExpenseInput) => request<{ message: string }>('PUT', `/expenses/${id}`, data),
  deleteExpense: (id: number) => request<{ message: string }>('DELETE', `/expenses/${id}`),

  // Reports
  getGosiReport: (month: string) => request<GosiReport>('GET', `/reports/gosi?month=${month}`),
  getInvoiceAging: () => request<InvoiceAgingReport>('GET', '/reports/invoice-aging'),
  getLaborByProject: () => request<LaborByProjectReport>('GET', '/reports/labor-by-project'),

  // Payments
  getPayments: (invoiceId?: number) => {
    const qs = invoiceId ? `?invoiceId=${invoiceId}` : '';
    return request<{ payments: Payment[]; count: number; total: number }>('GET', `/payments${qs}`);
  },
  createPayment: (data: PaymentInput) => request<{ message: string; paymentId: number }>('POST', '/payments', data),
  deletePayment: (id: number) => request<{ message: string }>('DELETE', `/payments/${id}`),

  // Labor CSV import
  importLabor: (file: File) => {
    const token = getToken();
    const fd = new FormData();
    fd.append('file', file);
    return fetch(`${BASE}/labor/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token ?? ''}` },
      body: fd,
    }).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Import failed');
      return data as { message: string; inserted: number; skipped: { row: number; reason: string }[] };
    });
  },

  // Purchase Orders
  getPurchaseOrders: (params?: { projectId?: number; status?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.projectId) qs.set('projectId', String(params.projectId));
    if (params?.status)    qs.set('status', params.status);
    if (params?.from)      qs.set('from', params.from);
    if (params?.to)        qs.set('to', params.to);
    return request<{ purchaseOrders: PurchaseOrder[]; count: number }>('GET', `/purchase-orders?${qs}`);
  },
  getPurchaseOrder: (id: number) =>
    request<{ purchaseOrder: PurchaseOrder; items: POItem[] }>('GET', `/purchase-orders/${id}`),
  createPurchaseOrder: (data: CreatePOInput) =>
    request<{ message: string; poId: number; poNumber: string }>('POST', '/purchase-orders', data),
  updatePurchaseOrder: (id: number, data: Partial<CreatePOInput>) =>
    request<{ message: string }>('PUT', `/purchase-orders/${id}`, data),
  submitPurchaseOrder: (id: number) =>
    request<{ message: string; emailsSent: number }>('PUT', `/purchase-orders/${id}/submit`, {}),
  updatePOStatus: (id: number, status: string) =>
    request<{ message: string }>('PUT', `/purchase-orders/${id}/status`, { status }),
  deletePurchaseOrder: (id: number) =>
    request<{ message: string }>('DELETE', `/purchase-orders/${id}`),

  // Invoices
  getInvoices: (params?: { projectId?: number; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.projectId) qs.set('projectId', String(params.projectId));
    if (params?.status) qs.set('status', params.status);
    return request<{ invoices: Invoice[]; count: number }>('GET', `/invoices?${qs}`);
  },
  getInvoice: (id: number) => request<{ invoice: Invoice; items: InvoiceItem[] }>('GET', `/invoices/${id}`),
  createInvoice: (data: CreateInvoiceInput) => request<{ message: string; invoiceId: number; zatcaUUID: string }>('POST', '/invoices', data),
  updateInvoiceStatus: (id: number, status: string) => request<{ message: string }>('PUT', `/invoices/${id}/status`, { status }),
  deleteInvoice: (id: number) => request<{ message: string }>('DELETE', `/invoices/${id}`),
};

// Types
export interface AppUser {
  userId: number; username: string; fullName: string; email: string; roleId: number; roleName: string;
}
export interface Role { RoleID: number; RoleName: string; }
export interface UserRow { UserID: number; Username: string; FullName: string; Email: string; RoleID: number; RoleName: string; IsActive: boolean; }
export interface UserUpdateInput { fullName?: string; email?: string; roleId?: number; isActive?: boolean; }
export interface CreateUserInput { username: string; password: string; fullName: string; email: string; roleId: number; }

export interface Project {
  ProjectID?: number; ProjectCode: string; ProjectName: string; ClientName: string;
  ContractValue: number; StartDate: string; EndDate: string; Status: string;
  Location: string; ManagerUserID: number; ManagerName: string;
  ActiveLabor: number; InvoiceCount: number; TotalInvoiced: number;
  TotalExpenses: number; Notes: string;
}

export interface Labor {
  LaborID?: number; IqamaNumber: string; FullName: string; FullNameAr: string;
  NationalityCode: string; IBAN: string; BankCode: string;
  BasicSalary: number; HousingAllowance: number; TransportAllowance: number;
  OtherAllowances: number; GrossSalary: number; GOSINumber: string;
  JobTitle: string; ProjectID: number; ProjectName: string; IqamaExpiry: string; IsActive: boolean;
}

export interface Invoice {
  InvoiceID?: number; InvoiceNumber: string; InvoiceType: string; ProjectID: number;
  ClientName: string; ClientVAT: string; ClientAddress: string;
  InvoiceDate: string; SupplyDate: string; DueDate: string;
  SubTotal: number; VATRate: number; VATAmount: number;
  RetentionRate: number; RetentionAmount: number; TotalAmount: number;
  TotalPaid: number; BalanceDue: number;
  ZatcaStatus: string; ZatcaUUID: string; ZatcaQRCode: string;
  ProjectName: string; ProjectCode: string; Notes: string;
}

export interface Payment {
  PaymentID: number; InvoiceID: number; InvoiceNumber: string;
  PaymentDate: string; Amount: number; PaymentMethod: string;
  Reference: string; Notes: string; ChangedBy: string; ChangeDate: string;
}

export interface PaymentInput {
  invoiceId: number; paymentDate: string; amount: number;
  paymentMethod?: string; reference?: string; notes?: string;
}

export const PAYMENT_METHODS = ['BankTransfer', 'Cheque', 'Cash', 'Online'];

export interface InvoiceItem {
  ItemID?: number; InvoiceID?: number; Description: string;
  Quantity: number; UnitPrice: number; Discount: number; VATRate: number; LineTotal: number;
}

export interface CreateInvoiceInput {
  invoiceNumber: string; invoiceType?: string; projectID?: number; clientName: string;
  clientVAT?: string; clientAddress?: string; invoiceDate: string; supplyDate?: string;
  dueDate?: string; vatRate?: number; retentionRate?: number; notes?: string;
  items: Omit<InvoiceItem, 'ItemID' | 'InvoiceID' | 'LineTotal'>[];
}

export interface WPSRun {
  RunID: number; PayrollMonth: string; GeneratedDate: string; GeneratedBy: string;
  SIFFileName: string; TotalLabor: number; TotalAmount: number; Status: string; Notes: string;
}

export interface WPSLine {
  LineID: number; LaborID: number; FullName: string; IqamaNumber: string; IBAN: string;
  BasicSalary: number; HousingAllowance: number; TransportAllowance: number;
  OtherAllowances: number; Deductions: number; NetSalary: number; WorkingDays: number;
}

export interface DashboardData {
  summary: {
    projects:       { TotalProjects: number; ActiveProjects: number };
    labor:          { TotalLabor: number; ActiveLabor: number };
    invoices:       { TotalInvoices: number; TotalValue: number; DraftCount: number; ClearedCount: number };
    purchaseOrders: { TotalPOs: number; TotalValue: number; PendingCount: number; ApprovedCount: number; DraftCount: number };
  };
  recentInvoices: { InvoiceNumber: string; ClientName: string; TotalAmount: number; ZatcaStatus: string; InvoiceDate: string }[];
  recentProjects: { ProjectCode: string; ProjectName: string; Status: string; ChangeDate: string }[];
  recentPOs:      { PONumber: string; VendorName: string; TotalAmount: number; Status: string; OrderDate: string; ProjectCode: string }[];
  iqamaAlerts: { LaborID: number; FullName: string; IqamaNumber: string; IqamaExpiry: string; DaysLeft: number; ProjectName: string }[];
  activity: { Module: string; Description: string; ChangedBy: string; ChangeDate: string }[];
}

export interface Expense {
  ExpenseID?: number; ProjectID?: number; ProjectCode: string; ProjectName: string;
  ExpenseDate: string; Category: string; Description: string;
  Amount: number; VATAmount: number; Vendor: string; ReferenceNo: string; Notes: string;
  ChangedBy: string; ChangeDate: string;
}

export interface ExpenseInput {
  projectID?: number; expenseDate: string; category: string; description: string;
  amount: number; vatAmount?: number; vendor?: string; referenceNo?: string; notes?: string;
}

export const EXPENSE_CATEGORIES = ['Materials', 'Equipment', 'Subcontractor', 'Labor', 'Transport', 'Other'];

export interface PurchaseOrder {
  PurchaseOrderID?: number; PONumber: string; ProjectID: number | null;
  ProjectCode: string; ProjectName: string;
  VendorName: string; VendorEmail: string; VendorPhone: string;
  VendorVAT: string; VendorAddress: string;
  OrderDate: string; ExpectedDeliveryDate: string; DeliveryAddress: string;
  SubTotal: number; VATRate: number; VATAmount: number;
  ShippingCost: number; TotalAmount: number;
  Status: string; PaymentTerms: string;
  ApprovedBy: string; ApprovedDate: string; Notes: string;
  ChangedBy: string; ChangeDate: string;
}

export interface POItem {
  LineID?: number; PurchaseOrderID?: number;
  Description: string; Quantity: number; UnitPrice: number;
  Discount: number; VATRate: number; LineTotal: number;
}

export interface CreatePOInput {
  poNumber: string; projectID?: number;
  vendorName: string; vendorEmail?: string; vendorPhone?: string;
  vendorVAT?: string; vendorAddress?: string;
  orderDate: string; expectedDeliveryDate?: string; deliveryAddress?: string;
  vatRate?: number; shippingCost?: number; paymentTerms?: string; notes?: string;
  items: { description: string; quantity: number; unitPrice: number; discount?: number; vatRate?: number }[];
}

export const PO_STATUSES = ['Draft', 'PendingApproval', 'Approved', 'Delivered', 'Cancelled', 'Rejected'];

export interface GosiRow {
  LaborID: number; IqamaNumber: string; FullName: string; FullNameAr: string;
  NationalityCode: string; JobTitle: string; BasicSalary: number;
  EmployeeContribution: number; EmployerContribution: number; TotalContribution: number;
}
export interface GosiReport {
  month: string;
  rows: GosiRow[];
  totals: { basic: number; employee: number; employer: number; total: number };
  count: number;
}

export interface AgingRow {
  InvoiceID: number; InvoiceNumber: string; ClientName: string;
  ProjectName: string; ProjectCode: string;
  InvoiceDate: string; DueDate: string; TotalAmount: number;
  ZatcaStatus: string; DaysOverdue: number; AgingBucket: string;
}
export interface InvoiceAgingReport {
  rows: AgingRow[];
  buckets: Record<string, { count: number; amount: number }>;
  totalOutstanding: number;
  count: number;
}

export interface LaborProjectRow {
  ProjectID: number | null; ProjectCode: string; ProjectName: string;
  HeadCount: number; TotalBasic: number; TotalGross: number;
  SaudiCount: number; NonSaudiCount: number;
}
export interface ComplianceData {
  totalAlerts: number;
  iqamaExpired:    { LaborID: number; FullName: string; IqamaNumber: string; IqamaExpiry: string; DaysLeft: number; ProjectName: string }[];
  iqamaExpiring:   { LaborID: number; FullName: string; IqamaNumber: string; IqamaExpiry: string; DaysLeft: number; ProjectName: string; NationalityCode: string }[];
  missingIBAN:     { LaborID: number; FullName: string; IqamaNumber: string; ProjectName: string }[];
  missingGOSI:     { LaborID: number; FullName: string; IqamaNumber: string; ProjectName: string }[];
  wpsDraft:        { RunID: number; PayrollMonth: string; TotalLabor: number; TotalAmount: number; GeneratedDate: string }[];
  overdueInvoices: { InvoiceID: number; InvoiceNumber: string; ClientName: string; TotalAmount: number; DueDate: string; DaysOverdue: number; ProjectCode: string }[];
}

export interface ProjectFinancials {
  summary: {
    contractValue: number; totalInvoiced: number; totalCollected: number;
    totalExpenses: number; remaining: number; grossMargin: number;
    invoicedPct: number; expensePct: number; monthlyLabor: number; headCount: number;
  };
  invoiceBreakdown: { ZatcaStatus: string; Count: number; Amount: number }[];
  expenseBreakdown: { Category: string; Total: number }[];
  recentExpenses:   { ExpenseDate: string; Category: string; Description: string; Amount: number; VATAmount: number; Vendor: string }[];
  recentInvoices:   { InvoiceNumber: string; TotalAmount: number; ZatcaStatus: string; InvoiceDate: string }[];
}

export interface LaborByProjectReport {
  rows: LaborProjectRow[];
  totals: { headCount: number; totalBasic: number; totalGross: number; saudiCount: number; nonSaudiCount: number };
  count: number;
}
