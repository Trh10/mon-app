import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
// pdfkit sera importé dynamiquement pour le runtime Node
import { getRequisitionsByCompany } from '@/lib/requisitions/requisition-store';
import fs from 'fs';
import { Buffer } from 'buffer';

export const runtime = 'nodejs';

async function getCurrentUser() {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('user-session');
    if (!sessionCookie) return null;
    return JSON.parse(sessionCookie.value);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    console.log('[PDF Month] Monthly PDF report generation start');
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }
    // Restrict to Finance (6) and DG (10)
    if (![6, 10].includes(user.level)) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const monthKey = `${year}-${month}`;
    
    console.log(`[PDF Month] Getting requisitions for ${monthKey} and company ${user.companyId}`);

    const list = getRequisitionsByCompany(user.companyId)
      .filter((r: any) => r.status === 'approuve' && r.approvedAt && r.approvedAt.startsWith(monthKey));
    
    console.log(`[PDF Month] Found ${list.length} approved requisitions`);

    // Create PDF
    console.log('[PDF Month] Importing PDFKit...');
    const PDFDocument = (await import('pdfkit')).default;
    console.log('[PDF Month] PDFKit imported successfully');
    const doc = new PDFDocument({ margin: 50 });
    console.log('[PDF Month] PDF document created');

    // Enregistrer une police système pour éviter Helvetica.afm
    console.log('[PDF Month] Searching for system fonts...');
    const fontCandidates = [
      'C:/Windows/Fonts/arial.ttf',
      'C:/Windows/Fonts/Arial.ttf',
      'C:/Windows/Fonts/calibri.ttf',
      'C:/Windows/Fonts/Calibri.ttf',
      'C:/Windows/Fonts/segoeui.ttf',
      'C:/Windows/Fonts/tahoma.ttf',
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
      '/Library/Fonts/Arial.ttf',
      '/System/Library/Fonts/Supplemental/Arial.ttf'
    ];
    
    let fontFound = false;
    for (const fontPath of fontCandidates) {
      try {
        if (fs.existsSync(fontPath)) {
          console.log(`[PDF Month] Font found: ${fontPath}`);
          doc.registerFont('AppFont', fontPath);
          doc.font('AppFont');
          fontFound = true;
          break;
        }
      } catch (e) {
        console.warn(`[PDF Month] Error checking font ${fontPath}:`, e);
      }
    }
    
    if (!fontFound) {
      console.log('[PDF Month] No custom fonts found, using default');
    }
    
    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));
    
    // Header
    const monthLabel = now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
    doc.fontSize(16).text(`Rapport des réquisitions approuvées`, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`${monthLabel}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Entreprise: ${user.companyId || user.companyCode}`, { align: 'left' });
    doc.text(`Généré par: ${user.name} (${user.levelName || 'Autorisé'})`, { align: 'left' });
    doc.text(`Date: ${now.toISOString().split('T')[0]}`);
    doc.moveDown();

    if (list.length === 0) {
      doc.fontSize(12).text(`Aucune réquisition approuvée pour ${monthLabel}.`);
    } else {
      // Table-like content
      doc.fontSize(12).text(`Total éléments: ${list.length}`);
      const total = list.reduce((sum: number, r: any) => sum + (r.budget || 0), 0);
      doc.text(`Total approuvé: $${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(total)}`);
      doc.moveDown();

      doc.fontSize(11).text(`ID`, { continued: true, width: 80 });
      doc.text(`Objet`, { continued: true, width: 200 });
      doc.text(`Montant`, { continued: true, width: 100 });
      doc.text(`Date`, { continued: true, width: 140 });
      doc.text(`Approbateur`);
      doc.moveDown(0.5);

      list.forEach((r: any) => {
        const approver = (r.workflow && r.workflow.length > 0)
          ? (r.workflow[r.workflow.length - 1].reviewerName || 'DG')
          : 'DG';
        doc.fontSize(10)
          .text(r.id, { continued: true, width: 80 })
          .text(r.title, { continued: true, width: 200 })
          .text(`$${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(r.budget || 0)}`, { continued: true, width: 100 })
          .text(r.approvedAt, { continued: true, width: 140 })
          .text(approver);
      });
    }

    doc.end();
    
    // Attendre que le PDF soit complètement généré
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on('error', (err: Error) => reject(err));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
    });
    
    console.log('[PDF Month] PDF generation completed successfully');
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="approbations-${monthKey}.pdf"`
      }
    });
  } catch (err: any) {
    console.error('[PDF Month] Error generating PDF:', err);
    return NextResponse.json({ 
      success: false, 
      error: 'Erreur génération PDF', 
      details: String(err?.message || err),
      stack: err?.stack
    }, { status: 500 });
  }
}
