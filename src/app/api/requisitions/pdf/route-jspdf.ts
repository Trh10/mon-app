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
    doc.setFontSize(16);
    doc.text("ATTESTATION D'APPROBATION DE RÉQUISITION", 105, 20, { align: 'center' });
    
    // Contenu
    doc.setFontSize(12);
    let y = 40;
    const lineHeight = 8;
    
    doc.text(`Objet: ${r.title}`, 20, y);
    y += lineHeight;
    doc.text(`Description: ${r.description}`, 20, y);
    y += lineHeight;
    doc.text(`Catégorie: ${r.category}`, 20, y);
    y += lineHeight;
    doc.text(`Montant: $${r.budget}`, 20, y);
    y += lineHeight;
    doc.text(`Justification: ${r.justification}`, 20, y);
    y += lineHeight;
    doc.text(`Demandeur: ${r.requesterName} (${r.requesterId})`, 20, y);
    y += lineHeight;
    doc.text(`Date de création: ${r.createdAt}`, 20, y);
    y += lineHeight;
    doc.text(`Date d'approbation finale: ${r.approvedAt}`, 20, y);
    y += lineHeight;
    
    // Trouver le DG
    const dgStep = [...r.workflow].reverse().find((s: any) => s.reviewerLevel === 10 && s.action === 'approved');
    if (dgStep) {
      y += lineHeight;
      doc.text(`Approbateur final: ${dgStep.reviewerName}`, 20, y);
      if (dgStep.comment) {
        y += lineHeight;
        doc.text(`Commentaire DG: ${dgStep.comment}`, 20, y);
      }
    }
    
    // Signature
    y += lineHeight * 2;
    doc.text('Signature DG: ________________________', 20, y);
    
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
