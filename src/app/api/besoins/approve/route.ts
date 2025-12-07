import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const BESOINS_FILE = path.join(DATA_DIR, "besoins.json");

// Assurer que le dossier et fichier existent
function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BESOINS_FILE)) {
    fs.writeFileSync(BESOINS_FILE, JSON.stringify({ besoins: [] }, null, 2));
  }
}

// Lire les besoins
function getBesoins() {
  ensureDataFiles();
  try {
    const data = fs.readFileSync(BESOINS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return { besoins: [] };
  }
}

// Sauvegarder les besoins
function saveBesoins(data: any) {
  ensureDataFiles();
  fs.writeFileSync(BESOINS_FILE, JSON.stringify(data, null, 2));
}

// POST - Approuver ou rejeter un état de besoin
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { besoinId, action, commentaire, approuvePar, niveau } = body;

    // Vérifier que c'est le DG (niveau 10)
    if (niveau < 10) {
      return NextResponse.json(
        { error: "Seul le Directeur Général peut approuver ou rejeter les états de besoin" },
        { status: 403 }
      );
    }

    if (!besoinId || !action) {
      return NextResponse.json(
        { error: "besoinId et action sont requis" },
        { status: 400 }
      );
    }

    if (!["approuve", "rejete"].includes(action)) {
      return NextResponse.json(
        { error: "Action invalide. Utilisez 'approuve' ou 'rejete'" },
        { status: 400 }
      );
    }

    const data = getBesoins();
    const besoinIndex = data.besoins.findIndex((b: any) => b.id === besoinId);

    if (besoinIndex === -1) {
      return NextResponse.json(
        { error: "État de besoin non trouvé" },
        { status: 404 }
      );
    }

    const besoin = data.besoins[besoinIndex];

    // Vérifier que le besoin est en attente
    if (besoin.statut !== "soumis") {
      return NextResponse.json(
        { error: "Cet état de besoin a déjà été traité" },
        { status: 400 }
      );
    }

    // Mettre à jour le besoin
    data.besoins[besoinIndex] = {
      ...besoin,
      statut: action,
      approuvePar: approuvePar || "DG",
      dateApprobation: new Date().toISOString(),
      commentaireApprobation: commentaire || ""
    };

    saveBesoins(data);

    return NextResponse.json({
      success: true,
      message: action === "approuve" 
        ? "État de besoin approuvé avec succès" 
        : "État de besoin rejeté",
      besoin: data.besoins[besoinIndex]
    });

  } catch (error) {
    console.error("Erreur lors de l'approbation:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'approbation" },
      { status: 500 }
    );
  }
}
