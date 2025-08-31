// Utilitaires pour Gmail
export function detectUrgency(subject: string, snippet: string, from: string): "low" | "medium" | "high" {
  const content = `${subject} ${snippet} ${from}`.toLowerCase();
  
  // Mots-clés urgents français et anglais
  const urgentKeywords = [
    'urgent', 'asap', 'immediately', 'emergency', 'critical', 'deadline',
    'today', 'now', 'rapidement', 'immédiat', 'critique', 'priorité',
    'important', 'échéance', "d'urgence", 'time sensitive'
  ];
  
  const mediumKeywords = [
    'important', 'priority', 'attention', 'please', 'need', 'require',
    'priorité', 'besoin', 'nécessaire', 'requis'
  ];
  
  // Détection par expéditeur (certains expéditeurs sont toujours urgents)
  const urgentSenders = ['security', 'alert', 'notification', 'admin', 'system'];
  if (urgentSenders.some(sender => from.toLowerCase().includes(sender))) {
    return "high";
  }
  
  // Détection par contenu
  if (urgentKeywords.some(keyword => content.includes(keyword))) {
    return "high";
  }
  
  if (mediumKeywords.some(keyword => content.includes(keyword))) {
    return "medium";
  }
  
  return "low";
}

export function hasAttachments(snippet: string, labelIds: string[] = []): boolean {
  const attachmentIndicators = [
    'attachment', 'pièce jointe', 'fichier joint', 'document joint',
    'pdf', 'doc', 'docx', 'xlsx', 'image', 'photo'
  ];
  
  return attachmentIndicators.some(indicator => 
    snippet.toLowerCase().includes(indicator)
  ) || labelIds.includes('ATTACHMENT');
}

export function isUnread(labelIds: string[] = []): boolean {
  return labelIds.includes('UNREAD');
}