import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const BESOINS_FILE = path.join(DATA_DIR, "besoins.json");

// Lire les besoins
function getBesoins() {
  try {
    if (!fs.existsSync(BESOINS_FILE)) {
      return { besoins: [] };
    }
    const data = fs.readFileSync(BESOINS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return { besoins: [] };
  }
}

// Formater montant
function formatMontant(montant: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0
  }).format(montant || 0);
}

// Formater date
function formatDate(dateString: string) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

// GET - Générer un document HTML d'approbation (simulant un PDF)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const data = getBesoins();
    const besoin = data.besoins.find((b: any) => b.id === id);

    if (!besoin) {
      return NextResponse.json({ error: "État de besoin non trouvé" }, { status: 404 });
    }

    // Générer un document HTML formaté pour impression
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>État de Besoin - ${besoin.reference}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      padding: 40px; 
      max-width: 800px; 
      margin: 0 auto;
      background: white;
      color: #333;
    }
    .header { 
      text-align: center; 
      border-bottom: 3px solid #1a365d; 
      padding-bottom: 20px; 
      margin-bottom: 30px; 
    }
    .header h1 { 
      font-size: 28px; 
      color: #1a365d; 
      margin-bottom: 5px;
    }
    .header .ref { 
      font-size: 16px; 
      color: #666; 
    }
    .status-badge {
      display: inline-block;
      padding: 10px 30px;
      border-radius: 50px;
      font-weight: bold;
      font-size: 18px;
      margin: 20px 0;
    }
    .status-approved {
      background: linear-gradient(135deg, #22c55e, #16a34a);
      color: white;
    }
    .status-rejected {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
    }
    .status-pending {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: white;
    }
    .section { 
      margin-bottom: 25px; 
      padding: 20px;
      background: #f8fafc;
      border-radius: 10px;
      border-left: 4px solid #1a365d;
    }
    .section-title { 
      font-size: 14px; 
      color: #1a365d; 
      font-weight: bold; 
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .section-content { 
      font-size: 16px; 
      color: #333;
    }
    .amount { 
      font-size: 32px; 
      font-weight: bold; 
      color: #1a365d; 
      text-align: center;
      padding: 20px;
      background: linear-gradient(135deg, #e0f2fe, #bae6fd);
      border-radius: 10px;
      margin: 20px 0;
    }
    .products-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    .products-table th, .products-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    .products-table th {
      background: #1a365d;
      color: white;
      font-weight: 600;
    }
    .products-table tr:nth-child(even) {
      background: #f1f5f9;
    }
    .approval-box {
      margin-top: 30px;
      padding: 25px;
      border: 2px solid #22c55e;
      border-radius: 10px;
      background: linear-gradient(135deg, #f0fdf4, #dcfce7);
    }
    .approval-box.rejected {
      border-color: #ef4444;
      background: linear-gradient(135deg, #fef2f2, #fee2e2);
    }
    .approval-title {
      font-size: 18px;
      font-weight: bold;
      color: #166534;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .approval-box.rejected .approval-title {
      color: #991b1b;
    }
    .signature-area {
      display: flex;
      justify-content: space-between;
      margin-top: 50px;
      padding-top: 20px;
    }
    .signature-box {
      width: 45%;
      text-align: center;
    }
    .signature-line {
      border-top: 2px solid #333;
      margin-top: 60px;
      padding-top: 10px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <button onclick="window.print()" class="no-print" style="position:fixed;top:20px;right:20px;padding:10px 20px;background:#1a365d;color:white;border:none;border-radius:5px;cursor:pointer;font-size:14px;">
    🖨️ Imprimer
  </button>

  <div class="header">
    <h1>ÉTAT DE BESOIN</h1>
    <p class="ref">Référence: <strong>${besoin.reference}</strong></p>
    <p class="ref">Date de création: ${formatDate(besoin.dateCreation)}</p>
    
    <div class="status-badge ${
      besoin.statut === "approuve" ? "status-approved" : 
      besoin.statut === "rejete" ? "status-rejected" : "status-pending"
    }">
      ${besoin.statut === "approuve" ? "✓ APPROUVÉ" : 
        besoin.statut === "rejete" ? "✗ REJETÉ" : "⏳ EN ATTENTE"}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Demandeur</div>
    <div class="section-content"><strong>${besoin.demandeur}</strong></div>
  </div>

  <div class="section">
    <div class="section-title">Objet de la demande</div>
    <div class="section-content"><strong>${besoin.titre}</strong></div>
  </div>

  ${besoin.description ? `
  <div class="section">
    <div class="section-title">Description</div>
    <div class="section-content">${besoin.description}</div>
  </div>
  ` : ""}

  ${besoin.produits && besoin.produits.length > 0 ? `
  <div class="section">
    <div class="section-title">Détail des produits/services</div>
    <table class="products-table">
      <thead>
        <tr>
          <th>Désignation</th>
          <th style="text-align:right;">Montant</th>
        </tr>
      </thead>
      <tbody>
        ${besoin.produits.map((p: any) => `
          <tr>
            <td>${p.nom}</td>
            <td style="text-align:right;font-weight:bold;">${formatMontant(p.prix)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
  ` : ""}

  <div class="amount">
    Montant Total: ${formatMontant(besoin.total)}
  </div>

  ${besoin.statut === "approuve" || besoin.statut === "rejete" ? `
  <div class="approval-box ${besoin.statut === "rejete" ? "rejected" : ""}">
    <div class="approval-title">
      ${besoin.statut === "approuve" ? "✓" : "✗"} 
      ${besoin.statut === "approuve" ? "APPROBATION DE LA DIRECTION GÉNÉRALE" : "DÉCISION DE LA DIRECTION GÉNÉRALE"}
    </div>
    <p><strong>Décision:</strong> ${besoin.statut === "approuve" ? "Approuvé" : "Rejeté"}</p>
    <p><strong>Par:</strong> ${besoin.approuvePar || "Direction Générale"}</p>
    <p><strong>Date:</strong> ${formatDate(besoin.dateApprobation)}</p>
    ${besoin.commentaireApprobation ? `<p><strong>Commentaire:</strong> "${besoin.commentaireApprobation}"</p>` : ""}
  </div>
  ` : ""}

  <div class="signature-area">
    <div class="signature-box">
      <p><strong>Le Demandeur</strong></p>
      <div class="signature-line">
        <p>${besoin.demandeur}</p>
      </div>
    </div>
    <div class="signature-box">
      <p><strong>Le Directeur Général</strong></p>
      <div class="signature-line">
        <p>${besoin.approuvePar || "_______________"}</p>
      </div>
    </div>
  </div>

  ${besoin.statut === "approuve" ? `
  <div class="signature-area" style="margin-top:30px;">
    <div class="signature-box">
      <p><strong>Le Responsable Financier</strong></p>
      <p style="font-size:12px;color:#666;">(Pour décaissement)</p>
      <div class="signature-line">
        <p>_______________</p>
      </div>
    </div>
  </div>
  ` : ""}

  <div class="footer">
    <p>Document généré le ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
    <p>Ce document est valide uniquement avec les signatures des parties concernées.</p>
  </div>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8"
      }
    });

  } catch (error) {
    console.error("Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
