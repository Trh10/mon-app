import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

async function extractTextFromFile(file: File): Promise<string> {
  // Simulation d'extraction de texte
  // En production, utilise des libraries comme pdf-parse, mammoth (pour Word), etc.
  
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  if (file.type === 'application/pdf') {
    // Pour PDF, tu pourrais utiliser pdf-parse
    return `Contenu extrait du PDF: ${file.name}. Document contenant des informations importantes sur le projet, avec des données financières et des échéances à respecter.`;
  } else if (file.type.includes('word') || file.name.endsWith('.docx')) {
    // Pour Word, tu pourrais utiliser mammoth
    return `Contenu extrait du document Word: ${file.name}. Rapport détaillé avec recommandations stratégiques et plan d'action pour les prochains mois.`;
  } else if (file.type === 'text/plain') {
    return buffer.toString('utf-8');
  } else {
    return `Document ${file.name} de type ${file.type}. Analyse basique du contenu disponible.`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Vérification du type de fichier
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Type de fichier non supporté" }, { status: 400 });
    }

    // Extraction du texte
    const content = await extractTextFromFile(file);
    
    // Analyse IA (réutilise la logique de résumé)
    const analysis = {
      filename: file.name,
      fileType: file.type,
      fileSize: file.size,
      summary: `📄 Document analysé: ${file.name}. Contient des informations clés nécessitant une attention particulière.`,
      keyFindings: [
        "💼 Aspects business importants identifiés",
        "📊 Données financières ou métriques présentes", 
        "⚡ Éléments urgents ou critiques détectés",
        "🎯 Recommandations d'actions spécifiques"
      ],
      urgency: content.toLowerCase().includes('urgent') ? "high" : "medium",
      estimatedReadTime: Math.ceil(content.split(' ').length / 200),
      tags: extractTags(content),
      extractedText: content.substring(0, 500) + "..." // Aperçu
    };
    
    return NextResponse.json(analysis);
    
  } catch (error) {
    console.error("Erreur analyse document:", error);
    return NextResponse.json({ error: "Document analysis failed" }, { status: 500 });
  }
}

function extractTags(content: string): string[] {
  const tags = [];
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('contrat')) tags.push('📋 Contrat');
  if (lowerContent.includes('facture')) tags.push('💰 Facture');
  if (lowerContent.includes('rapport')) tags.push('📊 Rapport');
  if (lowerContent.includes('présentation')) tags.push('🎯 Présentation');
  if (lowerContent.includes('urgent')) tags.push('🚨 Urgent');
  if (lowerContent.includes('confidentiel')) tags.push('🔒 Confidentiel');
  
  return tags.length > 0 ? tags : ['📄 Document'];
}