import { NextRequest, NextResponse } from 'next/server';
import { invoiceService } from '@/lib/invoices/prisma-invoice-service';
import { canAccessInvoices, ALLINONE_TEMPLATES, ALLINONE_COMPANY_INFO, ALLINONE_BANK_ACCOUNTS } from '@/lib/invoices/invoice-types';
import fs from 'fs';
import path from 'path';

async function checkAccess(request: NextRequest): Promise<{ authorized: boolean; userId?: string; userRole?: string }> {
  try {
    const userSessionCookie = request.cookies.get('user-session')?.value;
    if (!userSessionCookie) {
      return { authorized: false };
    }
    const userData = JSON.parse(userSessionCookie);
    const userRole = userData.role || '';
    if (!canAccessInvoices(userRole)) {
      return { authorized: false };
    }
    return { authorized: true, userId: userData.id, userRole };
  } catch {
    return { authorized: false };
  }
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 
                  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return `${date.getDate().toString().padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Fonction pour convertir un nombre en lettres (français)
function numberToWords(num: number): string {
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];
  
  if (num === 0) return 'zéro';
  
  const convertLessThanHundred = (n: number): string => {
    if (n < 20) return units[n];
    const ten = Math.floor(n / 10);
    const unit = n % 10;
    if (ten === 7 || ten === 9) {
      return tens[ten] + '-' + units[10 + unit];
    }
    if (unit === 0) return tens[ten] + (ten === 8 ? 's' : '');
    if (unit === 1 && ten !== 8) return tens[ten] + ' et un';
    return tens[ten] + '-' + units[unit];
  };
  
  const convertLessThanThousand = (n: number): string => {
    if (n < 100) return convertLessThanHundred(n);
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let result = hundred === 1 ? 'cent' : units[hundred] + ' cent';
    if (rest === 0 && hundred > 1) result += 's';
    else if (rest > 0) result += ' ' + convertLessThanHundred(rest);
    return result;
  };
  
  const wholePart = Math.floor(num);
  const centsPart = Math.round((num - wholePart) * 100);
  
  let result = '';
  
  if (wholePart >= 1000000) {
    const millions = Math.floor(wholePart / 1000000);
    result += (millions === 1 ? 'un million' : convertLessThanThousand(millions) + ' millions');
    const rest = wholePart % 1000000;
    if (rest > 0) result += ' ' + numberToWords(rest).split(' cents')[0];
  } else if (wholePart >= 1000) {
    const thousands = Math.floor(wholePart / 1000);
    result += (thousands === 1 ? 'mille' : convertLessThanThousand(thousands) + ' mille');
    const rest = wholePart % 1000;
    if (rest > 0) result += ' ' + convertLessThanThousand(rest);
  } else {
    result = convertLessThanThousand(wholePart);
  }
  
  // Ajouter les cents
  if (centsPart > 0) {
    result += ' et ' + convertLessThanHundred(centsPart) + ' cents';
  }
  
  // Capitaliser la première lettre
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function getStyles(enteteBase64: string): string {
  return `
    @page { 
      size: A4; 
      margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      font-size: 10px;
      color: #000;
      background: #555;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }
    .toolbar {
      background: #333;
      padding: 12px 24px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      gap: 12px;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .toolbar button {
      background: #667eea;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: background 0.2s;
    }
    .toolbar button:hover { background: #5a6fd6; }
    .toolbar button.secondary { background: #4a5568; }
    .toolbar button.secondary:hover { background: #2d3748; }
    .toolbar .title {
      color: white;
      font-size: 16px;
      font-weight: 600;
      margin-right: 20px;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      position: relative;
      background-color: white;
      background-image: url('${enteteBase64}');
      background-size: 210mm 297mm;
      background-repeat: no-repeat;
      background-position: top center;
      box-shadow: 0 0 30px rgba(0,0,0,0.4);
      page-break-after: always;
    }
    .content {
      position: relative;
      padding-top: 70mm;
      padding-left: 12mm;
      padding-right: 12mm;
      padding-bottom: 35mm;
      min-height: 297mm;
    }
    /* Pour les pages supplémentaires */
    .page-break {
      page-break-before: always;
    }
    .invoice-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
      margin-bottom: 5mm;
    }
    .invoice-table th {
      background: #4a4a6a;
      color: white;
      padding: 5px 4px;
      text-align: center;
      font-weight: bold;
      font-size: 9px;
      border: 1px solid #333;
    }
    .invoice-table td {
      padding: 4px 5px;
      border: 1px solid #ccc;
      vertical-align: middle;
    }
    .work-banner {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-align: center;
      padding: 5px 10px;
      font-weight: bold;
      font-size: 11px;
      margin-bottom: 3mm;
    }
    .totals-table {
      border-collapse: collapse;
      font-size: 10px;
    }
    .totals-table td {
      padding: 3px 8px;
      border: 1px solid #333;
    }
    .totals-table .label { background: #e0e0e0; text-align: left; }
    .totals-table .value { text-align: right; background: white; }
    .totals-table .total-row td {
      background: #4a4a6a;
      color: white;
      font-weight: bold;
    }
    .footer-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 8mm;
    }
    .signature-section { width: 45%; }
    .signature-title { font-size: 11px; margin-bottom: 15mm; }
    @media print {
      body { 
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important;
        background: white !important;
        padding: 0 !important;
      }
      .toolbar { display: none !important; }
      .page { 
        box-shadow: none !important;
        margin: 0 !important;
      }
    }
  `;
}

function generateTravauxHTML(invoice: any, client: any, enteteBase64: string): string {
  const linesHTML = invoice.lines.map((line: any) => `
    <tr>
      <td style="width:5%;text-align:center;"></td>
      <td style="width:45%;text-align:left;">${line.description}</td>
      <td style="width:12%;text-align:center;">${line.quantity > 0 ? line.quantity : ''}</td>
      <td style="width:18%;text-align:right;">${line.unitPrice > 0 ? '$ ' + formatCurrency(line.unitPrice) : ''}</td>
      <td style="width:20%;text-align:right;">$ ${formatCurrency(line.total)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${invoice.invoiceNumber}</title>
  <style>${getStyles(enteteBase64)}
    .zoom-controls { display: flex; align-items: center; gap: 8px; margin-right: 15px; }
    .zoom-controls button { width: 32px; height: 32px; padding: 0; font-size: 18px; font-weight: bold; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; }
    .zoom-controls span { color: white; font-size: 13px; min-width: 50px; text-align: center; }
  </style>
</head>
<body>
  <div class="toolbar">
    <span class="title">Facture ${invoice.invoiceNumber}</span>
    <div class="zoom-controls">
      <button onclick="zoomOut()">−</button>
      <span id="zoomLevel">100%</span>
      <button onclick="zoomIn()">+</button>
    </div>
    <button onclick="window.print()">Imprimer / PDF</button>
    <button class="secondary" onclick="window.close()">Fermer</button>
  </div>
  <script>
    let currentZoom = 100;
    function updateZoom() {
      document.getElementById('zoomLevel').textContent = currentZoom + '%';
      document.querySelector('.page').style.transform = 'scale(' + (currentZoom / 100) + ')';
      document.querySelector('.page').style.transformOrigin = 'top center';
    }
    function zoomIn() { if (currentZoom < 150) { currentZoom += 10; updateZoom(); } }
    function zoomOut() { if (currentZoom > 50) { currentZoom -= 10; updateZoom(); } }
  </script>
  <div class="page">
    <div class="content">
      <div style="text-align:right;margin-bottom:8mm;font-size:11px;">
        Kinshasa, le ${formatDate(invoice.issueDate)}
      </div>
      <div style="margin-bottom:5mm;">
        <span style="font-size:11px;">Facture</span><br>
        <span style="font-size:12px;font-weight:bold;">${invoice.invoiceNumber}</span>
      </div>
      <div class="work-banner">TRAVAIL A REALISER</div>
      ${invoice.publicNotes ? `<div style="text-align:center;font-style:italic;color:#555;font-size:9px;margin-bottom:5mm;">${invoice.publicNotes}</div>` : ''}
      <table class="invoice-table">
        <thead>
          <tr>
            <th style="width:5%;">N°</th>
            <th style="width:45%;">DESCRIPTION</th>
            <th style="width:12%;">UNITÉS</th>
            <th style="width:18%;">P.U / USD</th>
            <th style="width:20%;">P.T / USD</th>
          </tr>
        </thead>
        <tbody>${linesHTML}</tbody>
      </table>
      <div class="footer-section">
        <div class="signature-section" style="display:flex;flex-direction:column;justify-content:flex-end;margin-right:15mm;">
          <div class="signature-title" style="margin-bottom:0;">Service Comptabilité</div>
          <div style="border-bottom:1px solid #000;width:35%;margin-top:5mm;"></div>
        </div>
        <table class="totals-table">
          <tr><td class="label">Sous-Total</td><td class="value">$ ${formatCurrency(invoice.subtotal)}</td></tr>
          ${invoice.taxRate > 0 ? `<tr><td class="label">TVA (${invoice.taxRate}%)</td><td class="value">$ ${formatCurrency(invoice.taxAmount)}</td></tr>` : ''}
          <tr class="total-row"><td>TOTAL GÉNÉRAL</td><td style="text-align:right;">$ ${formatCurrency(invoice.total)}</td></tr>
        </table>
      </div>
      
      <!-- Modes de paiement -->
      <div style="margin-top:8mm;font-size:12px;line-height:1.5;">
        <div style="font-weight:bold;margin-bottom:2mm;">Modes de paiement acceptés:</div>
        <div style="display:flex;gap:10mm;">
          <div>• Cash &nbsp;&nbsp; • Chèque</div>
          <div>• Ordre de paiement &nbsp;&nbsp; • Virement bancaire</div>
        </div>
        <div style="margin-top:2mm;color:#333;">
          <div><strong>N.B:</strong> Le règlement de la facture est requis impérativement dans les 72 heures suivant son émission faute de quoi les pénalités seront appliquées de 5 à 20%.</div>
          <div><strong>N.B:</strong> Le règlement d'au moins 60% de la facture déclenchera la procédure.</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function generateProformaHTML(invoice: any, client: any, enteteBase64: string): string {
  const commissionRate = invoice.commissionRate || 17;
  const managementFeeRate = invoice.managementFeeRate || 5;
  const commissionAmount = (invoice.subtotal * commissionRate) / 100;
  const managementFeeAmount = (invoice.subtotal * managementFeeRate) / 100;
  const total2 = commissionAmount + managementFeeAmount;
  const netAPayer = invoice.subtotal + total2;

  const linesHTML = invoice.lines.map((line: any) => `
    <tr>
      <td style="width:5%;text-align:center;"></td>
      <td style="width:35%;text-align:left;">${line.description}</td>
      <td style="width:8%;text-align:center;">${line.quantity > 0 ? line.quantity : ''}</td>
      <td style="width:8%;text-align:center;"></td>
      <td style="width:10%;text-align:center;"></td>
      <td style="width:15%;text-align:right;">${line.unitPrice > 0 ? '$' + formatCurrency(line.unitPrice) : ''}</td>
      <td style="width:15%;text-align:right;">$${formatCurrency(line.total)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Proforma ${invoice.invoiceNumber}</title>
  <style>${getStyles(enteteBase64)}
    .zoom-controls { display: flex; align-items: center; gap: 8px; margin-right: 15px; }
    .zoom-controls button { width: 32px; height: 32px; padding: 0; font-size: 18px; font-weight: bold; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; }
    .zoom-controls span { color: white; font-size: 13px; min-width: 50px; text-align: center; }
  </style>
</head>
<body>
  <div class="toolbar">
    <span class="title">Proforma ${invoice.invoiceNumber}</span>
    <div class="zoom-controls">
      <button onclick="zoomOut()">−</button>
      <span id="zoomLevel">100%</span>
      <button onclick="zoomIn()">+</button>
    </div>
    <button onclick="window.print()">Imprimer / PDF</button>
    <button class="secondary" onclick="window.close()">Fermer</button>
  </div>
  <script>
    let currentZoom = 100;
    function updateZoom() {
      document.getElementById('zoomLevel').textContent = currentZoom + '%';
      document.querySelector('.page').style.transform = 'scale(' + (currentZoom / 100) + ')';
      document.querySelector('.page').style.transformOrigin = 'top center';
    }
    function zoomIn() { if (currentZoom < 150) { currentZoom += 10; updateZoom(); } }
    function zoomOut() { if (currentZoom > 50) { currentZoom -= 10; updateZoom(); } }
  </script>
  <div class="page">
    <div class="content">
      <div style="display:flex;justify-content:space-between;margin-bottom:5mm;">
        <div>
          <span style="font-size:11px;">Proforma</span><br>
          <span style="font-size:12px;font-weight:bold;">${invoice.invoiceNumber}</span>
        </div>
        <div style="text-align:right;font-size:11px;">Kinshasa, le ${formatDate(invoice.issueDate)}</div>
      </div>
      <div style="display:flex;margin-bottom:5mm;border:1px solid #333;">
        <div style="flex:1;padding:8px;border-right:1px solid #333;">
          <strong>Description:</strong> ${invoice.publicNotes || 'Services professionnels'}
        </div>
        <div style="flex:1;padding:8px;font-weight:bold;">
          <strong>Client:</strong> ${client?.companyName || 'N/A'}
        </div>
      </div>
      <table class="invoice-table">
        <thead>
          <tr>
            <th style="width:5%;">N°</th>
            <th style="width:35%;">DESIGNATIONS</th>
            <th style="width:8%;">Qté</th>
            <th style="width:8%;">Jour</th>
            <th style="width:10%;">M²</th>
            <th style="width:15%;">P.U</th>
            <th style="width:15%;">P.T</th>
          </tr>
        </thead>
        <tbody>${linesHTML}</tbody>
      </table>
      <div style="margin-top:3mm;display:flex;justify-content:space-between;align-items:flex-end;">
        <div style="display:flex;flex-direction:column;justify-content:flex-end;margin-right:15mm;">
          <div class="signature-title" style="margin-bottom:0;">Service Comptabilité</div>
          <div style="border-bottom:1px solid #000;width:35%;margin-top:5mm;"></div>
        </div>
        <table style="border-collapse:collapse;font-size:10px;">
          <tr>
            <td style="padding:4px 8px;border:1px solid #333;background:#e0e0e0;font-weight:bold;">TOTAL 1</td>
            <td style="padding:4px 8px;border:1px solid #333;text-align:right;width:100px;">$${formatCurrency(invoice.subtotal)}</td>
          </tr>
          <tr>
            <td style="padding:4px 8px;border:1px solid #333;background:#e0e0e0;">Commission agence</td>
            <td style="padding:4px 8px;border:1px solid #333;background:#e0e0e0;text-align:center;width:50px;">${commissionRate}%</td>
            <td style="padding:4px 8px;border:1px solid #333;text-align:right;">$${formatCurrency(commissionAmount)}</td>
          </tr>
          <tr>
            <td style="padding:4px 8px;border:1px solid #333;background:#e0e0e0;">Management fees</td>
            <td style="padding:4px 8px;border:1px solid #333;background:#e0e0e0;text-align:center;">${managementFeeRate}%</td>
            <td style="padding:4px 8px;border:1px solid #333;text-align:right;">$${formatCurrency(managementFeeAmount)}</td>
          </tr>
          <tr>
            <td style="padding:4px 8px;border:1px solid #333;background:#e0e0e0;font-weight:bold;">TOTAL 2</td>
            <td colspan="2" style="padding:4px 8px;border:1px solid #333;text-align:right;">$${formatCurrency(total2)}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding:4px 8px;border:1px solid #333;background:#333;color:white;font-weight:bold;">NET A PAYER</td>
            <td style="padding:4px 8px;border:1px solid #333;background:#4a4a6a;color:white;font-weight:bold;text-align:right;">$${formatCurrency(netAPayer)}</td>
          </tr>
        </table>
      </div>
      
      <!-- Modes de paiement -->
      <div style="margin-top:8mm;font-size:12px;line-height:1.5;">
        <div style="font-weight:bold;margin-bottom:2mm;">Modes de paiement acceptés:</div>
        <div style="display:flex;gap:10mm;">
          <div>• Cash &nbsp;&nbsp; • Chèque</div>
          <div>• Ordre de paiement &nbsp;&nbsp; • Virement bancaire</div>
        </div>
        <div style="margin-top:2mm;color:#333;">
          <div><strong>N.B:</strong> Le règlement de la facture est requis impérativement dans les 72 heures suivant son émission faute de quoi les pénalités seront appliquées de 5 à 20%.</div>
          <div><strong>N.B:</strong> Le règlement d'au moins 60% de la facture déclenchera la procédure.</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// Facture B - Format avec sections (reproduction EXACTE de la photo)
function generateFactureBHTML(invoice: any, client: any, enteteBase64: string): string {
  console.log('=== FACTURE B DEBUG ===');
  console.log('invoice.acomptes:', JSON.stringify(invoice.acomptes, null, 2));
  
  const sections = invoice.sections || [];
  const commissionRate = invoice.commissionRate || 17;
  const managementFeeRate = invoice.managementFeeRate || 5;
  
  // Calculer le total hors taxe
  let totalHT = 0;
  sections.forEach((section: any) => {
    totalHT += section.subtotal || 0;
  });
  
  const managementFees = (totalHT * managementFeeRate) / 100;
  const commissionAgence = (totalHT * commissionRate) / 100;
  const autresFrais = managementFees + commissionAgence;
  const totalGeneral = totalHT + autresFrais;

  // Générer le HTML pour chaque section - format EXACT comme la photo
  let sectionsHTML = '';
  let sectionNumber = 1;
  
  sections.forEach((section: any) => {
    // Titre de section en gras fond gris
    sectionsHTML += `
      <tr>
        <td colspan="6" style="padding:4px 6px;font-weight:bold;background:#d0d0d0;border:1px solid #000;font-size:10px;">${section.title}</td>
      </tr>`;
    
    // Lignes de la section
    (section.lines || []).forEach((line: any) => {
      const qty = line.quantity || '';
      const m2 = line.squareMeters || '';
      const days = line.days || '';
      const unitPrice = line.unitPrice > 0 ? '$' + formatCurrency(line.unitPrice) : '';
      const total = line.total > 0 ? '$' + formatCurrency(line.total) : '';
      
      sectionsHTML += `
        <tr>
          <td style="padding:3px 5px;border:1px solid #000;font-size:9px;">${line.description}</td>
          <td style="padding:3px 5px;border:1px solid #000;text-align:center;font-size:9px;">${qty}</td>
          <td style="padding:3px 5px;border:1px solid #000;text-align:center;font-size:9px;">${m2}</td>
          <td style="padding:3px 5px;border:1px solid #000;text-align:center;font-size:9px;">${days}</td>
          <td style="padding:3px 5px;border:1px solid #000;text-align:right;font-size:9px;">${unitPrice}</td>
          <td style="padding:3px 5px;border:1px solid #000;text-align:right;font-size:9px;">${total}</td>
        </tr>`;
    });
    
    // Sous-total de section
    sectionsHTML += `
      <tr>
        <td colspan="5" style="padding:3px 6px;border:1px solid #000;text-align:left;font-weight:bold;font-size:9px;background:#f0f0f0;">Sous-total ${sectionNumber}</td>
        <td style="padding:3px 6px;border:1px solid #000;text-align:right;font-weight:bold;font-size:9px;background:#f0f0f0;">$${formatCurrency(section.subtotal || 0)}</td>
      </tr>`;
    
    sectionNumber++;
  });

  const styles = `
    @page { 
      size: A4; 
      margin: 0;
    }
    @page :first {
      margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      font-size: 10px;
      color: #000;
      background: #555;
      padding: 20px;
    }
    .toolbar {
      background: #333;
      padding: 12px 24px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      gap: 12px;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
    }
    .toolbar button {
      background: #667eea;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
    }
    .toolbar button:hover { background: #5a6fd6; }
    .toolbar button.secondary { background: #4a5568; }
    .toolbar .title { color: white; font-size: 16px; font-weight: 600; margin-right: 20px; }
    
    .page-container {
      width: 210mm;
      min-height: 297mm;
      margin: 60px auto 20px auto;
      background: white;
      box-shadow: 0 0 30px rgba(0,0,0,0.4);
      padding: 0;
      position: relative;
    }
    .page-content {
      padding: 12mm;
      background-image: url('${enteteBase64}');
      background-size: 210mm 297mm;
      background-repeat: no-repeat;
      background-position: top center;
      min-height: 297mm;
      padding-top: 65mm;
      padding-bottom: 35mm;
      box-sizing: border-box;
    }
    
    /* Pied de page fixe pour impression multi-pages */
    .page-footer {
      display: none;
    }
    
    .header-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8mm;
      font-size: 11px;
    }
    .project-title {
      text-align: center;
      font-weight: bold;
      font-size: 12px;
      padding: 6px 15px;
      border: 2px solid #000;
      margin-bottom: 0;
    }
    .info-box {
      display: flex;
      width: 100%;
      margin-bottom: 0;
      border: 1px solid #000;
      border-top: none;
    }
    .info-box > div {
      padding: 6px 10px;
      font-size: 10px;
      vertical-align: top;
    }
    .info-box > div:first-child {
      width: 50%;
      border-right: 1px solid #000;
    }
    .info-box > div:last-child {
      width: 50%;
    }
    
    .main-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
      margin-bottom: 5mm;
    }
    .main-table th {
      background: #4a4a4a;
      color: white;
      padding: 5px 4px;
      text-align: center;
      font-weight: bold;
      font-size: 9px;
      border: 1px solid #000;
    }
    
    .totals-section {
      display: flex;
      justify-content: space-between;
      margin-top: 8mm;
      page-break-inside: avoid;
    }
    .signature-box {
      width: 40%;
    }
    .signature-title {
      font-size: 11px;
      margin-bottom: 20mm;
    }
    .totals-table {
      border-collapse: collapse;
      font-size: 10px;
    }
    .totals-table td {
      padding: 4px 10px;
      border: 1px solid #000;
    }
    .totals-table .label-cell {
      background: #e8e8e8;
      text-align: left;
    }
    .totals-table .value-cell {
      text-align: right;
      min-width: 100px;
    }
    .totals-table .total-row td {
      background: #4a4a4a;
      color: white;
      font-weight: bold;
    }
    .totals-table .section-header {
      background: #c0c0c0;
      font-weight: bold;
      text-align: left;
    }
    
    /* Acomptes */
    .acomptes-table {
      margin-top: 5mm;
      border-collapse: collapse;
      font-size: 10px;
      margin-left: auto;
    }
    .acomptes-table td {
      padding: 3px 10px;
      border: 1px solid #000;
    }
    .acomptes-table .acompte-label {
      background: #f0f0f0;
      text-align: left;
    }
    .acomptes-table .acompte-value {
      text-align: right;
      font-weight: bold;
    }
    .acomptes-table .total-paye td {
      background: #4a4a4a;
      color: white;
      font-weight: bold;
    }
    
    @media print {
      body { 
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important;
        background: white !important;
        padding: 0 !important;
      }
      .toolbar { display: none !important; }
      .page-container { 
        box-shadow: none !important;
        margin: 0 !important;
        width: 210mm !important;
      }
      .page-content {
        padding-top: 65mm;
        padding-bottom: 35mm;
        min-height: 297mm;
        background-size: 210mm 297mm !important;
      }
      /* Pied de page visible sur toutes les pages à l'impression */
      .page-footer {
        display: block;
        position: fixed;
        bottom: 8mm;
        left: 10mm;
        right: 10mm;
        font-size: 8px;
        color: #333;
        background: white;
        padding-top: 2mm;
      }
    }
  `;

  // Générer les acomptes si présents (nouveau format)
  let acomptesHTML = '';
  const acomptes = invoice.acomptes;
  if (acomptes && (acomptes.acompte1 || acomptes.acompte2 || acomptes.acompte3)) {
    if (acomptes.acompte1) {
      acomptesHTML += `
        <tr>
          <td style="border:1px solid #000;padding:4px 10px;background:#f0f0f0;">Acompte payé (${acomptes.acompte1.percent}%)</td>
          <td style="border:1px solid #000;padding:4px 10px;text-align:right;">$${formatCurrency(acomptes.acompte1.amount)}</td>
        </tr>`;
    }
    
    if (acomptes.acompte2) {
      acomptesHTML += `
        <tr>
          <td style="border:1px solid #000;padding:4px 10px;background:#f0f0f0;">Deuxième acompte payé</td>
          <td style="border:1px solid #000;padding:4px 10px;text-align:right;">$${formatCurrency(acomptes.acompte2.amount)}</td>
        </tr>`;
    }
    
    if (acomptes.acompte3) {
      acomptesHTML += `
        <tr>
          <td style="border:1px solid #000;padding:4px 10px;background:#f0f0f0;">Troisième acompte payé</td>
          <td style="border:1px solid #000;padding:4px 10px;text-align:right;">$${formatCurrency(acomptes.acompte3.amount)}</td>
        </tr>`;
    }
    
    acomptesHTML += `
        <tr style="background:#4a4a4a;color:white;font-weight:bold;">
          <td style="border:1px solid #000;padding:4px 10px;">TOTAL PAYE</td>
          <td style="border:1px solid #000;padding:4px 10px;text-align:right;">$${formatCurrency(acomptes.totalPaye || 0)}</td>
        </tr>`;
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${invoice.invoiceNumber}</title>
  <style>${styles}
    .zoom-controls { display: flex; align-items: center; gap: 8px; margin-right: 15px; }
    .zoom-controls button { width: 32px; height: 32px; padding: 0; font-size: 18px; font-weight: bold; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; }
    .zoom-controls span { color: white; font-size: 13px; min-width: 50px; text-align: center; }
  </style>
</head>
<body>
  <div class="toolbar">
    <span class="title">Facture ${invoice.invoiceNumber}</span>
    <div class="zoom-controls">
      <button onclick="zoomOut()">−</button>
      <span id="zoomLevel">100%</span>
      <button onclick="zoomIn()">+</button>
    </div>
    <button onclick="window.print()">Imprimer / PDF</button>
    <button class="secondary" onclick="window.close()">Fermer</button>
  </div>
  <script>
    let currentZoom = 100;
    function updateZoom() {
      document.getElementById('zoomLevel').textContent = currentZoom + '%';
      document.querySelector('.page-container').style.transform = 'scale(' + (currentZoom / 100) + ')';
      document.querySelector('.page-container').style.transformOrigin = 'top center';
    }
    function zoomIn() { if (currentZoom < 150) { currentZoom += 10; updateZoom(); } }
    function zoomOut() { if (currentZoom > 50) { currentZoom -= 10; updateZoom(); } }
  </script>
  
  <div class="page-container">
    <div class="page-content">
      <!-- En-tête avec numéro et date -->
      <div class="header-info">
        <div>
          <span style="font-size:11px;">Facture</span><br>
          <span style="font-size:12px;font-weight:bold;">${invoice.invoiceNumber}</span>
        </div>
        <div style="text-align:right;">
          Kinshasa, le ${formatDate(invoice.issueDate)}
        </div>
      </div>
      
      <!-- Titre du projet centré avec bordure -->
      <div class="project-title">
        ${invoice.projectName || 'PROJET'}
      </div>
      
      <!-- Boîte Description / Client -->
      <div class="info-box">
        <div style="width:50%;border-right:1px solid #000;">
          <strong>Description:</strong> ${invoice.projectDescription || ''}
        </div>
        <div style="width:50%;">
          <strong>Client:</strong> ${client?.companyName || 'N/A'}
        </div>
      </div>
      
      <!-- Tableau principal avec toutes les sections -->
      <table class="main-table">
        <thead>
          <tr>
            <th style="width:40%;">Descriptions</th>
            <th style="width:8%;">Qté</th>
            <th style="width:8%;">M2</th>
            <th style="width:8%;">Jour</th>
            <th style="width:16%;">Prix unitaire</th>
            <th style="width:16%;">Prix total</th>
          </tr>
        </thead>
        <tbody>
          ${sectionsHTML}
        </tbody>
      </table>
      
      <!-- Section totaux et signature sur même ligne -->
      <div class="totals-section">
        <div class="signature-box" style="display:flex;flex-direction:column;justify-content:flex-end;margin-right:15mm;">
          <div class="signature-title" style="margin-bottom:0;font-weight:bold;">Service Comptabilité</div>
          <div style="border-bottom:1px solid #000;width:35%;margin-top:5mm;"></div>
        </div>
        
        <div>
          <!-- Tableau des totaux unifié - TOTAL GENERAL + Acomptes collés -->
          <table class="totals-table" style="border-collapse:collapse;">
            <tr class="total-row">
              <td style="border:1px solid #000;padding:4px 10px;">TOTAL GENERAL</td>
              <td style="border:1px solid #000;padding:4px 10px;text-align:right;font-size:12px;">$${formatCurrency(totalHT)}</td>
            </tr>
            ${acomptesHTML}
          </table>
        </div>
      </div>
      
      <!-- Modes de paiement - en bas de page -->
      <div style="margin-top:8mm;font-size:12px;line-height:1.5;">
        <div style="font-weight:bold;margin-bottom:2mm;">Modes de paiement acceptés:</div>
        <div style="display:flex;gap:15mm;">
          <div>
            <div>• Cash</div>
            <div>• Chèque</div>
          </div>
          <div>
            <div>• Ordre de paiement</div>
            <div>• Virement bancaire au crédit du compte</div>
          </div>
        </div>
        <div style="margin-top:3mm;color:#333;">
          <div><strong>N.B:</strong> Le règlement de la facture est requis impérativement dans les 72 heures suivant son émission faute de quoi les pénalités seront appliquées de 5 à 20%.</div>
          <div style="margin-top:1mm;"><strong>N.B:</strong> Le règlement d'au moins 60% de la facture déclenchera la procédure.</div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Pied de page fixe pour impression (visible uniquement sur pages supplémentaires) -->
  <div class="page-footer">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-top:1px solid #999;padding-top:2mm;">
      <div style="text-align:left;">
        <div style="font-weight:bold;">3098, avenue Batetela /Boulevard du 30 juin</div>
        <div>Kinshasa - Gombe, Crown Tower / 9e niveau local 904</div>
        <div style="margin-top:1mm;">www.iconesrdc.com</div>
      </div>
      <div style="text-align:center;">
        <div>IDNAT : 01-H53300-N13514L, RCCM: CD /KNG/RCCM /17-B-01328</div>
        <div>N° d'impôt : A1720921k</div>
      </div>
      <div style="text-align:right;">
        <div style="display:flex;align-items:center;gap:5px;">
          <span>🌐</span> <span>📘</span> <span>❤️</span> <span style="font-weight:bold;">icônes rdc</span>
        </div>
        <div style="margin-top:1mm;">+243 994 235 789</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ===== GÉNÉRATION HTML POUR ALL IN ONE =====

function getAllinoneStyles(enteteBase64: string): string {
  return `
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12pt;
      color: #000;
      background: #555;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .toolbar {
      background: #333;
      padding: 12px 24px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .toolbar button {
      background: #9b59b6;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
    }
    .toolbar button:hover { background: #8e44ad; }
    .toolbar button.secondary { background: #4a5568; }
    .toolbar .title { color: white; font-size: 16px; font-weight: 600; margin-right: 20px; }
    .page {
      width: 210mm;
      min-height: 297mm;
      background: white;
      ${enteteBase64 ? `background-image: url('${enteteBase64}'); background-size: 210mm 297mm; background-repeat: no-repeat; background-position: top center;` : ''}
      box-shadow: 0 0 30px rgba(0,0,0,0.4);
      position: relative;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .content {
      padding: ${enteteBase64 ? '38mm' : '20mm'} 12mm 35mm 12mm;
      min-height: 297mm;
      box-sizing: border-box;
    }
    .date-header {
      text-align: right;
      font-size: 10pt;
      margin-bottom: 3mm;
    }
    .admin-title {
      text-align: center;
      font-size: 12pt;
      font-weight: bold;
      text-decoration: underline;
      margin-bottom: 5mm;
      letter-spacing: 0.5px;
    }
    .invoice-number {
      font-size: 10pt;
      font-weight: bold;
      margin-bottom: 4mm;
    }
    .service-client-box {
      border: 1.5px solid #000;
      border-bottom: none;
      margin-bottom: 0;
    }
    .service-client-row {
      display: flex;
    }
    .service-cell, .client-cell {
      padding: 2.5mm 4mm;
      font-size: 10pt;
      font-weight: bold;
    }
    .service-cell {
      width: 50%;
      border-right: 1.5px solid #000;
    }
    .client-cell {
      width: 50%;
    }
    .black-band {
      background: #000;
      height: 4mm;
      width: 100%;
    }
    .invoice-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0;
    }
    .invoice-table thead tr {
      background: #8B0000;
      color: #fff;
    }
    .invoice-table th {
      background: #8B0000;
      color: #fff;
      padding: 2mm 3mm;
      text-align: left;
      font-weight: bold;
      border: 1.5px solid #000;
      font-size: 9pt;
    }
    .invoice-table td {
      padding: 2mm 3mm;
      border: 1.5px solid #000;
      vertical-align: middle;
      font-size: 9pt;
    }
    .invoice-table .col-num { width: 6%; text-align: center; }
    .invoice-table .col-desc { width: 42%; font-weight: bold; }
    .invoice-table .col-qty { width: 10%; text-align: center; }
    .invoice-table .col-pu { width: 20%; text-align: right; padding-right: 3mm; }
    .invoice-table .col-pt { width: 22%; text-align: right; padding-right: 3mm; }
    .invoice-table .currency { display: inline-block; width: 12px; text-align: left; }
    .invoice-table .amount { display: inline-block; min-width: 45px; text-align: right; }
    .totals-section {
      border: 1.5px solid #000;
      border-top: none;
    }
    .total-row {
      display: flex;
      border-bottom: 1.5px solid #000;
    }
    .total-row:last-child {
      border-bottom: none;
    }
    .total-col-num {
      width: 6%;
      border-right: 1.5px solid #000;
    }
    .total-col-desc {
      width: 42%;
      border-right: 1.5px solid #000;
    }
    .total-col-qty {
      width: 10%;
      border-right: 1.5px solid #000;
    }
    .total-col-pu {
      width: 20%;
      border-right: 1.5px solid #000;
    }
    .total-label {
      flex: 1;
      padding: 2mm 3mm;
      font-size: 9pt;
      font-weight: bold;
      text-align: left;
      border-right: 1.5px solid #000;
    }
    .total-value {
      width: 22%;
      padding: 2mm 3mm;
      font-size: 9pt;
      font-weight: bold;
      text-align: right;
    }
    .total-value .currency { display: inline-block; width: 12px; text-align: left; }
    .total-value .amount { display: inline-block; min-width: 45px; text-align: right; }
    .bank-section {
      margin-top: 5mm;
      font-size: 9pt;
    }
    .bank-section h4 {
      font-size: 10pt;
      font-weight: bold;
      margin-bottom: 2mm;
    }
    .bank-table {
      width: 92%;
      border-collapse: collapse;
      margin: 0 auto;
    }
    .bank-table th {
      background: rgba(180, 180, 180, 0.5);
      color: #000;
      padding: 1.5mm 2mm;
      font-size: 9pt;
      font-weight: bold;
      border: 1.5px solid #000;
      text-align: center;
    }
    .bank-table td {
      padding: 1.5mm 2mm;
      font-size: 9pt;
      border: 1.5px solid #000;
      text-align: center;
    }
    .bank-table td.compte {
      font-weight: bold;
    }
    .signature-section {
      margin-top: 5mm;
      text-align: right;
      font-size: 10pt;
    }
    .payment-info {
      margin-top: 4mm;
      font-size: 9pt;
      line-height: 1.4;
    }
    .payment-info p {
      margin: 1px 0;
    }
    @media print {
      @page {
        size: A4;
        margin: 0;
      }
      html, body { 
        background: white !important; 
        padding: 0 !important;
        margin: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .toolbar { display: none !important; }
      .page { 
        box-shadow: none !important;
        page-break-after: always;
        page-break-inside: avoid;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .invoice-table { page-break-inside: auto; }
      .invoice-table tr { page-break-inside: avoid; page-break-after: auto; }
      .bank-section { page-break-inside: avoid; }
      .signature-section { page-break-inside: avoid; }
    }
  `;
}

function generateAllinoneHTML(invoice: any, client: any, enteteBase64: string): string {
  const templateKey = (invoice as any).template || 'creation_entreprise';
  const templateInfo = ALLINONE_TEMPLATES[templateKey as keyof typeof ALLINONE_TEMPLATES];
  
  // Nom du service selon le template
  const serviceNames: Record<string, string> = {
    'creation_entreprise': 'Création d\'Entreprise',
    'creation_asbl': 'Création ASBL',
    'recrutement': 'Recrutement du Personnel',
    'placement': 'Placement du Personnel',
    'transfert': 'Transfert du Personnel',
    'regularisation_eup': 'Régularisation EUP',
  };
  const serviceName = serviceNames[templateKey] || 'Services';
  
  // Calculs des totaux
  const subtotal = invoice.subtotal || 0;
  let extraFees = 0;
  let extraFeesLabel = '';
  let total = invoice.total || subtotal;
  
  // Vérifier si les Management Fees sont activés (rate > 0)
  const templateAny = templateInfo as any;
  const mgmtFeeRate = invoice.managementFeeRate ?? (templateAny?.managementFeeRate || 0);
  if (templateInfo?.hasManagementFees && mgmtFeeRate > 0) {
    extraFees = subtotal * (mgmtFeeRate / 100);
    extraFeesLabel = `MANAGEMENT FEES ${mgmtFeeRate}%`;
  } else if (templateInfo?.hasTVA && (invoice.taxRate || templateAny?.tvaRate)) {
    const rate = invoice.taxRate || templateAny?.tvaRate || 16;
    extraFees = subtotal * (rate / 100);
    extraFeesLabel = `TVA ${rate}%`;
  }

  // Tableau des comptes bancaires - Regroupé par ville comme sur la vraie facture
  const kinshasa = ALLINONE_BANK_ACCOUNTS.filter(acc => acc.ville === 'KINSHASA');
  const lubumbashi = ALLINONE_BANK_ACCOUNTS.filter(acc => acc.ville === 'LUBUMBASHI');
  
  const bankRows = `
    <tr>
      <td rowspan="${kinshasa.length}" style="vertical-align: middle;">KINSHASA</td>
      <td>${kinshasa[0]?.banque || ''}</td>
      <td rowspan="${kinshasa.length + lubumbashi.length}" style="vertical-align: middle;">ALL IN ONE SAS</td>
      <td><strong>${kinshasa[0]?.compte || ''}</strong></td>
      <td rowspan="${kinshasa.length + lubumbashi.length}" style="vertical-align: middle;">USD</td>
    </tr>
    ${kinshasa.slice(1).map(acc => `
    <tr>
      <td>${acc.banque}</td>
      <td><strong>${acc.compte}</strong></td>
    </tr>
    `).join('')}
    <tr>
      <td rowspan="${lubumbashi.length}" style="vertical-align: middle;">LUBUMBASHI</td>
      <td>${lubumbashi[0]?.banque || ''}</td>
      <td><strong>${lubumbashi[0]?.compte || ''}</strong></td>
    </tr>
    ${lubumbashi.slice(1).map(acc => `
    <tr>
      <td>${acc.banque}</td>
      <td><strong>${acc.compte}</strong></td>
    </tr>
    `).join('')}
  `;

  // ======= TEMPLATE RECRUTEMENT =======
  if (templateKey === 'recrutement') {
    const invoiceLines = invoice.lines || [];
    
    // Calculer le subtotal à partir des lignes
    let recrutementSubtotal = 0;
    invoiceLines.forEach((line: any) => {
      recrutementSubtotal += (line.quantity || 1) * (line.unitPrice || 0);
    });
    
    // Si subtotal de l'invoice existe, l'utiliser, sinon utiliser le calcul
    const finalSubtotal = invoice.subtotal || recrutementSubtotal;
    
    // Calcul TVA 16% pour recrutement
    const tvaRate = 16;
    const tvaAmount = finalSubtotal * (tvaRate / 100);
    const netAPayer = finalSubtotal + tvaAmount;
    
    // Générer les lignes pour recrutement
    let recrutementLinesHTML = '';
    let lineNum = 1;
    invoiceLines.forEach((line: any) => {
      const lineTotal = (line.quantity || 1) * (line.unitPrice || 0);
      recrutementLinesHTML += `
        <tr>
          <td style="width: 6%; border: 1.5px solid #000; text-align: center; padding: 2mm 3mm;">${lineNum}</td>
          <td style="width: 34%; border: 1.5px solid #000; padding: 2mm 3mm;">${line.description}</td>
          <td style="width: 12%; border: 1.5px solid #000; text-align: center; padding: 2mm 3mm;">${line.quantity || 1}</td>
          <td style="width: 22%; border: 1.5px solid #000; text-align: right; padding: 2mm 3mm;"><span style="float: left;">$</span><span style="float: right;">${formatCurrency(line.unitPrice || 0)}</span></td>
          <td style="width: 22%; border: 1.5px solid #000; text-align: right; padding: 2mm 3mm;"><span style="float: left;">$</span><span style="float: right;">${formatCurrency(lineTotal)}</span></td>
        </tr>
      `;
      lineNum++;
    });

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${invoice.invoiceNumber}</title>
  <style>${getAllinoneStyles(enteteBase64)}
    .zoom-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-right: 15px;
    }
    .zoom-controls button {
      width: 32px;
      height: 32px;
      padding: 0;
      font-size: 18px;
      font-weight: bold;
    }
    .zoom-controls span {
      color: white;
      font-size: 13px;
      min-width: 50px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span class="title">Facture ${invoice.invoiceNumber} - ALL IN ONE (Recrutement)</span>
    <div class="zoom-controls">
      <button onclick="zoomOut()">−</button>
      <span id="zoomLevel">100%</span>
      <button onclick="zoomIn()">+</button>
    </div>
    <button onclick="window.print()">Imprimer / PDF</button>
    <button class="secondary" onclick="window.close()">Fermer</button>
  </div>

  <script>
    let currentZoom = 100;
    function updateZoom() {
      document.getElementById('zoomLevel').textContent = currentZoom + '%';
      document.querySelector('.page').style.transform = 'scale(' + (currentZoom / 100) + ')';
      document.querySelector('.page').style.transformOrigin = 'top center';
    }
    function zoomIn() {
      if (currentZoom < 150) { currentZoom += 10; updateZoom(); }
    }
    function zoomOut() {
      if (currentZoom > 50) { currentZoom -= 10; updateZoom(); }
    }
  </script>

  <div class="page">
    <div class="content">
      <div class="date-header">Kinshasa, le ${formatDate(invoice.issueDate)}</div>
      <div class="admin-title">ADMINISTRATION ET FINANCES</div>
      <div class="invoice-number">Facture: ${invoice.invoiceNumber}</div>
      
      <!-- Tableau Recrutement - Même style que Régularisation EUP -->
      <table style="width: 85%; border-collapse: collapse; font-size: 12pt; margin: 0 auto;">
        <!-- Ligne Service / Client -->
        <tr>
          <td colspan="2" style="width: 40%; border: 1.5px solid #000; padding: 2mm 3mm; background: #fff; font-weight: bold; white-space: nowrap;">Service : ${serviceName}</td>
          <td colspan="3" style="width: 60%; border: 1.5px solid #000; padding: 2mm 3mm; background: #fff; font-weight: bold;">Client: ${client?.companyName || client?.contactName || 'N/A'}</td>
        </tr>
        <!-- Bande noire (même épaisseur que la bande rouge) -->
        <tr>
          <td colspan="2" style="background: #000; border-left: 1.5px solid #000; border-right: 1.5px solid #000; padding: 3mm 3mm; -webkit-print-color-adjust: exact; print-color-adjust: exact;"></td>
          <td colspan="3" style="background: #000; border-right: 1.5px solid #000; padding: 3mm 3mm; -webkit-print-color-adjust: exact; print-color-adjust: exact;"></td>
        </tr>
        <!-- Ligne N° / Description seule -->
        <tr>
          <td style="width: 6%; border: 1.5px solid #000; border-top: none; font-weight: bold; text-align: center; padding: 2mm 3mm; background: #fff;">N°</td>
          <td style="width: 34%; border: 1.5px solid #000; border-top: none; font-weight: bold; padding: 2mm 3mm; background: #fff;">Description</td>
          <td colspan="3" style="border: 1.5px solid #000; border-top: none; background: #c00; -webkit-print-color-adjust: exact; print-color-adjust: exact;"></td>
        </tr>
        <!-- Ligne Qté / P.U / P.T -->
        <tr>
          <td style="width: 6%; border: 1.5px solid #000; border-top: none;"></td>
          <td style="width: 34%; border: 1.5px solid #000; border-top: none;"></td>
          <td style="width: 12%; border: 1.5px solid #000; font-weight: bold; text-align: center; padding: 2mm 3mm; background: #fff;">Qté</td>
          <td style="width: 22%; border: 1.5px solid #000; font-weight: bold; text-align: center; padding: 2mm 3mm; background: #fff;">P.U</td>
          <td style="width: 22%; border: 1.5px solid #000; font-weight: bold; text-align: center; padding: 2mm 3mm; background: #fff;">P.T</td>
        </tr>
        <!-- Lignes de données -->
        ${recrutementLinesHTML}
        <!-- TOTAL -->
        <tr>
          <td style="border: 1.5px solid #000;"></td>
          <td style="border: 1.5px solid #000; font-weight: bold; padding: 2mm 3mm;">TOTAL</td>
          <td style="border: 1.5px solid #000; background: #555; -webkit-print-color-adjust: exact; print-color-adjust: exact;"></td>
          <td style="border: 1.5px solid #000; text-align: right; padding: 2mm 3mm; font-weight: bold;"><span style="float: left;">$</span></td>
          <td style="border: 1.5px solid #000; text-align: right; padding: 2mm 3mm; font-weight: bold;"><span style="float: left;">$</span><span style="float: right;">${formatCurrency(finalSubtotal)}</span></td>
        </tr>
        <!-- TVA 16% -->
        <tr>
          <td style="border-left: 1.5px solid #000; border-top: 1.5px solid #000; border-right: 1.5px solid #000;"></td>
          <td colspan="2" style="border: 1.5px solid #000; font-weight: bold; padding: 2mm 3mm; font-style: italic;">TVA ${tvaRate}%</td>
          <td style="border: 1.5px solid #000; text-align: right; padding: 2mm 3mm; font-weight: bold;"><span style="float: left;">$</span></td>
          <td style="border: 1.5px solid #000; text-align: right; padding: 2mm 3mm; font-weight: bold;"><span style="float: left;">$</span><span style="float: right;">${formatCurrency(tvaAmount)}</span></td>
        </tr>
        <!-- NET A PAYER -->
        <tr>
          <td style="border-left: 1.5px solid #000; border-bottom: 1.5px solid #000; border-right: 1.5px solid #000;"></td>
          <td colspan="2" style="border: 1.5px solid #000; font-weight: bold; padding: 2mm 3mm;">NET A PAYER</td>
          <td style="border: 1.5px solid #000; text-align: right; padding: 2mm 3mm; font-weight: bold;"><span style="float: left;">$</span></td>
          <td style="border: 1.5px solid #000; text-align: right; padding: 2mm 3mm; font-weight: bold;"><span style="float: left;">$</span><span style="float: right;">${formatCurrency(netAPayer)}</span></td>
        </tr>
      </table>
      
      <!-- Texte montant en lettres et mode paiement -->
      <div class="payment-info">
        <p>Nous disons Dollars américains <strong>${numberToWords(netAPayer)}</strong>.</p>
        <p><strong>Paiement via:</strong></p>
        <p style="margin-left: 10px;">☑ Virement bancaire au crédit du compte</p>
      </div>
      
      <!-- Tableau des comptes bancaires -->
      <div class="bank-section">
        <table class="bank-table">
          <thead>
            <tr>
              <th>VILLE</th>
              <th>BANQUE/IMF</th>
              <th>INTITULE</th>
              <th>N°COMPTE</th>
              <th>DEVISE</th>
            </tr>
          </thead>
          <tbody>
            ${bankRows}
          </tbody>
        </table>
      </div>
      
      <div class="signature-section" style="margin-right: 15mm; font-weight: bold;">Service Comptabilité</div>
    </div>
  </div>
</body>
</html>`;
  }

  // ======= TEMPLATE PLACEMENT DU PERSONNEL =======
  if (templateKey === 'placement') {
    const invoiceLines = invoice.lines || [];
    const placementTVAEnabled = invoice.placementTVAEnabled || false;
    const chargesTTCMode = invoice.chargesTTCMode !== false;
    const placementDeduction = invoice.placementDeduction || 0;
    const enablePlacementDeduction = invoice.enablePlacementDeduction === true;
    
    // Debug log
    console.log('PLACEMENT DEBUG:', { enablePlacementDeduction, placementDeduction, raw: invoice.enablePlacementDeduction });
    
    // Calculer les totaux
    let totalSalairesNets = 0;
    let totalCharges = 0;
    
    // Générer les lignes de données
    let placementLinesHTML = '';
    invoiceLines.forEach((line: any) => {
      const effectif = line.quantity || 0;
      const nbJours = parseInt(line.description) || 0;
      const salairesNets = line.unitPrice || 0;
      const charges = line.chargesTTC || 0;
      const remunerations = salairesNets + charges;
      
      totalSalairesNets += salairesNets;
      totalCharges += charges;
      
      placementLinesHTML += `
        <tr>
          <td style="text-align: center; padding: 2mm 3mm; font-size: 10pt; border: 1.5px solid #000;">${effectif}</td>
          <td style="text-align: center; padding: 2mm 3mm; font-size: 10pt; border: 1.5px solid #000;">${nbJours}</td>
          <td style="text-align: right; padding: 2mm 3mm; font-size: 10pt; border: 1.5px solid #000;">$ ${formatCurrency(salairesNets)}</td>
          <td style="text-align: right; padding: 2mm 3mm; font-size: 10pt; border: 1.5px solid #000;">$ ${formatCurrency(charges)}</td>
          <td style="text-align: right; padding: 2mm 3mm; font-size: 10pt; border: 1.5px solid #000;">$ ${formatCurrency(remunerations)}</td>
        </tr>
      `;
    });

    const sommeRemunerations = totalSalairesNets + totalCharges;
    const tvaOnRemunerations = placementTVAEnabled ? sommeRemunerations * 0.16 : 0; // TVA sur rémunérations brutes
    const totalGeneral = sommeRemunerations + tvaOnRemunerations;
    const netAPayer = totalGeneral - placementDeduction;
    const chargesLabel = chargesTTCMode ? 'Charges TTC' : 'Charges';

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${invoice.invoiceNumber}</title>
  <style>
    @page { size: A4; margin: 0mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 10pt;
      color: #000;
      background: #555;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .toolbar {
      background: #333;
      padding: 12px 24px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .toolbar button {
      background: #667eea;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
    }
    .toolbar button.secondary { background: #4a5568; }
    .toolbar .title { color: white; font-size: 16px; font-weight: 600; margin-right: 20px; }
    .zoom-controls { display: flex; align-items: center; gap: 8px; margin-right: 15px; }
    .zoom-controls button { width: 32px; height: 32px; padding: 0; font-size: 18px; font-weight: bold; }
    .zoom-controls span { color: white; font-size: 13px; min-width: 50px; text-align: center; }
    .page {
      width: 210mm;
      height: 297mm;
      position: relative;
      background-color: white;
      box-shadow: 0 0 30px rgba(0,0,0,0.4);
      overflow: hidden;
    }
    .page-bg {
      position: absolute;
      top: 0; left: 0;
      width: 210mm; height: 297mm;
      z-index: 0;
    }
    .content {
      position: relative;
      z-index: 1;
      padding: 38mm 12mm 22mm 12mm;
    }
    @media print {
      html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
      .toolbar { display: none !important; }
      .page { box-shadow: none !important; margin: 0 !important; }
    }
    .date-header { text-align: right; font-size: 12pt; margin-bottom: 3mm; }
    .admin-title { text-align: center; font-size: 14pt; font-weight: bold; text-decoration: underline; margin-bottom: 3mm; }
    .invoice-number { font-size: 12pt; font-weight: bold; margin-bottom: 2mm; }
    
    /* TABLEAU PLACEMENT - Style amélioré */
    .placement-table {
      width: 95%;
      margin: 0 auto;
      border-collapse: collapse;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10pt;
      border: 1.5px solid #000;
    }
    .placement-table td, .placement-table th {
      border: 1.5px solid #000;
      padding: 2mm 3mm;
      vertical-align: middle;
    }
    .payment-info { margin-top: 4mm; font-size: 10pt; line-height: 1.5; font-family: Arial, Helvetica, sans-serif; }
    .bank-table { width: 95%; margin: 0 auto; border-collapse: collapse; font-size: 8pt; margin-top: 3mm; font-family: Arial, Helvetica, sans-serif; }
    .bank-table th {
      background: rgba(180,180,180,0.5) !important;
      padding: 1.5mm 2mm;
      font-weight: bold;
      border: 1.5px solid #000;
      font-size: 8pt;
    }
    .bank-table td { padding: 1.5mm 2mm; border: 1.5px solid #000; font-size: 8pt; }
    .signature-section { margin-top: 5mm; text-align: right; font-size: 11pt; font-family: Arial, Helvetica, sans-serif; }
  </style>
</head>
<body>
  <div class="toolbar">
    <span class="title">Facture ${invoice.invoiceNumber} - ALL IN ONE (Placement)</span>
    <div class="zoom-controls">
      <button onclick="zoomOut()">−</button>
      <span id="zoomLevel">100%</span>
      <button onclick="zoomIn()">+</button>
    </div>
    <button onclick="window.print()">Imprimer / PDF</button>
    <button class="secondary" onclick="window.close()">Fermer</button>
  </div>

  <script>
    let currentZoom = 100;
    function updateZoom() {
      document.getElementById('zoomLevel').textContent = currentZoom + '%';
      document.querySelector('.page').style.transform = 'scale(' + (currentZoom / 100) + ')';
      document.querySelector('.page').style.transformOrigin = 'top center';
    }
    function zoomIn() { if (currentZoom < 150) { currentZoom += 10; updateZoom(); } }
    function zoomOut() { if (currentZoom > 50) { currentZoom -= 10; updateZoom(); } }
  </script>

  <div class="page">
    <img src="${enteteBase64}" class="page-bg" />
    <div class="content">
      <div class="date-header">Kinshasa, le ${formatDate(invoice.issueDate)}</div>
      <div class="admin-title">ADMINISTRATION ET FINANCES</div>
      <div class="invoice-number">Facture: ${invoice.invoiceNumber}</div>
      
      <!-- TABLEAU PLACEMENT - IDENTIQUE MODELE PAPIER -->
      <table class="placement-table">
        <!-- Ligne 1: Service / Client - fond blanc, police grande et gras -->
        <tr>
          <td colspan="2" style="padding: 2.5mm 4mm; font-size: 10pt; font-weight: bold; border: 1.5px solid #000; white-space: nowrap;">Service : ${serviceName}</td>
          <td colspan="3" style="padding: 2.5mm 4mm; font-size: 10pt; font-weight: bold; border: 1.5px solid #000;">Client: ${client?.companyName || client?.contactName || 'N/A'}</td>
        </tr>
        
        <!-- Ligne 2: Bande tout en NOIR -->
        <tr style="height: 4mm;">
          <td colspan="5" style="background: #000 !important; border: 1.5px solid #000; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact;"></td>
        </tr>
        
        <!-- Ligne 3: Bande GRIS + ROUGE (sans noir au milieu) -->
        <tr style="height: 4mm;">
          <td colspan="2" style="background: #808080 !important; border: 1.5px solid #000; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact;"></td>
          <td colspan="3" style="background: #c04000 !important; border: 1.5px solid #000; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact;"></td>
        </tr>
        
        <!-- Ligne 4: En-têtes des colonnes sur fond blanc - tout sur une ligne -->
        <tr>
          <td style="text-align: center; font-weight: bold; font-size: 9pt; width: 10%; border: 1.5px solid #000; padding: 2mm;">Effectif</td>
          <td style="text-align: center; font-weight: bold; font-size: 9pt; width: 22%; border: 1.5px solid #000; padding: 2mm; white-space: nowrap;">Nbre de Jrs Prestés</td>
          <td style="text-align: center; font-weight: bold; font-size: 9pt; width: 18%; border: 1.5px solid #000; padding: 2mm; white-space: nowrap;">Salaires Nets</td>
          <td style="text-align: center; font-weight: bold; font-size: 9pt; width: 18%; border: 1.5px solid #000; padding: 2mm;">${chargesLabel}</td>
          <td style="text-align: center; font-weight: bold; font-size: 9pt; width: 22%; border: 1.5px solid #000; padding: 2mm; white-space: nowrap;">Rémunérations brutes</td>
        </tr>
        
        <!-- Lignes de données -->
        ${placementLinesHTML}
        
        <!-- SOMME -->
        <tr>
          <td style="border: none;"></td>
          <td style="padding: 2mm 3mm; font-weight: bold; font-size: 10pt; border: 1.5px solid #000;">SOMME</td>
          <td style="text-align: right; padding: 2mm 3mm; font-size: 10pt; border: 1.5px solid #000;">$ ${formatCurrency(totalSalairesNets)}</td>
          <td style="text-align: right; padding: 2mm 3mm; font-size: 10pt; border: 1.5px solid #000;">$ ${formatCurrency(totalCharges)}</td>
          <td style="text-align: right; padding: 2mm 3mm; font-size: 10pt; border: 1.5px solid #000;">$ ${formatCurrency(sommeRemunerations)}</td>
        </tr>
        
        ${placementTVAEnabled ? `
        <!-- TVA 16% -->
        <tr>
          <td style="border: none;"></td>
          <td colspan="3" style="padding: 2mm 3mm; font-weight: bold; font-size: 10pt; border: 1.5px solid #000;">TVA 16%</td>
          <td style="text-align: right; padding: 2mm 3mm; font-size: 10pt; border: 1.5px solid #000;">$ ${formatCurrency(tvaOnRemunerations)}</td>
        </tr>
        ` : ''}
        
        ${enablePlacementDeduction ? `
        <!-- TOTAL GENERAL -->
        <tr>
          <td style="border: none;"></td>
          <td colspan="3" style="padding: 2mm 3mm; font-weight: bold; font-size: 10pt; border: 1.5px solid #000;">TOTAL GENERAL</td>
          <td style="text-align: right; padding: 2mm 3mm; font-weight: bold; font-size: 10pt; border: 1.5px solid #000;">$ ${formatCurrency(totalGeneral)}</td>
        </tr>
        
        <!-- DEDUCTION POUR ABSENCES & RETARDS -->
        <tr>
          <td style="border: none;"></td>
          <td colspan="3" style="padding: 2mm 3mm; font-weight: bold; font-size: 10pt; border: 1.5px solid #000; white-space: nowrap;">DEDUCTION POUR ABSENCES & RETARDS</td>
          <td style="text-align: right; padding: 2mm 3mm; font-size: 10pt; border: 1.5px solid #000;">$ ${placementDeduction > 0 ? '-' + formatCurrency(placementDeduction) : '-'}</td>
        </tr>
        
        <!-- NET A PAYER -->
        <tr>
          <td style="border: none;"></td>
          <td colspan="3" style="padding: 2mm 3mm; font-weight: bold; font-size: 10pt; border: 1.5px solid #000;">NET A PAYER</td>
          <td style="text-align: right; padding: 2mm 3mm; font-weight: bold; font-size: 10pt; border: 1.5px solid #000;">$ ${formatCurrency(netAPayer)}</td>
        </tr>
        ` : `
        <!-- TOTAL GENERAL (sans déduction) -->
        <tr>
          <td style="border: none;"></td>
          <td colspan="3" style="padding: 2mm 3mm; font-weight: bold; font-size: 10pt; border: 1.5px solid #000;">TOTAL GENERAL</td>
          <td style="text-align: right; padding: 2mm 3mm; font-weight: bold; font-size: 10pt; border: 1.5px solid #000;">$ ${formatCurrency(totalGeneral)}</td>
        </tr>
        
        <!-- NET A PAYER (sans déduction = même montant que TOTAL GENERAL) -->
        <tr>
          <td style="border: none;"></td>
          <td colspan="3" style="padding: 2mm 3mm; font-weight: bold; font-size: 10pt; border: 1.5px solid #000;">NET A PAYER</td>
          <td style="text-align: right; padding: 2mm 3mm; font-weight: bold; font-size: 10pt; border: 1.5px solid #000;">$ ${formatCurrency(totalGeneral)}</td>
        </tr>
        `}
      </table>
      
      <div class="payment-info">
        <p>Nous disons Dollars américains <strong>${numberToWords(enablePlacementDeduction ? netAPayer : totalGeneral)}</strong>.</p>
        <p><strong>Paiement via:</strong></p>
        <p>☑ Virement bancaire au crédit du compte</p>
      </div>
      
      <table class="bank-table">
        <thead>
          <tr>
            <th>VILLE</th>
            <th>BANQUE/IMF</th>
            <th>INTITULE</th>
            <th>N°COMPTE</th>
            <th>DEVISE</th>
          </tr>
        </thead>
        <tbody>
          ${bankRows}
        </tbody>
      </table>
      
      <div class="signature-section" style="margin-right: 15mm; font-weight: bold;">Service Comptabilité</div>
    </div>
  </div>
</body>
</html>`;
  }

  // ======= TEMPLATE TRANSFERT DU PERSONNEL =======
  if (templateKey === 'transfert') {
    const invoiceLines = invoice.lines || [];
    const transfertDeduction = invoice.transfertDeduction || 0;
    const enableTransfertDeduction = invoice.enableTransfertDeduction || false;
    
    // Calculer les totaux
    let totalSalairesNets = 0;
    let totalCharges = 0;
    
    // Générer les lignes de données (6 colonnes)
    let transfertLinesHTML = '';
    invoiceLines.forEach((line: any) => {
      const effectif = line.quantity || 0;
      const nbJours = parseInt(line.description) || 0;
      const salairesNets = line.unitPrice || 0;
      const charges = line.chargesTTC || 0;
      const remunerations = salairesNets + charges;
      const tvaLigne = remunerations * 0.16; // TVA sur rémunérations brutes, pas sur charges
      
      totalSalairesNets += salairesNets;
      totalCharges += charges;
      
      transfertLinesHTML += `
        <tr>
          <td style="text-align: center; padding: 3mm 4mm; font-size: 11pt; border: 2px solid #000;">${effectif}</td>
          <td style="text-align: center; padding: 3mm 4mm; font-size: 11pt; border: 2px solid #000;">${nbJours}</td>
          <td style="text-align: right; padding: 3mm 4mm; font-size: 11pt; border: 2px solid #000;">$ ${formatCurrency(salairesNets)}</td>
          <td style="text-align: right; padding: 3mm 4mm; font-size: 11pt; border: 2px solid #000;">$ ${formatCurrency(charges)}</td>
          <td style="text-align: right; padding: 3mm 4mm; font-size: 11pt; border: 2px solid #000;">$ ${formatCurrency(remunerations)}</td>
          <td style="text-align: right; padding: 3mm 4mm; font-size: 11pt; border: 2px solid #000;">$ ${formatCurrency(tvaLigne)}</td>
        </tr>
      `;
    });

    const sommeRemunerations = totalSalairesNets + totalCharges;
    const totalTVA = sommeRemunerations * 0.16; // TVA sur rémunérations brutes
    const totalGeneral = sommeRemunerations + totalTVA;
    const netAPayer = totalGeneral - transfertDeduction;

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${invoice.invoiceNumber}</title>
  <style>
    @page { size: A4; margin: 0mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 10pt;
      color: #000;
      background: #555;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .toolbar {
      background: #333;
      padding: 12px 24px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .toolbar button {
      background: #667eea;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
    }
    .toolbar button.secondary { background: #4a5568; }
    .toolbar .title { color: white; font-size: 16px; font-weight: 600; margin-right: 20px; }
    .zoom-controls { display: flex; align-items: center; gap: 8px; margin-right: 15px; }
    .zoom-controls button { width: 32px; height: 32px; padding: 0; font-size: 18px; font-weight: bold; }
    .zoom-controls span { color: white; font-size: 13px; min-width: 50px; text-align: center; }
    .page {
      width: 210mm;
      height: 297mm;
      position: relative;
      background-color: white;
      box-shadow: 0 0 30px rgba(0,0,0,0.4);
      overflow: hidden;
    }
    .page-bg {
      position: absolute;
      top: 0; left: 0;
      width: 210mm; height: 297mm;
      z-index: 0;
    }
    .content {
      position: relative;
      z-index: 1;
      padding: 38mm 12mm 22mm 12mm;
    }
    @media print {
      html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
      .toolbar { display: none !important; }
      .page { box-shadow: none !important; margin: 0 !important; }
    }
    .date-header { text-align: right; font-size: 12pt; margin-bottom: 3mm; }
    .admin-title { text-align: center; font-size: 14pt; font-weight: bold; text-decoration: underline; margin-bottom: 3mm; }
    .invoice-number { font-size: 12pt; font-weight: bold; margin-bottom: 2mm; }
    
    /* TABLEAU TRANSFERT - Style amélioré */
    .transfert-table {
      width: 100%;
      border-collapse: collapse;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      border: 2px solid #000;
    }
    .transfert-table td, .transfert-table th {
      border: 2px solid #000;
      padding: 3mm 4mm;
      vertical-align: middle;
    }
    .payment-info { margin-top: 4mm; font-size: 11pt; line-height: 1.5; font-family: Arial, Helvetica, sans-serif; }
    .bank-table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 3mm; font-family: Arial, Helvetica, sans-serif; }
    .bank-table th {
      background: rgba(180,180,180,0.5) !important;
      padding: 2mm 3mm;
      font-weight: bold;
      border: 2px solid #000;
      font-size: 9pt;
    }
    .bank-table td { padding: 2mm 3mm; border: 2px solid #000; font-size: 9pt; }
    .signature-section { margin-top: 5mm; text-align: right; font-size: 12pt; font-family: Arial, Helvetica, sans-serif; }
  </style>
</head>
<body>
  <div class="toolbar">
    <span class="title">Facture ${invoice.invoiceNumber} - ALL IN ONE (Transfert)</span>
    <div class="zoom-controls">
      <button onclick="zoomOut()">−</button>
      <span id="zoomLevel">100%</span>
      <button onclick="zoomIn()">+</button>
    </div>
    <button onclick="window.print()">Imprimer / PDF</button>
    <button class="secondary" onclick="window.close()">Fermer</button>
  </div>

  <script>
    let currentZoom = 100;
    function updateZoom() {
      document.getElementById('zoomLevel').textContent = currentZoom + '%';
      document.querySelector('.page').style.transform = 'scale(' + (currentZoom / 100) + ')';
      document.querySelector('.page').style.transformOrigin = 'top center';
    }
    function zoomIn() { if (currentZoom < 150) { currentZoom += 10; updateZoom(); } }
    function zoomOut() { if (currentZoom > 50) { currentZoom -= 10; updateZoom(); } }
  </script>

  <div class="page">
    <img src="${enteteBase64}" class="page-bg" />
    <div class="content">
      <div class="date-header">Kinshasa, le ${formatDate(invoice.issueDate)}</div>
      <div class="admin-title">ADMINISTRATION ET FINANCES</div>
      <div class="invoice-number">Facture: ${invoice.invoiceNumber}</div>
      
      <!-- TABLEAU TRANSFERT - 6 colonnes avec TVA -->
      <table class="transfert-table">
        <!-- Ligne 1: Service / Client - fond blanc, police grande et gras -->
        <tr>
          <td colspan="2" style="padding: 4mm 5mm; font-size: 12pt; font-weight: bold; border: 2px solid #000; white-space: nowrap;">Service : Transfert du Personnel</td>
          <td colspan="4" style="padding: 4mm 5mm; font-size: 12pt; font-weight: bold; border: 2px solid #000;">Client: ${client?.companyName || client?.contactName || 'N/A'}</td>
        </tr>
        
        <!-- Ligne 2: Bande tout en NOIR -->
        <tr style="height: 5mm;">
          <td colspan="6" style="background: #000 !important; border: 2px solid #000; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact;"></td>
        </tr>
        
        <!-- Ligne 3: Bande GRIS + ROUGE -->
        <tr style="height: 5mm;">
          <td colspan="2" style="background: #808080 !important; border: 2px solid #000; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact;"></td>
          <td colspan="4" style="background: #c04000 !important; border: 2px solid #000; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact;"></td>
        </tr>
        
        <!-- Ligne 4: En-têtes des colonnes sur fond blanc - tout sur une ligne -->
        <tr>
          <td style="text-align: center; font-weight: bold; font-size: 10pt; width: 8%; border: 2px solid #000; padding: 3mm;">Effectif</td>
          <td style="text-align: center; font-weight: bold; font-size: 10pt; width: 18%; border: 2px solid #000; padding: 3mm; white-space: nowrap;">Nbre de Jrs Prestés</td>
          <td style="text-align: center; font-weight: bold; font-size: 10pt; width: 16%; border: 2px solid #000; padding: 3mm; white-space: nowrap;">Salaires Nets</td>
          <td style="text-align: center; font-weight: bold; font-size: 10pt; width: 16%; border: 2px solid #000; padding: 3mm;">Charges</td>
          <td style="text-align: center; font-weight: bold; font-size: 10pt; width: 20%; border: 2px solid #000; padding: 3mm; white-space: nowrap;">Rémunérations brutes</td>
          <td style="text-align: center; font-weight: bold; font-size: 10pt; width: 14%; border: 2px solid #000; padding: 3mm;">TVA (16%)</td>
        </tr>
        
        <!-- Lignes de données -->
        ${transfertLinesHTML}
        
        <!-- SOMME -->
        <tr>
          <td style="border: none;"></td>
          <td style="padding: 3mm 4mm; font-weight: bold; font-size: 11pt; border: 2px solid #000;">SOMME</td>
          <td style="text-align: right; padding: 3mm 4mm; font-size: 11pt; border: 2px solid #000;">$ ${formatCurrency(totalSalairesNets)}</td>
          <td style="text-align: right; padding: 3mm 4mm; font-size: 11pt; border: 2px solid #000;">$ ${formatCurrency(totalCharges)}</td>
          <td style="text-align: right; padding: 3mm 4mm; font-size: 11pt; border: 2px solid #000;">$ ${formatCurrency(sommeRemunerations)}</td>
          <td style="text-align: right; padding: 3mm 4mm; font-size: 11pt; border: 2px solid #000;">$ ${formatCurrency(totalTVA)}</td>
        </tr>
        
        <!-- TOTAL GENERAL -->
        <tr>
          <td style="border: none;"></td>
          <td colspan="4" style="padding: 3mm 4mm; font-weight: bold; font-size: 11pt; border-top: 2px solid #000; border-bottom: 2px solid #000; border-left: 2px solid #000; border-right: 2px solid #000;">TOTAL GENERAL</td>
          <td style="text-align: right; padding: 3mm 4mm; font-weight: bold; font-size: 11pt; border: 2px solid #000;">$ ${formatCurrency(totalGeneral)}</td>
        </tr>
        
        ${enableTransfertDeduction ? `
        <!-- DEDUCTION POUR ABSENCES & RETARDS -->
        <tr>
          <td style="border: none;"></td>
          <td colspan="4" style="padding: 3mm 4mm; font-weight: bold; font-size: 11pt; border-top: 2px solid #000; border-bottom: 2px solid #000; border-left: 2px solid #000; border-right: 2px solid #000; white-space: nowrap;">DEDUCTION POUR ABSENCES & RETARDS</td>
          <td style="text-align: right; padding: 3mm 4mm; font-size: 11pt; border: 2px solid #000;">$ ${transfertDeduction > 0 ? '-' + formatCurrency(transfertDeduction) : '-'}</td>
        </tr>
        
        <!-- NET A PAYER -->
        <tr>
          <td style="border: none;"></td>
          <td colspan="4" style="padding: 3mm 4mm; font-weight: bold; font-size: 11pt; border-top: 2px solid #000; border-bottom: 2px solid #000; border-left: 2px solid #000; border-right: 2px solid #000;">NET A PAYER</td>
          <td style="text-align: right; padding: 3mm 4mm; font-weight: bold; font-size: 11pt; border: 2px solid #000;">$ ${formatCurrency(netAPayer)}</td>
        </tr>
        ` : `
        <!-- NET A PAYER (sans déduction = même montant que TOTAL GENERAL) -->
        <tr>
          <td style="border: none;"></td>
          <td colspan="4" style="padding: 3mm 4mm; font-weight: bold; font-size: 11pt; border-top: 2px solid #000; border-bottom: 2px solid #000; border-left: 2px solid #000; border-right: 2px solid #000;">NET A PAYER</td>
          <td style="text-align: right; padding: 3mm 4mm; font-weight: bold; font-size: 11pt; border: 2px solid #000;">$ ${formatCurrency(totalGeneral)}</td>
        </tr>
        `}
      </table>
      
      <div class="payment-info">
        <p>Nous disons Dollars américains <strong>${numberToWords(enableTransfertDeduction ? netAPayer : totalGeneral)}</strong>.</p>
        <p><strong>Paiement via:</strong></p>
        <p>☑ Virement bancaire au crédit du compte</p>
      </div>
      
      <table class="bank-table">
        <thead>
          <tr>
            <th>VILLE</th>
            <th>BANQUE/IMF</th>
            <th>INTITULE</th>
            <th>N°COMPTE</th>
            <th>DEVISE</th>
          </tr>
        </thead>
        <tbody>
          ${bankRows}
        </tbody>
      </table>
      
      <div class="signature-section" style="margin-right: 15mm; font-weight: bold;">Service Comptabilité</div>
    </div>
  </div>
</body>
</html>`;
  }

  // ======= TEMPLATE RÉGULARISATION EUP =======
  if (templateKey === 'regularisation_eup') {
    const invoiceLines = invoice.lines || [];
    
    // Calculer le subtotal à partir des lignes
    let eupSubtotal = 0;
    invoiceLines.forEach((line: any) => {
      eupSubtotal += (line.quantity || 1) * (line.unitPrice || 0);
    });
    const finalSubtotal = invoice.subtotal || eupSubtotal;
    
    // Management Fees 10%
    const mgmtFeeRate = invoice.managementFeeRate || 10;
    const mgmtFees = finalSubtotal * (mgmtFeeRate / 100);
    const totalGeneral = finalSubtotal + mgmtFees;
    
    // Générer les lignes
    let eupLinesHTML = '';
    let lineNum = 1;
    invoiceLines.forEach((line: any) => {
      const lineTotal = (line.quantity || 1) * (line.unitPrice || 0);
      eupLinesHTML += `
        <tr>
          <td style="width: 6%; border: 1.5px solid #000; text-align: center; padding: 2mm 3mm;">${lineNum}</td>
          <td style="width: 34%; border: 1.5px solid #000; padding: 2mm 3mm;">${line.description}</td>
          <td style="width: 12%; border: 1.5px solid #000; text-align: center; padding: 2mm 3mm;">${line.quantity || 1}</td>
          <td style="width: 22%; border: 1.5px solid #000; text-align: right; padding: 2mm 3mm;"><span style="float: left;">$</span><span style="float: right;">${formatCurrency(line.unitPrice || 0)}</span></td>
          <td style="width: 22%; border: 1.5px solid #000; text-align: right; padding: 2mm 3mm;"><span style="float: left;">$</span><span style="float: right;">${formatCurrency(lineTotal)}</span></td>
        </tr>
      `;
      lineNum++;
    });

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${invoice.invoiceNumber}</title>
  <style>${getAllinoneStyles(enteteBase64)}
    .zoom-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-right: 15px;
    }
    .zoom-controls button {
      width: 32px;
      height: 32px;
      padding: 0;
      font-size: 18px;
      font-weight: bold;
    }
    .zoom-controls span {
      color: white;
      font-size: 13px;
      min-width: 50px;
      text-align: center;
    }
    /* Styles spécifiques pour Régularisation EUP - bande noire dans le header */
    .eup-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0;
    }
    .eup-table th, .eup-table td {
      border: 1.5px solid #000;
      padding: 2mm 3mm;
      font-size: 10pt;
    }
    .eup-table .header-white {
      background: #fff;
      font-weight: bold;
    }
    .eup-table .header-black {
      background: #000 !important;
      color: #fff !important;
      font-weight: bold;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .eup-table .col-num { width: 6%; text-align: center; }
    .eup-table .col-desc { width: 42%; font-weight: bold; }
    .eup-table .col-qty { width: 10%; text-align: center; }
    .eup-table .col-pu { width: 20%; text-align: right; }
    .eup-table .col-pt { width: 22%; text-align: right; }
    .eup-table .currency { display: inline-block; width: 12px; text-align: left; }
    .eup-table .amount { display: inline-block; min-width: 45px; text-align: right; }
  </style>
</head>
<body>
  <div class="toolbar">
    <span class="title">Facture ${invoice.invoiceNumber} - ALL IN ONE (Régularisation EUP)</span>
    <div class="zoom-controls">
      <button onclick="zoomOut()">−</button>
      <span id="zoomLevel">100%</span>
      <button onclick="zoomIn()">+</button>
    </div>
    <button onclick="window.print()">Imprimer / PDF</button>
    <button class="secondary" onclick="window.close()">Fermer</button>
  </div>

  <script>
    let currentZoom = 100;
    function updateZoom() {
      document.getElementById('zoomLevel').textContent = currentZoom + '%';
      document.querySelector('.page').style.transform = 'scale(' + (currentZoom / 100) + ')';
      document.querySelector('.page').style.transformOrigin = 'top center';
    }
    function zoomIn() {
      if (currentZoom < 150) { currentZoom += 10; updateZoom(); }
    }
    function zoomOut() {
      if (currentZoom > 50) { currentZoom -= 10; updateZoom(); }
    }
  </script>

  <div class="page">
    <div class="content">
      <!-- Date en haut à droite -->
      <div class="date-header">
        Kinshasa, le ${formatDate(invoice.issueDate)}
      </div>
      
      <!-- Titre ADMINISTRATION ET FINANCES -->
      <div class="admin-title">ADMINISTRATION ET FINANCES</div>
      
      <!-- Numéro de facture -->
      <div class="invoice-number">
        Facture: ${invoice.invoiceNumber}
      </div>
      
      <!-- Tableau Régularisation EUP - Tout intégré avec ligne verticale continue -->
      <table style="width: 85%; border-collapse: collapse; font-size: 12pt; margin: 0 auto;">
        <!-- Ligne Service / Client -->
        <tr>
          <td colspan="2" style="width: 40%; border: 1.5px solid #000; padding: 2mm 3mm; background: #fff; font-weight: bold; white-space: nowrap;">Service : ${serviceName}</td>
          <td colspan="3" style="width: 60%; border: 1.5px solid #000; padding: 2mm 3mm; background: #fff; font-weight: bold;">Client: ${client?.companyName || client?.contactName || 'N/A'}</td>
        </tr>
        <!-- Bande noire de bout en bout (même épaisseur que la bande rouge) -->
        <tr>
          <td colspan="2" style="background: #000; border-left: 1.5px solid #000; border-right: 1.5px solid #000; padding: 3mm 3mm; -webkit-print-color-adjust: exact; print-color-adjust: exact;"></td>
          <td colspan="3" style="background: #000; border-right: 1.5px solid #000; padding: 3mm 3mm; -webkit-print-color-adjust: exact; print-color-adjust: exact;"></td>
        </tr>
        <!-- Ligne N° / Description seule -->
        <tr>
          <td style="width: 6%; border: 1.5px solid #000; border-top: none; font-weight: bold; text-align: center; padding: 2mm 3mm; background: #fff;">N°</td>
          <td style="width: 34%; border: 1.5px solid #000; border-top: none; font-weight: bold; padding: 2mm 3mm; background: #fff;">Description</td>
          <td colspan="3" style="border: 1.5px solid #000; border-top: none; background: #c00; -webkit-print-color-adjust: exact; print-color-adjust: exact;"></td>
        </tr>
        <!-- Ligne Qté / P.U / P.T -->
        <tr>
          <td style="width: 6%; border: 1.5px solid #000; border-top: none;"></td>
          <td style="width: 34%; border: 1.5px solid #000; border-top: none;"></td>
          <td style="width: 12%; border: 1.5px solid #000; font-weight: bold; text-align: center; padding: 2mm 3mm; background: #fff;">Qté</td>
          <td style="width: 22%; border: 1.5px solid #000; font-weight: bold; text-align: center; padding: 2mm 3mm; background: #fff;">P.U</td>
          <td style="width: 22%; border: 1.5px solid #000; font-weight: bold; text-align: center; padding: 2mm 3mm; background: #fff;">P.T</td>
        </tr>
        <!-- Lignes de données -->
        ${eupLinesHTML}
        <!-- TOTAL -->
        <tr>
          <td style="border: 1.5px solid #000;"></td>
          <td style="border: 1.5px solid #000; font-weight: bold; padding: 2mm 3mm;">TOTAL</td>
          <td style="border: 1.5px solid #000; background: #555; -webkit-print-color-adjust: exact; print-color-adjust: exact;"></td>
          <td style="border: 1.5px solid #000; text-align: right; padding: 2mm 3mm; font-weight: bold;"><span style="float: left;">$</span></td>
          <td style="border: 1.5px solid #000; text-align: right; padding: 2mm 3mm; font-weight: bold;"><span style="float: left;">$</span><span style="float: right;">${formatCurrency(finalSubtotal)}</span></td>
        </tr>
        <!-- MANAGEMENT FEES - pas de ligne verticale entre Description et Qté -->
        <tr>
          <td style="border-left: 1.5px solid #000; border-top: 1.5px solid #000; border-right: 1.5px solid #000;"></td>
          <td colspan="2" style="border: 1.5px solid #000; font-weight: bold; padding: 2mm 3mm; font-style: italic;">MANAGEMENT FEES ${mgmtFeeRate}%</td>
          <td style="border: 1.5px solid #000; text-align: right; padding: 2mm 3mm; font-weight: bold;"><span style="float: left;">$</span></td>
          <td style="border: 1.5px solid #000; text-align: right; padding: 2mm 3mm; font-weight: bold;"><span style="float: left;">$</span><span style="float: right;">${formatCurrency(mgmtFees)}</span></td>
        </tr>
        <!-- TOTAL GENERAL - pas de ligne verticale entre Description et Qté -->
        <tr>
          <td style="border-left: 1.5px solid #000; border-bottom: 1.5px solid #000; border-right: 1.5px solid #000;"></td>
          <td colspan="2" style="border: 1.5px solid #000; font-weight: bold; padding: 2mm 3mm;">TOTAL GENERAL</td>
          <td style="border: 1.5px solid #000; text-align: right; padding: 2mm 3mm; font-weight: bold;"><span style="float: left;">$</span></td>
          <td style="border: 1.5px solid #000; text-align: right; padding: 2mm 3mm; font-weight: bold;"><span style="float: left;">$</span><span style="float: right;">${formatCurrency(totalGeneral)}</span></td>
        </tr>
      </table>
      
      <!-- Texte montant en lettres et mode paiement -->
      <div class="payment-info">
        <p>Nous disons Dollars américains <strong>${numberToWords(totalGeneral)}</strong>.</p>
        <p><strong>Paiement via:</strong></p>
        <p style="margin-left: 10px;">☑ Virement bancaire au crédit du compte</p>
      </div>
      
      <!-- Tableau des comptes bancaires -->
      <div class="bank-section">
        <table class="bank-table">
          <thead>
            <tr>
              <th>VILLE</th>
              <th>BANQUE/IMF</th>
              <th>INTITULE</th>
              <th>N°COMPTE</th>
              <th>DEVISE</th>
            </tr>
          </thead>
          <tbody>
            ${bankRows}
          </tbody>
        </table>
      </div>
      
      <!-- Signature -->
      <div class="signature-section">
        <div style="text-align: right; margin-right: 15mm; font-weight: bold;">Service Comptabilité</div>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  // ======= TEMPLATE STANDARD (Création Entreprise, ASBL, etc.) =======
  // Générer les lignes du tableau standard
  let linesHTML = '';
  let lineNum = 1;
  
  (invoice.lines || []).forEach((line: any) => {
    const lineTotal = (line.quantity || 1) * (line.unitPrice || 0);
    linesHTML += `
      <tr>
        <td class="col-num">${lineNum}.</td>
        <td class="col-desc">${line.description}</td>
        <td class="col-qty">${line.quantity || 1}</td>
        <td class="col-pu"><span class="currency">$</span><span class="amount">${formatCurrency(line.unitPrice || 0)}</span></td>
        <td class="col-pt"><span class="currency">$</span><span class="amount">${formatCurrency(lineTotal)}</span></td>
      </tr>
    `;
    lineNum++;
  });
  
  // Section des totaux standard
  let totalsHTML = `
    <div class="totals-section">
      <div class="total-row">
        <div class="total-col-num"></div>
        <div class="total-label" style="width: 72%; border-right: 1.5px solid #000;">TOTAL</div>
        <div class="total-value"><span class="currency">$</span><span class="amount">${formatCurrency(subtotal)}</span></div>
      </div>
  `;
  
  if (extraFeesLabel && extraFees > 0) {
    totalsHTML += `
      <div class="total-row">
        <div class="total-col-num"></div>
        <div class="total-label" style="width: 72%; border-right: 1.5px solid #000;">${extraFeesLabel}</div>
        <div class="total-value"><span class="currency">$</span><span class="amount">${formatCurrency(extraFees)}</span></div>
      </div>
    `;
  }
  
  totalsHTML += `
      <div class="total-row">
        <div class="total-col-num"></div>
        <div class="total-label" style="width: 72%; border-right: 1.5px solid #000;">TOTAL GENERAL</div>
        <div class="total-value"><span class="currency">$</span><span class="amount">${formatCurrency(total)}</span></div>
      </div>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${invoice.invoiceNumber}</title>
  <style>${getAllinoneStyles(enteteBase64)}
    .zoom-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-right: 15px;
    }
    .zoom-controls button {
      width: 32px;
      height: 32px;
      padding: 0;
      font-size: 18px;
      font-weight: bold;
    }
    .zoom-controls span {
      color: white;
      font-size: 13px;
      min-width: 50px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span class="title">Facture ${invoice.invoiceNumber} - ALL IN ONE</span>
    <div class="zoom-controls">
      <button onclick="zoomOut()">−</button>
      <span id="zoomLevel">100%</span>
      <button onclick="zoomIn()">+</button>
    </div>
    <button onclick="window.print()">Imprimer / PDF</button>
    <button class="secondary" onclick="window.close()">Fermer</button>
  </div>

  <script>
    let currentZoom = 100;
    function updateZoom() {
      document.getElementById('zoomLevel').textContent = currentZoom + '%';
      document.querySelector('.page').style.transform = 'scale(' + (currentZoom / 100) + ')';
      document.querySelector('.page').style.transformOrigin = 'top center';
    }
    function zoomIn() {
      if (currentZoom < 150) { currentZoom += 10; updateZoom(); }
    }
    function zoomOut() {
      if (currentZoom > 50) { currentZoom -= 10; updateZoom(); }
    }
  </script>

  <div class="page">
    <div class="content">
      <!-- Date en haut à droite -->
      <div class="date-header">
        Kinshasa, le ${formatDate(invoice.issueDate)}
      </div>
      
      <!-- Titre ADMINISTRATION ET FINANCES -->
      <div class="admin-title">ADMINISTRATION ET FINANCES</div>
      
      <!-- Numéro de facture -->
      <div class="invoice-number">
        Facture: ${invoice.invoiceNumber}
      </div>
      
      <!-- Cadre Service / Client -->
      <div class="service-client-box">
        <div class="service-client-row">
          <div class="service-cell">Service : ${serviceName}</div>
          <div class="client-cell">Client: ${client?.companyName || client?.contactName || 'N/A'}</div>
        </div>
      </div>
      
      <!-- Bande noire -->
      <div class="black-band"></div>
      
      <!-- Tableau des prestations -->
      <table class="invoice-table">
        <thead>
          <tr>
            <th class="col-num">N°</th>
            <th class="col-desc">Description</th>
            <th class="col-qty">Qté</th>
            <th class="col-pu">P.U</th>
            <th class="col-pt">P.T</th>
          </tr>
        </thead>
        <tbody>
          ${linesHTML}
        </tbody>
      </table>
      
      <!-- Totaux -->
      ${totalsHTML}
      
      <!-- Texte montant en lettres et mode paiement -->
      <div class="payment-info">
        <p>Nous disons Dollars américains <strong>${numberToWords(total)}</strong>.</p>
        <p><strong>Paiement via:</strong></p>
        <p style="margin-left: 10px;">☑ Virement bancaire au crédit du compte</p>
      </div>
      
      <!-- Tableau des comptes bancaires -->
      <div class="bank-section">
        <table class="bank-table">
          <thead>
            <tr>
              <th>VILLE</th>
              <th>BANQUE/IMF</th>
              <th>INTITULE</th>
              <th>N°COMPTE</th>
              <th>DEVISE</th>
            </tr>
          </thead>
          <tbody>
            ${bankRows}
          </tbody>
        </table>
      </div>
      
      <!-- Signature -->
      <div class="signature-section">
        <div style="text-align: right; margin-right: 15mm; font-weight: bold;">Service Comptabilité</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  const access = await checkAccess(request);
  if (!access.authorized) {
    return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID de facture requis' }, { status: 400 });
    }
    
    const invoice = await invoiceService.getInvoiceById(id);
    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Facture non trouvée' }, { status: 404 });
    }

    // Le client est déjà inclus dans invoice.client grâce à Prisma
    const client = invoice.client;
    
    let enteteBase64 = '';
    const entetePath = path.join(process.cwd(), 'public', 'entete.jpg');
    if (fs.existsSync(entetePath)) {
      const enteteBuffer = fs.readFileSync(entetePath);
      enteteBase64 = `data:image/jpeg;base64,${enteteBuffer.toString('base64')}`;
    }

    // Déterminer l'entreprise et le type de facture
    const company = (invoice as any).company || 'icones';
    const template = (invoice as any).template || 'facture_a';
    
    // Charger le bon en-tête selon l'entreprise
    if (company === 'allinone') {
      // En-tête ALL IN ONE
      const enteteAioPath = path.join(process.cwd(), 'public', 'entete-allinone.jpg');
      if (fs.existsSync(enteteAioPath)) {
        const enteteBuffer = fs.readFileSync(enteteAioPath);
        enteteBase64 = `data:image/jpeg;base64,${enteteBuffer.toString('base64')}`;
      }
    }
    
    let html = '';
    
    // Générer le HTML selon l'entreprise
    if (company === 'allinone') {
      // Factures ALL IN ONE
      html = generateAllinoneHTML(invoice, client, enteteBase64);
    } else {
      // Factures ICONES
      if (template === 'facture_b' || template === 'proforma_b') {
        html = generateFactureBHTML(invoice, client, enteteBase64);
      } else if (template === 'proforma' || template === 'proforma_a') {
        html = generateProformaHTML(invoice, client, enteteBase64);
      } else {
        html = generateTravauxHTML(invoice, client, enteteBase64);
      }
    }
    
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error: any) {
    console.error('Generate invoice error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
