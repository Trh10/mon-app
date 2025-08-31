export function stripHtml(html: string) {
  try {
    const tmp = globalThis.document ? document.createElement("div") : null;
    if (tmp) {
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || "";
    }
    // fallback SSR
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return html.replace(/<[^>]+>/g, " ");
  }
}

export function cleanEmailBody({ subject, text }: { subject?: string; text: string }) {
  let t = (text || "").replace(/\r/g, "");
  // supprime les citations style "On Mon, someone wrote:" et lignes commençant par ">"
  t = t
    .split("\n")
    .filter((line) => {
      const l = line.trim();
      if (!l) return true;
      if (l.startsWith(">")) return false;
      if (/^on .*wrote:$/i.test(l)) return false;
      if (/^le .* a écrit *:$/i.test(l)) return false;
      if (/^from:|^de *:/i.test(l)) return true;
      return true;
    })
    .join("\n");

  // retirer signatures courantes
  const sigIdx =
    t.indexOf("\n--\n") >= 0 ? t.indexOf("\n--\n") :
    t.toLowerCase().indexOf("\ncordialement") >= 0 ? t.toLowerCase().indexOf("\ncordialement") :
    -1;
  if (sigIdx >= 0) t = t.slice(0, sigIdx);

  // compacter
  t = t.replace(/\n{3,}/g, "\n\n").trim();

  // préfixer sujet si utile
  if (subject && !t.toLowerCase().includes(subject.toLowerCase())) {
    t = `Sujet: ${subject}\n\n${t}`;
  }
  return t;
}