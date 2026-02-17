import type { Method } from "./comparatorTypes";

export const METHODS_CHIRURGIA_DE: Record<string, Method> = {
    extraction_simple: {
        id: "extraction_simple", label: "Einfache Extraktion", short: "Schnelle Entfernung eines lockeren oder zerstörten Zahns.",
        icon: "🦷", color: "#ef4444", recommendedSpecialist: "marcin",
        table: {
            time: { value: "15–30 Min.", scale: 5, tooltip: "Ein kurzer Termin." },
            visits: { value: "1–2", scale: 5, tooltip: "Extraktion + Kontrolle." },
            durability: { value: "Dauerhaft", scale: 5, tooltip: "Zahn entfernt. Lücke muss versorgt werden." },
            invasiveness: { value: "Mittel", scale: 3, tooltip: "Extraktion unter Lokalanästhesie." },
            risk: { value: "Gering", scale: 4, tooltip: "Standardrisiken: Schwellung, leichte Blutung." },
            hygiene: { value: "Wundpflege", scale: 3, tooltip: "Vorsichtiges Spülen, kein starkes Spucken, nicht rauchen." },
            worksWhen: ["Lockerer Zahn", "Zahn nicht mehr erhaltbar", "Vor kieferorthopädischer oder prothetischer Behandlung"],
            notIdealWhen: ["Zahn durch Endo + Krone zu retten", "Anatomisch schwierige Wurzel", "Systemerkrankungen als OP-Einschränkung"],
            maintenance: { value: "Kontrolle nach 1 Woche", tooltip: "Beurteilung der Wundheilung." },
        },
        metrics: { durabilityScore: 100, speedScore: 95, minInvasiveScore: 30, maintenanceScore: 95, riskScore: 72 },
    },
    extraction_surgical: {
        id: "extraction_surgical", label: "Chirurgische Extraktion", short: "Komplexe Entfernung — Lappen, Osteotomie, Wurzeltrennung.",
        icon: "🔪", color: "#dc2626", recommendedSpecialist: "marcin",
        table: {
            time: { value: "30–60 Min.", scale: 4, tooltip: "Kann Knochenabtragung und Wurzeltrennung erfordern." },
            visits: { value: "2–3", scale: 4, tooltip: "Extraktion + Kontrolle + Nahtentfernung." },
            durability: { value: "Dauerhaft", scale: 5, tooltip: "Zahn entfernt. Ggf. Augmentation danach." },
            invasiveness: { value: "Hoch", scale: 2, tooltip: "Lappen, Osteotomie, ggf. Wurzeltrennung." },
            risk: { value: "Mittel", scale: 3, tooltip: "Höheres Risiko für Schwellung, Schmerz, Nervnähe." },
            hygiene: { value: "Wundpflege", scale: 3, tooltip: "Kühlung, weiche Kost, nicht rauchen." },
            worksWhen: ["Impaktierter oder frakturierter Zahn", "Weisheitszahnentfernung", "Extraktion vor Implantplanung"],
            notIdealWhen: ["Zahn ist locker — einfache Extraktion reicht", "Unkontrollierter Diabetes", "Aktive Infektion (ggf. erst Antibiotikum)"],
            maintenance: { value: "Kontrolle + Röntgen", tooltip: "Kontrolle nach 1 Woche und 1 Monat." },
        },
        metrics: { durabilityScore: 100, speedScore: 82, minInvasiveScore: 15, maintenanceScore: 90, riskScore: 55 },
    },
    bone_augmentation: {
        id: "bone_augmentation", label: "Knochenaufbau", short: "Knochenregeneration vor Implantation.",
        icon: "🧱", color: "#f59e0b", recommendedSpecialist: "marcin",
        table: {
            time: { value: "4–9 Monate", scale: 1, tooltip: "Augmentation + Einheilung + Implantat." },
            visits: { value: "3–5", scale: 3, tooltip: "OP, Kontrollen, Implantation." },
            durability: { value: "Dauerhaft", scale: 4, tooltip: "Aufgebauter Knochen integriert sich." },
            invasiveness: { value: "Hoch", scale: 2, tooltip: "Chirurgischer Eingriff mit Knochenmaterial/Membran." },
            risk: { value: "Mittel", scale: 3, tooltip: "Infektion, Transplantatversagen, Schwellung." },
            hygiene: { value: "Wundpflege", scale: 2, tooltip: "Strenge postoperative Pflege." },
            worksWhen: ["Unzureichender Knochen für Implantat", "Knochenresorption nach Extraktion", "Zu niedriger Sinusboden (Sinuslift)"],
            notIdealWhen: ["Kein Implantat geplant", "Systemerkrankungen mit eingeschränkter Heilung", "Patient akzeptiert Wartezeit nicht"],
            maintenance: { value: "Röntgen-Monitoring", tooltip: "Knochenvolumenkontrolle vor Implantation." },
        },
        metrics: { durabilityScore: 85, speedScore: 15, minInvasiveScore: 15, maintenanceScore: 85, riskScore: 52 },
    },
};
