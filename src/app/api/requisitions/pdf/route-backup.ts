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

    // Recherche d'une police système AVANT de créer le document
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
    
    let selectedFont = null;
    for (const fontPath of fontCandidates) {
      try {
        if (fs.existsSync(fontPath)) {
          console.log(`[PDF] Font found: ${fontPath}`);
          selectedFont = fontPath;
          break;
        }
      } catch (e) {
        console.warn(`[PDF] Error checking font ${fontPath}:`, e);
      }
    }
    
    // Créer le document PDF avec des options spécifiques pour éviter Helvetica
    const doc = new PDFDocument({
      font: selectedFont || undefined, // Utiliser la police trouvée ou undefined pour forcer le fallback
      fontSize: 12
    });
    console.log('[PDF] PDF document created');
    
    // Si nous avons trouvé une police, l'enregistrer et l'utiliser explicitement
    if (selectedFont) {
      try {
        doc.registerFont('AppFont', selectedFont);
        doc.font('AppFont');
        console.log('[PDF] Custom font registered and applied');
      } catch (e) {
        console.warn('[PDF] Error registering custom font:', e);
        // Fallback: utiliser une police de base qui ne nécessite pas de fichier .afm
        doc.font('Times-Roman');
        console.log('[PDF] Using Times-Roman fallback');
      }
    } else {
      console.log('[PDF] No custom fonts found, using Times-Roman fallback');
      doc.font('Times-Roman');
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
