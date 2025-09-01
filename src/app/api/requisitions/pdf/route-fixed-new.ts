// Dépendance pour générer un PDF dans un handler Next.js (Node)
import { NextRequest, NextResponse } from 'next/server';
import { getRequisitions } from '@/lib/requisitions/requisition-store';
import { Requisition } from '@/lib/requisitions/requisition-types';
import fs from 'fs';
import path from 'path';
import { Buffer } from 'buffer';
// pdfkit nécessite Node.js
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    console.log('[PDF] Single requisition PDF generation start');
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
    
    // Génération PDF
    console.log('[PDF] Importing PDFKit...');
    const PDFDocument = (await import('pdfkit')).default;
    console.log('[PDF] PDFKit imported successfully');
    const doc = new PDFDocument();
    console.log('[PDF] PDF document created');

    // Enregistrer une police système pour éviter Helvetica.afm
    console.log('[PDF] Searching for system fonts...');
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
          console.log(`[PDF] Font found: ${fontPath}`);
          doc.registerFont('AppFont', fontPath);
          doc.font('AppFont');
          fontFound = true;
          break;
        }
      } catch (e) {
        console.warn(`[PDF] Error checking font ${fontPath}:`, e);
      }
    }
    
    if (!fontFound) {
      console.log('[PDF] No custom fonts found, using default');
    }
  
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
    
    console.log('[PDF] PDF generation completed successfully');
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="approbation-${r.id}.pdf"`
      }
    });
  } catch (error) {
    console.error('[PDF] Error generating PDF:', error);
    return NextResponse.json({
      error: 'Erreur lors de la génération du PDF',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
