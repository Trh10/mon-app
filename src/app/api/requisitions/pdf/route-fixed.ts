// Alternative avec jsPDF au lieu de PDFKit
import { NextRequest, NextResponse } from 'next/server';
import { getRequisitions } from '@/lib/requisitions/requisition-store';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    console.log('[PDF-jsPDF] Single requisition PDF generation start');
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID requisition manquant' }, { status: 400 });
    }
    const reqs = getRequisitions();
    const r = reqs.find(r => r.id === id);
    if (!r) {
      return NextResponse.json({ error: 'Réquisition introuvable' }, { status: 404 });
    }
    if (r.status !== 'approuve' || !r.approvedAt) {
      return NextResponse.json({ error: 'Réquisition non approuvée définitivement' }, { status: 400 });
    }
    
    // Génération PDF avec jsPDF
    console.log('[PDF-jsPDF] Importing jsPDF...');
    const { jsPDF } = await import('jspdf');
    console.log('[PDF-jsPDF] jsPDF imported successfully');
    
    const doc = new jsPDF();
    console.log('[PDF-jsPDF] PDF document created');
    
    // En-tête
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("ATTESTATION D'APPROBATION DE RÉQUISITION", 105, 20, { align: 'center' });
    
    // Date et lieu
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const currentDate = new Date().toLocaleDateString('fr-FR');
    doc.text(`Fait le ${currentDate}`, 20, 35);
    
    // Message d'attestation professionnel
    let y = 50;
    const lineHeight = 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    // Trouver le DG
    const dgStep = [...r.workflow].reverse().find((s: any) => s.reviewerLevel === 10 && s.action === 'approved');
    const dgName = dgStep ? dgStep.reviewerName : 'Le Directeur Général';
    
    doc.text("Je soussigné(e), atteste par la présente que la réquisition ci-dessous", 20, y);
    y += lineHeight;
    doc.text("a été dûment examinée et approuvée par la Direction Générale de l'entreprise", 20, y);
    y += lineHeight;
    doc.text("conformément aux procédures internes en vigueur.", 20, y);
    y += lineHeight * 2;
    
    // Détails de la réquisition avec style amélioré
    doc.setFont('helvetica', 'bold');
    doc.text("DÉTAILS DE LA RÉQUISITION :", 20, y);
    y += lineHeight;
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Référence : ${r.id}`, 20, y);
    y += lineHeight;
    doc.text(`Objet : ${r.title}`, 20, y);
    y += lineHeight;
    doc.text(`Description : ${r.description}`, 20, y);
    y += lineHeight;
    doc.text(`Catégorie : ${r.category}`, 20, y);
    y += lineHeight;
    doc.setFont('helvetica', 'bold');
    doc.text(`Montant approuvé : ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(r.budget)}`, 20, y);
    doc.setFont('helvetica', 'normal');
    y += lineHeight;
    doc.text(`Justification : ${r.justification}`, 20, y);
    y += lineHeight;
    doc.text(`Demandeur : ${r.requesterName} (${r.requesterId})`, 20, y);
    y += lineHeight;
    doc.text(`Date de demande : ${new Date(r.createdAt).toLocaleDateString('fr-FR')}`, 20, y);
    y += lineHeight;
    doc.text(`Date d'approbation : ${new Date(r.approvedAt).toLocaleDateString('fr-FR')}`, 20, y);
    y += lineHeight;
    doc.text(`Approuvé par : ${dgName}`, 20, y);
    
    if (dgStep && dgStep.comment) {
      y += lineHeight;
      doc.text(`Observations : ${dgStep.comment}`, 20, y);
    }
    
    y += lineHeight * 2;
    
    // Message de validation officielle
    doc.setFont('helvetica', 'bold');
    doc.text("CERTIFICATION :", 20, y);
    y += lineHeight;
    doc.setFont('helvetica', 'normal');
    doc.text("Cette attestation certifie que la réquisition susmentionnée a reçu", 20, y);
    y += lineHeight;
    doc.text("l'autorisation formelle de la Direction Générale et peut être mise en œuvre", 20, y);
    y += lineHeight;
    doc.text("selon les modalités définies dans la demande.", 20, y);
    y += lineHeight * 3;
    
    // Section signature corrigée
    doc.setFont('helvetica', 'bold');
    doc.text("SIGNATURE DU DEMANDEUR :", 20, y);
    y += lineHeight;
    doc.setFont('helvetica', 'normal');
    doc.text("Je certifie avoir pris connaissance de l'approbation de ma demande", 20, y);
    y += lineHeight;
    doc.text("et m'engage à respecter les conditions énoncées.", 20, y);
    y += lineHeight * 2;
    
    doc.text(`Nom : ${r.requesterName}`, 20, y);
    y += lineHeight;
    doc.text("Date : ____________________", 20, y);
    y += lineHeight;
    doc.text("Signature : ____________________", 20, y);
    
    // Générer le PDF
    const pdfOutput = doc.output('arraybuffer');
    
    console.log('[PDF-jsPDF] PDF generation completed successfully');
    return new NextResponse(new Uint8Array(pdfOutput), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="approbation-${r.id}.pdf"`
      }
    });
  } catch (error) {
    console.error('[PDF-jsPDF] Error generating PDF:', error);
    return NextResponse.json({
      error: 'Erreur lors de la génération du PDF',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
