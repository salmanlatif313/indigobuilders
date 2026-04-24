import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

const FROM = {
  email: process.env.SENDGRID_FROM_EMAIL || 'erp@indigobuilders.sa',
  name:  process.env.SENDGRID_FROM_NAME  || 'IndigoBuilders ERP',
};

export async function sendPOApprovalEmail(opts: {
  to: string;
  approverName: string;
  poNumber: string;
  vendorName: string;
  totalAmount: number;
  projectName: string;
  submittedBy: string;
  approveUrl: string;
  rejectUrl: string;
}): Promise<void> {
  const total = Number(opts.totalAmount).toLocaleString('en-SA', { minimumFractionDigits: 2 });

  const html = `
<!DOCTYPE html>
<html dir="ltr" lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body { font-family: Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 20px; }
  .card { background: #fff; border-radius: 8px; max-width: 560px; margin: 0 auto; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
  .header { background: #0c2f5c; padding: 24px 32px; }
  .header h1 { color: #fff; margin: 0; font-size: 20px; }
  .header p  { color: #c19f3c; margin: 4px 0 0; font-size: 14px; }
  .body { padding: 32px; }
  .body h2 { font-size: 16px; color: #0c2f5c; margin: 0 0 16px; }
  .detail { background: #f8fafc; border-radius: 6px; padding: 16px; margin-bottom: 24px; }
  .detail table { width: 100%; border-collapse: collapse; }
  .detail td { padding: 6px 0; font-size: 14px; color: #374151; }
  .detail td:first-child { color: #6b7280; width: 140px; }
  .actions { display: flex; gap: 12px; margin-bottom: 24px; }
  .btn-approve { background: #059669; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 15px; font-weight: 600; display: inline-block; }
  .btn-reject  { background: #dc2626; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 15px; font-weight: 600; display: inline-block; }
  .footer { border-top: 1px solid #e5e7eb; padding: 20px 32px; font-size: 12px; color: #9ca3af; }
</style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Purchase Order Approval Required</h1>
      <p>IndigoBuilders ERP</p>
    </div>
    <div class="body">
      <h2>Hi ${opts.approverName},</h2>
      <p style="color:#374151;font-size:14px;margin:0 0 20px">
        <strong>${opts.submittedBy}</strong> has submitted a purchase order for your approval.
      </p>
      <div class="detail">
        <table>
          <tr><td>PO Number</td><td><strong>${opts.poNumber}</strong></td></tr>
          <tr><td>Vendor</td><td>${opts.vendorName}</td></tr>
          <tr><td>Project</td><td>${opts.projectName || '—'}</td></tr>
          <tr><td>Total Amount</td><td><strong>SAR ${total}</strong></td></tr>
        </table>
      </div>
      <div class="actions">
        <a href="${opts.approveUrl}" class="btn-approve">✓ Approve</a>
        <a href="${opts.rejectUrl}"  class="btn-reject">✗ Reject</a>
      </div>
      <p style="font-size:12px;color:#6b7280">
        These links expire in 7 days. Log into the ERP to view full details.
      </p>
    </div>
    <div class="footer">IndigoBuilders Company · IndigoBuilders ERP</div>
  </div>
</body>
</html>`;

  await sgMail.send({
    to:      opts.to,
    from:    FROM,
    subject: `[Action Required] PO ${opts.poNumber} — Approval Needed`,
    html,
  });
}

export async function sendPOStatusEmail(opts: {
  to: string;
  vendorName: string;
  poNumber: string;
  status: 'Approved' | 'Rejected';
  notes?: string;
}): Promise<void> {
  const color  = opts.status === 'Approved' ? '#059669' : '#dc2626';
  const label  = opts.status === 'Approved' ? 'Approved ✓' : 'Rejected ✗';

  const html = `
<!DOCTYPE html>
<html dir="ltr" lang="en">
<head><meta charset="UTF-8"/>
<style>
  body { font-family: Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 20px; }
  .card { background: #fff; border-radius: 8px; max-width: 520px; margin: 0 auto; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
  .header { background: #0c2f5c; padding: 24px 32px; }
  .header h1 { color: #fff; margin: 0; font-size: 20px; }
  .body { padding: 32px; }
  .status { display: inline-block; background: ${color}; color: #fff; border-radius: 4px; padding: 6px 16px; font-weight: 700; font-size: 15px; margin-bottom: 20px; }
  .footer { border-top: 1px solid #e5e7eb; padding: 20px 32px; font-size: 12px; color: #9ca3af; }
</style>
</head>
<body>
  <div class="card">
    <div class="header"><h1>Purchase Order Update</h1></div>
    <div class="body">
      <p style="font-size:14px;color:#374151;margin:0 0 16px">
        Purchase Order <strong>${opts.poNumber}</strong> has been updated.
      </p>
      <div class="status">${label}</div>
      ${opts.notes ? `<p style="font-size:14px;color:#374151;margin:16px 0 0"><strong>Notes:</strong> ${opts.notes}</p>` : ''}
    </div>
    <div class="footer">IndigoBuilders Company · IndigoBuilders ERP</div>
  </div>
</body>
</html>`;

  await sgMail.send({
    to:      opts.to,
    from:    FROM,
    subject: `PO ${opts.poNumber} — ${opts.status}`,
    html,
  });
}
