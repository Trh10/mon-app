// Version alternative avec polices intégrées uniquement
import { NextRequest, NextResponse } from 'next/server';
import { getRequisitions } from '@/lib/requisitions/requisition-store';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    console.log('[PDF-ALT] Single requisition PDF generation start');
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
    
    // Génération PDF avec polices intégrées uniquement
    console.log('[PDF-ALT] Importing PDFKit...');
    const PDFDocument = (await import('pdfkit')).default;
    console.log('[PDF-ALT] PDFKit imported successfully');
    
    // Créer le document PDF avec une police intégrée sûre
    const doc = new PDFDocument();
    console.log('[PDF-ALT] PDF document created');
    
    // Utiliser uniquement des polices intégrées qui n'ont pas besoin de fichiers .afm
    doc.font('Times-Roman');
    console.log('[PDF-ALT] Using built-in Times-Roman font');
  
    // Collecter les buffers pour le PDF
    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));
    
    doc.fontSize(16).text("ATTESTATION D'APPROBATION DE RÉQUISITION", { align: 'center' });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Objet: ${r.title}`);
    doc.text(`Description: ${r.description}`);
    doc.text(`Catégorie: ${r.category}`);
    doc.text(`Montant: $${r.budget}`);
    doc.text(`Justification: ${r.justification}`);
    doc.text(`Demandeur: ${r.requesterName} (${r.requesterId})`);
    doc.text(`Date de création: ${r.createdAt}`);
    doc.text(`Date d'approbation finale: ${r.approvedAt}`);
    
    // Trouver le DG
    const dgStep = [...r.workflow].reverse().find((s: any) => s.reviewerLevel === 10 && s.action === 'approved');
    if (dgStep) {
      doc.text(`Approbateur final: ${dgStep.reviewerName}`);
      if (dgStep.comment) doc.text(`Commentaire DG: ${dgStep.comment}`);
    }
    
    doc.moveDown();
    doc.text('Signature DG:', { continued: true }).text('________________________', { align: 'right' });
    
    // Finaliser le document
    doc.end();
    
    // Retourner le buffer du PDF complet
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on('error', (err: Error) => reject(err));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
    });
    
    console.log('[PDF-ALT] PDF generation completed successfully');
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="approbation-${r.id}.pdf"`
      }
    });
  } catch (error) {
    console.error('[PDF-ALT] Error generating PDF:', error);
    return NextResponse.json({
      error: 'Erreur lors de la génération du PDF',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
