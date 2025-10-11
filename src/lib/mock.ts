import type { Email } from "./types";

// Définition minimale locale de Task si le module source n'expose pas le type
// Ajuster/étendre selon le schéma réel si nécessaire
export interface Task {
  id: string;
  title: string;
  project?: string;
  status: string;
  updatedAt: number;
  createdAt: number;
  createdBy: { id: string; name: string };
  userId: string;
  dueAt?: number;
}

export const emails: Email[] = [
  {
    id: "e1",
    from: "clientx@acme.com",
    fromName: "Client X",
    subject: "URGENT: Contrat à signer aujourd’hui",
    snippet: "Bonjour, merci de renvoyer la version signée avant 17h...",
    date: new Date().toISOString(),
    priority: "P1",
    unread: true,
    hasAttachments: true,
    body:
      "Bonjour,<br/><br/>Veuillez trouver ci-joint le contrat final. Merci de renvoyer la version signée avant 17h pour respecter la deadline du projet.<br/><br/>Cordialement,<br/>Client X"
  },
  {
    id: "e2",
    from: "dg@entreprise.com",
    fromName: "Direction Générale",
    subject: "Point hebdo — objectifs et décisions",
    snippet: "Résumé des priorités de la semaine et décisions prises...",
    date: new Date(Date.now() - 3600e3).toISOString(),
    priority: "P1",
    unread: false,
    hasAttachments: false,
    body:
      "Bonjour,<br/>Voici les objectifs de la semaine, merci de confirmer la prise en compte..."
  },
  {
    id: "e3",
    from: "partnership@ycorp.com",
    fromName: "Y Corp",
    subject: "Offre partenariat Q4",
    snippet: "Nous proposons une offre spéciale pour Q4, incluant...",
    date: new Date(Date.now() - 86400e3).toISOString(),
    priority: "P2",
    unread: false,
    hasAttachments: false,
    body:
      "Bonjour, découvrez notre offre Q4 ci-jointe. Restons en contact pour avancer."
  },
  {
    id: "e4",
    from: "rh@entreprise.com",
    fromName: "RH",
    subject: "Entretiens — planning mis à jour",
    snippet: "Le planning des entretiens de vendredi a été ajusté...",
    date: new Date(Date.now() - 2 * 86400e3).toISOString(),
    priority: "P2",
    unread: false,
    hasAttachments: true,
    body: "Planning mis à jour en pièce jointe."
  },
  {
    id: "e5",
    from: "newsletter@news.com",
    fromName: "Newsletter",
    subject: "Tendances marché (hebdo)",
    snippet: "Les tendances clés de la semaine dans votre secteur...",
    date: new Date(Date.now() - 3 * 86400e3).toISOString(),
    priority: "P3",
    unread: false,
    hasAttachments: false,
    body: "Voici les tendances du marché cette semaine..."
  }
];

export const tasks: Task[] = [
  {
    id: "t1",
    title: "Envoyer version signée à Client X",
    project: "Général",
    status: "todo",
    updatedAt: Date.now(),
    createdAt: Date.now(),
    createdBy: { id: "me", name: "Moi" },
    userId: "me",
    dueAt: Date.now() + 20 * 3600e3,
  },
  {
    id: "t2",
    title: "Planifier call avec juridique",
    project: "Général",
    status: "todo",
    updatedAt: Date.now(),
    createdAt: Date.now(),
    createdBy: { id: "me", name: "Moi" },
    userId: "me",
    dueAt: Date.now() + 3 * 86400e3,
  }
];