import { NextResponse } from 'next/server';

/**
 * Cette route est appelée par l'interface pour effectuer des actions
 * groupées sur les emails (ex: archiver, supprimer, marquer comme lu).
 * Pour l'instant, elle ne fait que simuler l'action et la logger.
 */
export async function POST(req: Request) {
  try {
    // On lit le corps de la requête pour savoir quelle action effectuer
    const body = await req.json();
    
    // On affiche dans le terminal ce que l'interface a demandé
    console.log(`Action demandée: '${body.action}' sur les emails:`, body.emailIds);
    
    // On retourne une réponse de succès à l'interface
    return NextResponse.json({ 
      success: true, 
      message: `Action '${body.action}' simulée avec succès.` 
    });

  } catch (error: any) {
    // En cas d'erreur (ex: JSON invalide), on la log et on renvoie une erreur 500
    console.error("Erreur dans /api/email/actions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}