import { NextRequest, NextResponse } from "next/server";
import { COMPANY_DEFAULT, LEGACY_COMPANY_IDS, LEGACY_EMAIL_DOMAINS } from "@/config/branding";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { userId, name, email, role = "employe", title, department } = await req.json();
    
    if (!userId || !name) {
      return NextResponse.json({ 
        error: "userId et name sont requis" 
      }, { status: 400 });
    }

    // Simuler l'ajout de l'employé (remplacer par vraie base de données)
    const emailDomain = (LEGACY_EMAIL_DOMAINS[1]) || `${COMPANY_DEFAULT.toLowerCase()}.com`;
    const companyId = LEGACY_COMPANY_IDS[0] || COMPANY_DEFAULT.toLowerCase();
    const employeeData = {
      id: userId,
      name,
      email: email || `${userId}@${emailDomain}`,
      role,
      title: title || "Membre de l'équipe",
      department: department || "Général",
      companyId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log("Employé ajouté (simulation):", employeeData);

    return NextResponse.json({ 
      success: true,
      employee: employeeData
    });

  } catch (error) {
    console.error('Erreur ajout employé:', error);
    return NextResponse.json({ 
      error: "Erreur interne"
    }, { status: 500 });
  }
}
