import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getRequisitionsByCompany } from '@/lib/requisitions/requisition-store';

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
    
    console.log(`[PDF Month jsPDF] Getting requisitions for ${monthKey} and company ${user.companyId}`);

    const list = getRequisitionsByCompany(user.companyId)
      .filter((r: any) => r.status === 'approuve' && r.approvedAt && r.approvedAt.startsWith(monthKey));
    
    console.log(`[PDF Month jsPDF] Found ${list.length} approved requisitions`);

    // Create PDF avec jsPDF
    console.log('[PDF Month jsPDF] Importing jsPDF...');
    const { jsPDF } = await import('jspdf');
    console.log('[PDF Month jsPDF] jsPDF imported successfully');
    
    const doc = new jsPDF();
    console.log('[PDF Month jsPDF] PDF document created');

    // Header
    const monthLabel = now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
    doc.setFontSize(16);
    doc.text('Rapport des réquisitions approuvées', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(monthLabel, 105, 30, { align: 'center' });
    
    doc.setFontSize(10);
    let y = 45;
    const lineHeight = 6;
    
    doc.text(`Entreprise: ${user.companyId}`, 20, y);
    y += lineHeight;
    doc.text(`Généré par: ${user.name} (${user.levelName || 'Autorisé'})`, 20, y);
    y += lineHeight;
    doc.text(`Date: ${now.toISOString()}`, 20, y);
    y += lineHeight * 2;

    if (list.length === 0) {
      doc.setFontSize(12);
      doc.text(`Aucune réquisition approuvée pour ${monthLabel}.`, 20, y);
    } else {
      // Summary
      doc.setFontSize(12);
      doc.text(`Total éléments: ${list.length}`, 20, y);
      y += lineHeight;
      const total = list.reduce((sum: number, r: any) => sum + (r.budget || 0), 0);
      doc.text(`Total approuvé: $${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(total)}`, 20, y);
      y += lineHeight * 2;

      // Table headers
      doc.setFontSize(11);
      doc.text('ID', 20, y);
      doc.text('Objet', 50, y);
      doc.text('Montant', 120, y);
      doc.text('Date', 150, y);
      doc.text('Approbateur', 180, y);
      y += lineHeight;

      // Table content
      doc.setFontSize(10);
      list.forEach((r: any) => {
        const approver = (r.workflow && r.workflow.length > 0)
          ? (r.workflow[r.workflow.length - 1].reviewerName || 'DG')
          : 'DG';
        
        doc.text(r.id, 20, y);
        doc.text(r.title.substring(0, 20), 50, y);
        doc.text(`$${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(r.budget || 0)}`, 120, y);
        doc.text(r.approvedAt, 150, y);
        doc.text(approver, 180, y);
        y += lineHeight;
        
        // Nouvelle page si nécessaire
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });
    }

    const pdfOutput = doc.output('arraybuffer');
    
    console.log('[PDF Month jsPDF] PDF generation completed successfully');
    return new NextResponse(new Uint8Array(pdfOutput), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="approbations-${monthKey}.pdf"`
      }
    });
  } catch (err: any) {
    console.error('[PDF Month jsPDF] Error generating PDF:', err);
    return NextResponse.json({ 
      success: false, 
      error: 'Erreur génération PDF', 
      details: String(err?.message || err) 
    }, { status: 500 });
  }
}
