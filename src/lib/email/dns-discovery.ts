// Fonction pour découvrir automatiquement les serveurs via DNS
export async function discoverEmailServers(domain: string) {
  const possibleServers = [
    // Variantes communes
    `mail.${domain}`,
    `imap.${domain}`,
    `smtp.${domain}`,
    `email.${domain}`,
    `mx.${domain}`,
    `webmail.${domain}`,
    // Variantes avec "m"
    `m.${domain}`,
    `mailserver.${domain}`,
    // Le domaine lui-même
    domain,
    // Variantes avec sous-domaines
    `mail.server.${domain}`,
    `imap.mail.${domain}`,
    `smtp.mail.${domain}`
  ];

  console.log(`🔍 Test de ${possibleServers.length} serveurs possibles pour ${domain}:`);
  possibleServers.forEach((server, i) => {
    console.log(`${i + 1}. ${server}`);
  });

  return possibleServers;
}