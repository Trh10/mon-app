import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session.organizationId || !session.userId) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const monthKey = `${year}-${month}`;
    
    console.log(`[PDF Month] Getting requisitions for ${monthKey} and org ${session.organizationId}`);

    const db: any = prisma;
    const list = await db.requisition.findMany({
      where: {
        organizationId: session.organizationId,
        status: 'approuve',
        approvedAt: { gte: new Date(`${year}-${month}-01`), lt: new Date(`${year}-${parseInt(month)+1}-01`) }
      },
      include: { workflow: true, requester: { select: { name: true } } }
    });
    
    console.log(`[PDF Month] Found ${list.length} approved requisitions`);

    // Create PDF avec jsPDF
    console.log('[PDF Month jsPDF] Importing jsPDF...');
    const { jsPDF } = await import('jspdf');
    console.log('[PDF Month jsPDF] jsPDF imported successfully');
    
    const doc = new jsPDF();
    console.log('[PDF Month jsPDF] PDF document created');

    // Header avec style amélioré
    const monthLabel = now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('RAPPORT OFFICIEL DES RÉQUISITIONS APPROUVÉES', 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(`Période : ${monthLabel}`, 105, 30, { align: 'center' });
    
    // Informations administratives
    doc.setFontSize(10);
    let y = 45;
    const lineHeight = 6;
    
    const currentDate = new Date().toLocaleDateString('fr-FR');
    doc.text(`Document établi le : ${currentDate}`, 20, y);
    y += lineHeight;
    doc.text(`Entreprise : ${session.organizationId}`, 20, y);
    y += lineHeight;
    doc.text(`Édité par : ${session.userName || 'Utilisateur'} (${session.userRole || 'Personnel autorisé'})`, 20, y);
    y += lineHeight;
    doc.text(`Statut : Document officiel certifié`, 20, y);
    y += lineHeight * 2;

    if (list.length === 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'italic');
      doc.text(`Aucune réquisition n'a été approuvée pour la période de ${monthLabel}.`, 20, y);
      y += lineHeight * 2;
      doc.setFont('helvetica', 'normal');
      doc.text("Ce rapport atteste de l'absence d'approbations durant cette période.", 20, y);
    } else {
      // Summary avec style professionnel
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text("SYNTHÈSE DES APPROBATIONS :", 20, y);
      y += lineHeight;
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Nombre total de réquisitions approuvées : ${list.length}`, 20, y);
      y += lineHeight;
      const total = list.reduce((sum: number, r: any) => sum + (r.budget || 0), 0);
      doc.setFont('helvetica', 'bold');
      doc.text(`Montant total approuvé : ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(total)}`, 20, y);
      doc.setFont('helvetica', 'normal');
      y += lineHeight * 2;

      // Table headers avec style amélioré
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text("DÉTAIL DES RÉQUISITIONS APPROUVÉES :", 20, y);
      y += lineHeight;
      
      // En-têtes de colonnes
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Référence', 20, y);
      doc.text('Objet', 50, y);
      doc.text('Montant', 120, y);
      doc.text('Date', 150, y);
      doc.text('Approbateur', 180, y);
      y += lineHeight;
      
      // Ligne de séparation
      doc.line(20, y, 200, y);
      y += lineHeight / 2;

      // Table content avec formatage amélioré
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      list.forEach((r: any) => {
        const approver = (r.workflow && r.workflow.length > 0)
          ? (r.workflow[r.workflow.length - 1].reviewerName || 'DG')
          : 'DG';
        
        doc.text(r.id.substring(0, 8), 20, y);
        doc.text(r.title.substring(0, 25), 50, y);
        doc.text(`${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(r.budget || 0)}`, 120, y);
        doc.text(new Date(r.approvedAt).toLocaleDateString('fr-FR'), 150, y);
        doc.text(approver.substring(0, 15), 180, y);
        y += lineHeight;
        
        // Nouvelle page si nécessaire
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });
      
      // Conclusion du rapport
      y += lineHeight * 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text("CERTIFICATION :", 20, y);
      y += lineHeight;
      doc.setFont('helvetica', 'normal');
      doc.text("Ce rapport certifie l'exactitude des informations présentées ci-dessus.", 20, y);
      y += lineHeight;
      doc.text("Toutes les réquisitions listées ont été dûment approuvées par la Direction Générale.", 20, y);
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
