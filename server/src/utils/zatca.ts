/**
 * ZATCA Phase 2 — UBL 2.1 XML Generator + TLV QR Code
 *
 * Generates a Saudi-compliant e-invoice XML per:
 *   - UBL 2.1 standard
 *   - ZATCA Technical Specifications v3.2
 *   - EN 16931 Core Invoice Model
 *
 * The XML is stored in Invoices.ZatcaXML and can be submitted to
 * the ZATCA sandbox/production clearance API.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ZatcaInvoice {
  invoiceNumber: string;
  zatcaUUID: string;
  invoiceType: string;   // 'Standard' | 'CreditNote' | 'DebitNote'
  invoiceDate: string;   // YYYY-MM-DD
  supplyDate?: string;
  clientName: string;
  clientVAT?: string;
  clientAddress?: string;
  subTotal: number;
  vatRate: number;
  vatAmount: number;
  retentionAmount: number;
  totalAmount: number;
  notes?: string;
  previousInvoiceHash?: string;   // PIH — hash of previous invoice
  invoiceCounterValue?: number;   // ICV — sequential counter
}

export interface ZatcaItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  vatRate: number;
  lineTotal: number;
}

// ---------------------------------------------------------------------------
// Constants — Indigo Builders seller identity
// (These should come from env / DB in a production system)
// ---------------------------------------------------------------------------

const SELLER_NAME    = 'Indigo Builders Company';
const SELLER_NAME_AR = 'شركة إنديغو بيلدرز';
const SELLER_VAT     = process.env.ZATCA_VAT_NUMBER  || '311234567890003';
const SELLER_CR      = process.env.ZATCA_CR_NUMBER   || '1010000000';
const SELLER_ADDRESS = process.env.ZATCA_ADDRESS     || 'Riyadh, Kingdom of Saudi Arabia';
const SELLER_CITY    = process.env.ZATCA_CITY        || 'Riyadh';
const SELLER_ZIP     = process.env.ZATCA_ZIP         || '12345';
const SELLER_COUNTRY = 'SA';

// Invoice type codes (UBL / ZATCA)
const INVOICE_TYPE_CODE: Record<string, string> = {
  Standard:   '388',
  CreditNote: '381',
  DebitNote:  '383',
};

// ---------------------------------------------------------------------------
// Helper — XML-safe string
// ---------------------------------------------------------------------------
function x(v: string | undefined | null): string {
  if (!v) return '';
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function fmt(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

function isoDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

// ---------------------------------------------------------------------------
// UBL 2.1 XML Generator
// ---------------------------------------------------------------------------
export function generateUBL21(invoice: ZatcaInvoice, items: ZatcaItem[]): string {
  const typeCode  = INVOICE_TYPE_CODE[invoice.invoiceType] || '388';
  const issueDate = invoice.invoiceDate.slice(0, 10);
  const issueTime = isoDateTime(invoice.invoiceDate).slice(11, 19);
  const supplyDate = invoice.supplyDate?.slice(0, 10) || issueDate;
  const icv = invoice.invoiceCounterValue ?? 1;
  const pih = invoice.previousInvoiceHash || 'NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjYTN...'; // first invoice default

  // Line items
  const lineXML = items.map((item, idx) => {
    const lineVat = item.lineTotal * (item.vatRate / 100);
    return `
    <cac:InvoiceLine>
      <cbc:ID>${idx + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="PCE">${fmt(item.quantity, 4)}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="SAR">${fmt(item.lineTotal)}</cbc:LineExtensionAmount>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="SAR">${fmt(lineVat)}</cbc:TaxAmount>
        <cbc:RoundingAmount currencyID="SAR">${fmt(item.lineTotal + lineVat)}</cbc:RoundingAmount>
      </cac:TaxTotal>
      <cac:Item>
        <cbc:Name>${x(item.description)}</cbc:Name>
        <cac:ClassifiedTaxCategory>
          <cbc:ID>S</cbc:ID>
          <cbc:Percent>${fmt(item.vatRate)}</cbc:Percent>
          <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
        </cac:ClassifiedTaxCategory>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="SAR">${fmt(item.unitPrice)}</cbc:PriceAmount>
        ${item.discount > 0 ? `<cac:AllowanceCharge>
          <cbc:ChargeIndicator>false</cbc:ChargeIndicator>
          <cbc:Amount currencyID="SAR">${fmt(item.discount)}</cbc:Amount>
        </cac:AllowanceCharge>` : ''}
      </cac:Price>
    </cac:InvoiceLine>`;
  }).join('');

  // Retention as allowance on document level
  const retentionXML = invoice.retentionAmount > 0 ? `
  <cac:AllowanceCharge>
    <cbc:ChargeIndicator>false</cbc:ChargeIndicator>
    <cbc:AllowanceChargeReasonCode>95</cbc:AllowanceChargeReasonCode>
    <cbc:AllowanceChargeReason>Retention</cbc:AllowanceChargeReason>
    <cbc:Amount currencyID="SAR">${fmt(invoice.retentionAmount)}</cbc:Amount>
  </cac:AllowanceCharge>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">

  <!-- ZATCA Extension placeholder (signature added by ZATCA SDK before clearance) -->
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionURI>urn:oasis:names:specification:ubl:dsig:enveloped:xades</ext:ExtensionURI>
      <ext:ExtensionContent/>
    </ext:UBLExtension>
  </ext:UBLExtensions>

  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_1.2</cbc:CustomizationID>
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${x(invoice.invoiceNumber)}</cbc:ID>
  <cbc:UUID>${x(invoice.zatcaUUID)}</cbc:UUID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${issueTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="${typeCode === '388' ? '0100000' : '0200000'}">${typeCode}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>
  ${invoice.notes ? `<cbc:Note>${x(invoice.notes)}</cbc:Note>` : ''}

  <!-- ICV — Invoice Counter Value -->
  <cac:AdditionalDocumentReference>
    <cbc:ID>ICV</cbc:ID>
    <cbc:UUID>${icv}</cbc:UUID>
  </cac:AdditionalDocumentReference>

  <!-- PIH — Previous Invoice Hash -->
  <cac:AdditionalDocumentReference>
    <cbc:ID>PIH</cbc:ID>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${pih}</cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>

  <!-- Seller -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="CRN">${x(SELLER_CR)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PostalAddress>
        <cbc:StreetName>${x(SELLER_ADDRESS)}</cbc:StreetName>
        <cbc:CityName>${x(SELLER_CITY)}</cbc:CityName>
        <cbc:PostalZone>${x(SELLER_ZIP)}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>${SELLER_COUNTRY}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${x(SELLER_VAT)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${x(SELLER_NAME)}</cbc:RegistrationName>
        <cbc:RegistrationName languageID="ar">${x(SELLER_NAME_AR)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <!-- Buyer -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PostalAddress>
        <cbc:StreetName>${x(invoice.clientAddress || '')}</cbc:StreetName>
        <cac:Country><cbc:IdentificationCode>SA</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      ${invoice.clientVAT ? `<cac:PartyTaxScheme>
        <cbc:CompanyID>${x(invoice.clientVAT)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>` : ''}
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${x(invoice.clientName)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <!-- Delivery / Supply Date -->
  <cac:Delivery>
    <cbc:ActualDeliveryDate>${supplyDate}</cbc:ActualDeliveryDate>
  </cac:Delivery>

  <!-- Payment Means -->
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>30</cbc:PaymentMeansCode>
  </cac:PaymentMeans>

  <!-- Retention allowance -->
  ${retentionXML}

  <!-- Tax Total -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="SAR">${fmt(invoice.vatAmount)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="SAR">${fmt(invoice.subTotal)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="SAR">${fmt(invoice.vatAmount)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${fmt(invoice.vatRate)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>

  <!-- Monetary Totals -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="SAR">${fmt(invoice.subTotal)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="SAR">${fmt(invoice.subTotal - invoice.retentionAmount)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="SAR">${fmt(invoice.totalAmount)}</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="SAR">${fmt(invoice.retentionAmount)}</cbc:AllowanceTotalAmount>
    <cbc:PayableAmount currencyID="SAR">${fmt(invoice.totalAmount)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <!-- Invoice Lines -->
  ${lineXML}

</Invoice>`;
}

// ---------------------------------------------------------------------------
// ZATCA TLV QR Code Generator
//
// Field order per ZATCA specification:
//  Tag 1 (0x01): Seller name
//  Tag 2 (0x02): VAT registration number
//  Tag 3 (0x03): Invoice timestamp (ISO 8601)
//  Tag 4 (0x04): Invoice total (with VAT)
//  Tag 5 (0x05): VAT total
// ---------------------------------------------------------------------------
export function generateZatcaQR(invoice: ZatcaInvoice): string {
  const timestamp = isoDateTime(invoice.invoiceDate);

  function tlv(tag: number, value: string): Buffer {
    const valBuf = Buffer.from(value, 'utf8');
    const tagBuf = Buffer.from([tag]);
    const lenBuf = Buffer.from([valBuf.length]);
    return Buffer.concat([tagBuf, lenBuf, valBuf]);
  }

  const qrBuffer = Buffer.concat([
    tlv(0x01, SELLER_NAME),
    tlv(0x02, SELLER_VAT),
    tlv(0x03, timestamp),
    tlv(0x04, fmt(invoice.totalAmount)),
    tlv(0x05, fmt(invoice.vatAmount)),
  ]);

  return qrBuffer.toString('base64');
}
