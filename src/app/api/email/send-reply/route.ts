import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { 
      originalMessageId, 
      replyType, 
      subject, 
      body, 
      to, 
      cc,
      threadId
    } = await req.json();

    // Simulation de l'envoi d'email
    console.log('Simulation envoi email:', {
      originalMessageId,
      replyType,
      subject,
      to,
      cc,
      body: body?.substring(0, 100) + '...'
    });

    // Simuler un délai d'envoi
    await new Promise(resolve => setTimeout(resolve, 1000));

    return NextResponse.json({ 
      success: true, 
      message: 'Email envoyé avec succès (simulation)' 
    });

  } catch (error: any) {
    console.error('Erreur simulation envoi email:', error);
    return NextResponse.json({ 
      error: error.message || 'Erreur lors de l\'envoi' 
    }, { status: 500 });
  }
}
