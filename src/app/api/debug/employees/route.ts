import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    // Mock employees for debug without Firestore
    const employees = [
      { id: 'e1', name: 'Jean Dupont', role: 'Employé', level: 5 },
      { id: 'e2', name: 'Marie Admin', role: 'Admin', level: 7 },
      { id: 'e3', name: 'Sophie Finance', role: 'Finance', level: 6 }
    ];

    return NextResponse.json({ 
      employees,
      count: employees.length,
      message: "Test réussi (mock)"
    });

  } catch (error) {
    console.error('Erreur test employees:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Erreur inconnue"
    }, { status: 500 });
  }
}
