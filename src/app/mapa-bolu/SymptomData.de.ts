
// ─────────────────────────────────────────────────────────────
// SYMPTOM DATA — German translations
// ─────────────────────────────────────────────────────────────

import type { ZoneInfo } from './SymptomData';

export const DOCTORS_DE: Record<string, { name: string; specialties: string }> = {
    marcin: { name: 'Dr. Marcin Nowosielski, Zahnarzt', specialties: 'Chirurgie, fortgeschrittene Endodontie, Implantatprothetik' },
    ilona: { name: 'Dr. Ilona Piechaczek, Zahnärztin', specialties: 'Endodontie, Prothetik' },
    katarzyna: { name: 'Dr. Katarzyna Halupczok, Zahnärztin', specialties: 'Konservierende Zahnheilkunde, Kinderzahnheilkunde' },
    dominika: { name: 'Dr. Dominika Milicz, Zahnärztin', specialties: 'Konservierende Zahnheilkunde, Kinderzahnheilkunde' },
};

const INCISOR_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Leicht',
            description: 'Leichtes Unbehagen oder kosmetische Veränderung, kein starker Schmerz.',
            symptoms: [
                { text: 'Kurzzeitige Empfindlichkeit gegenüber Kälte oder Süßem', tip: 'Dauert einige Sekunden nach dem Kontakt mit dem Reiz. Typisch für frühen Schmelzverlust oder freiliegendes Dentin.' },
                { text: 'Leichte Verfärbung oder Farbveränderung', tip: 'Weiße oder braune Flecken auf dem Schmelz können auf frühe Demineralisierung oder oberflächliche Karies hinweisen.' },
                { text: 'Leichtes Unbehagen beim Beißen harter Speisen', tip: 'Mikrorisse im Schmelz oder kleine Kavitäten können kurzzeitige Schmerzen beim Beißen verursachen.' },
                { text: 'Raue Oberfläche am Zahnrand', tip: 'Kann auf Schmelzerosion durch saure Ernährung oder Bruxismus hinweisen.' },
            ],
            causes: [
                { text: 'Frühe Schmelzdemineralisierung (weiße Flecken)', tip: 'Erstes Stadium der Karies — Schmelz verliert Mineralien. Reversibel bei richtiger Fluoridremineralisierung.' },
                { text: 'Oberflächliche Karies', tip: 'Kavität auf den Schmelz begrenzt. Erfordert eine kleine Kompositfüllung.' },
                { text: 'Zahnfleischrückgang mit freiliegendem Zahnhals', tip: 'Zahnfleischrückgang legt empfindliches Wurzeldentin frei. Kann chirurgische Deckung erfordern.' },
                { text: 'Erosionsschäden (saure Ernährung)', tip: 'Kohlensäurehaltige Getränke, Zitrusfrüchte und Magenreflux lösen den Schmelz auf. Ernährungsumstellung stoppt den Fortschritt.' },
            ],
            advice: 'Verwenden Sie fluoridhaltige Zahnpasta (mind. 1450 ppm) und Mundspülung. Bei anhaltender Empfindlichkeit über 2 Wochen — vereinbaren Sie einen Kontrolltermin. Frühzeitiges Eingreifen kann den Zahn ohne umfangreiche Behandlung retten.',
            urgency: 'low',
            doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Mäßig',
            description: 'Wiederkehrender Schmerz, der Diagnostik erfordert.',
            symptoms: [
                { text: 'Spontaner Schmerz, abends stärker', tip: 'Schmerz ohne sichtbare Ursache, schlimmer im Liegen — deutet auf Pulpaentzündung (Nerv) hin.' },
                { text: 'Verlängerte Reaktion auf Hitze/Kälte (>30 Sekunden)', tip: 'Reaktion über 30 Sekunden weist auf reversible Pulpitis hin, die Behandlung erfordert.' },
                { text: 'Sichtbare Kavität oder Lücke auf der Zahnoberfläche', tip: 'Eine mit bloßem Auge sichtbare Kavität bedeutet Karies, die mindestens das Dentin erreicht.' },
                { text: 'Leichte Schwellung oder Rötung des Zahnfleischs um den Zahn', tip: 'Kann auf lokale Zahnfleischentzündung oder den Beginn einer Infektion hinweisen.' },
                { text: 'Zerbröckeln des Zahnrandes', tip: 'Geschwächte Schmelzstruktur bricht in Fragmenten ab — erfordert prothetische Restaurierung.' },
            ],
            causes: [
                { text: 'Mittelmäßig fortgeschrittene Karies (Dentin erreicht)', tip: 'Bakterien sind durch den Schmelz ins Dentin eingedrungen. Erfordert Entfernung des kariösen Gewebes und Füllung.' },
                { text: 'Schmelzriss (Cracked-Enamel-Syndrom)', tip: 'Unsichtbare Risslinie verursacht Schmerzen beim Beißen bestimmter Speisen. Schwer ohne Mikroskop zu diagnostizieren.' },
                { text: 'Reversible Pulpitis', tip: 'Die Pulpa (Nerv) ist gereizt aber lebendig. Richtige konservative Behandlung kann die Vitalität erhalten.' },
                { text: 'Mechanisches Trauma (z.B. nach Schlag)', tip: 'Trauma kann Risse oder Pulpaschäden auch ohne sichtbare Veränderungen verursachen. Erfordert Kontroll-Röntgen.' },
            ],
            advice: 'Ein Besuch innerhalb von 1–2 Wochen ist erforderlich. Der Arzt beurteilt die Tiefe der Kavität und ob eine Füllung oder Wurzelkanalbehandlung nötig ist. Warten Sie nicht — der Zustand kann sich verschlechtern.',
            urgency: 'medium',
            doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Fortgeschritten',
            description: 'Starker Schmerz, der dringendes Eingreifen erfordert.',
            symptoms: [
                { text: 'Intensiver, pochender Schmerz, schwer zu lokalisieren', tip: 'Schmerz strahlt zum Ohr, Schläfe oder Auge aus. Typisch für Pulpitis — erfordert dringendes Eingreifen.' },
                { text: 'Schmerz, der nachts aufweckt', tip: 'Schmerz, der aus dem Schlaf weckt, ist ein ernstes Zeichen für unbehandelte Entzündung oder Pulpanekrose.' },
                { text: 'Gesichts- oder Zahnfleischschwellung', tip: 'Schwellung weist auf Ausbreitung der Infektion über den Zahn hinaus hin. Kann Antibiotikatherapie erfordern.' },
                { text: 'Zahn hat sich verfärbt (grau/dunkel)', tip: 'Verdunklung des Zahns bedeutet Pulpanekrose — der Zahn ist tot und benötigt Wurzelkanalbehandlung.' },
                { text: 'Abszess oder Fistel (eitriges Bläschen am Zahnfleisch)', tip: 'Eiteransammlung um die Wurzel bildet einen Abszess. Eine Fistel ist natürliche Drainage. Sofortige Behandlung erforderlich.' },
                { text: 'Fieber begleitend zum Zahnschmerz', tip: 'Fieber zeigt eine systemische Reaktion auf Infektion an. Dringende ärztliche Konsultation!' },
            ],
            causes: [
                { text: 'Irreversible Pulpitis', tip: 'Der Zahnnerv ist irreversibel geschädigt. Die einzige Lösung ist Wurzelkanalbehandlung unter dem Mikroskop.' },
                { text: 'Pulpanekrose mit Infektion', tip: 'Der tote Nerv ist zur Quelle bakterieller Infektion geworden. Erfordert endodontische Behandlung und ggf. Antibiotika.' },
                { text: 'Periapikaler Abszess', tip: 'Ein Eiterherd an der Zahnwurzel. Kann zu Phlegmone führen — einer ausbreitenden, lebensbedrohlichen Infektion.' },
                { text: 'Wurzelfraktur nach Trauma', tip: 'Die Wurzel ist unter der Zahnfleischlinie gebrochen. Je nach Bruchniveau — Behandlung oder Extraktion.' },
            ],
            advice: 'Dringender Besuch — am besten heute oder morgen! Unbehandelte Entzündung kann zu ausbreitender Weichteilinfektion (Phlegmone) führen. Bis zum Besuch: Ibuprofen 400mg alle 6h, kalte Kompresse auf die Wange.',
            urgency: 'high',
            doctors: ['marcin', 'ilona'],
        },
    },
};

const CANINE_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Leicht',
            description: 'Leichtes Unbehagen, oft mit gewohnheitsmäßigem Pressen verbunden.',
            symptoms: [
                { text: 'Empfindlichkeit am Zahnhals (Zahnfleischseite)', tip: 'Der freiliegende Eckzahnhals ist besonders empfindlich aufgrund der dünnen Wurzelzementschicht.' },
                { text: 'Abnutzung der Eckzahnspitze', tip: 'Eckzähne führen den seitlichen Biss — ihre Abnutzung kann auf Bruxismus hinweisen.' },
                { text: 'Zurückgezogenes Zahnfleisch auf einer Seite', tip: 'Einseitige Rezession deutet auf zu aggressives Zähneputzen oder fehlerhaften Biss hin.' },
                { text: 'Leichtes Unbehagen beim Beißen', tip: 'Eckzähne übertragen große Kaukräfte — selbst eine kleine Kavität kann Unbehagen verursachen.' },
            ],
            causes: [
                { text: 'Keilförmige Defekte (übermäßiges Bürsten)', tip: 'V-förmige Kerbe am Zahnhals. Entsteht durch zu starkes Bürsten mit horizontalen Bewegungen.' },
                { text: 'Bruxismus (Zähneknirschen) — Abnutzung', tip: 'Gewohnheitsmäßiges Pressen oder Knirschen verursacht Zahnabnutzung. Eine Relaxierungsschiene schützt vor weiteren Schäden.' },
                { text: 'Zahnfleischrückgang mit freiliegendem Wurzelzement', tip: 'Der zurückweichende Zahnfleischrand legt die empfindliche Wurzeloberfläche unterhalb des Schmelzes frei.' },
                { text: 'Frühe Zahnhalskaries', tip: 'Karies an der Zahn-Zahnfleisch-Grenze — im Frühstadium schwer zu bemerken.' },
            ],
            advice: 'Eckzähne haben die längsten Wurzeln und sind entscheidend für die Bissführung. Abnutzung deutet auf Bruxismus hin — fragen Sie nach einer Relaxierungsschiene. Verwenden Sie eine weiche Zahnbürste.',
            urgency: 'low',
            doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Mäßig',
            description: 'Schmerz, der zum Auge oder zur Nase ausstrahlt — erfordert Diagnostik.',
            symptoms: [
                { text: 'Schmerz, der zum Auge oder Nasenflügel ausstrahlt', tip: 'Eckzähne haben die längsten Wurzeln — Schmerz kann entlang des Nervs zum Auge ausstrahlen.' },
                { text: 'Verlängerte Temperaturempfindlichkeit', tip: 'Reaktion über 30 Sekunden — Zeichen einer Pulpareizung.' },
                { text: 'Sichtbare tiefe Kavität am Zahnhals', tip: 'Keilförmiger Defekt, der das Dentin erreicht — erfordert Füllung.' },
                { text: 'Schmerz beim seitlichen Beißen', tip: 'Eckzähne führen den seitlichen Biss — Schmerz deutet auf Riss oder Karies hin.' },
                { text: 'Vergrößerter Lymphknoten unter dem Kiefer', tip: 'Der Lymphknoten reagiert auf eine Zahninfektion — ein Zeichen der Entzündung.' },
            ],
            causes: [
                { text: 'Fortgeschrittene Zahnhalskaries', tip: 'Zahnhalskaries hat das Dentin erreicht — Risiko einer Pulpitis.' },
                { text: 'Reversible Pulpitis', tip: 'Der Nerv ist gereizt aber lebendig — konservative Behandlung kann ihn retten.' },
                { text: 'Längswurzelfraktur', tip: 'Riss entlang der Wurzel — Prognose oft ungünstig.' },
                { text: 'Apikale Parodontitis', tip: 'Entzündung des Gewebes um die Wurzelspitze — Schmerz bei Berührung.' },
            ],
            advice: 'Ausstrahlender Schmerz vom Eckzahn ist charakteristisch aufgrund seiner Anatomie (lange Wurzel nahe der Nebenhöhle). Vereinbaren Sie einen Termin — ein Röntgenbild wird benötigt.',
            urgency: 'medium',
            doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Fortgeschritten',
            description: 'Starker Schmerz oder Schwellung — dringendes Eingreifen.',
            symptoms: [
                { text: 'Intensiver pochender Schmerz, schwer mit Medikamenten zu kontrollieren', tip: 'Schmerz resistent gegen Ibuprofen — Pulpitis oder Abszess.' },
                { text: 'Schwellung im Unterlid-/Wangenbereich', tip: 'Schwellung im infraorbitalen Bereich.' },
                { text: 'Abszess am Zahnfleisch nahe dem Eckzahn', tip: 'Abszess am Zahnfleisch nahe dem Eckzahn.' },
                { text: 'Zahnbeweglichkeit', tip: 'Fortgeschrittener Knochenverlust oder Infektion verursacht Mobilität — Risiko des Zahnverlusts.' },
                { text: 'Schwierigkeiten beim Mundöffnen (Kieferklemme)', tip: 'Schwierigkeiten beim Mundöffnen (Kieferklemme).' },
            ],
            causes: [
                { text: 'Periapikaler Abszess', tip: 'Ein Eiterherd an der Zahnwurzel. Kann zu Phlegmone führen — einer lebensbedrohlichen Infektion.' },
                { text: 'Pulpanekrose mit ausgedehnter Infektion', tip: 'Pulpanekrose mit ausgedehnter Infektion.' },
                { text: 'Wurzelfraktur durch Trauma', tip: 'Wurzelfraktur durch Trauma.' },
                { text: 'Fortgeschrittene Parodontitis', tip: 'Fortgeschrittene Parodontitis.' },
            ],
            advice: 'Dringender Besuch! Infektion vom oberen Eckzahn kann sich über Faszienräume zur Augenhöhle ausbreiten. Bis zum Besuch: Ibuprofen 400mg + Paracetamol 500mg, kalte Kompresse. Keine warmen Umschläge!',
            urgency: 'high',
            doctors: ['marcin', 'ilona'],
        },
    },
};

const PREMOLAR_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Leicht', description: 'Gelegentliches Unbehagen, hauptsächlich beim Kauen.',
            symptoms: [
                { text: 'Leichter Schmerz beim Beißen harter Speisen', tip: 'Leichter Schmerz beim Beißen harter Speisen.' },
                { text: 'Keilförmiger Defekt sichtbar an der Zahnfleischlinie', tip: 'Keilförmiger Defekt sichtbar an der Zahnfleischlinie.' },
                { text: 'Kurzzeitige Kälteempfindlichkeit', tip: 'Kurzzeitige Kälteempfindlichkeit.' },
                { text: 'Druckgefühl beim Kauen', tip: 'Druckgefühl beim Kauen.' },
            ],
            causes: [
                { text: 'Undichte Füllung (alte Amalgame)', tip: 'Undichte Füllung (alte Amalgame).' },
                { text: 'Keilförmige Defekte durch Pressen', tip: 'Keilförmige Defekte durch gewohnheitsmäßiges Pressen.' },
                { text: 'Oberflächliche Approximalkaries (zwischen Zähnen)', tip: 'Oberflächliche Approximalkaries (zwischen Zähnen).' },
                { text: 'Okklusale Überbelastung (Frühkontakt)', tip: 'Okklusale Überbelastung (Frühkontakt).' },
            ],
            advice: 'Prämolaren brechen oft durch Zähnepressen — besonders einhöckrige mit großen Füllungen. Erwägen Sie den Austausch alter Füllungen gegen Keramikinlays. Kontrollbesuch innerhalb eines Monats.',
            urgency: 'low', doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Mäßig', description: 'Zunehmender Schmerz beim Kauen — Bruchrisiko.',
            symptoms: [
                { text: 'Scharfer Schmerz beim Beißen auf einen bestimmten Höcker', tip: 'Scharfer Schmerz beim Beißen auf einen bestimmten Höcker.' },
                { text: 'Schmerz beim Loslassen des Bisses (Zeichen eines Risses)', tip: 'Schmerz beim Loslassen des Bisses.' },
                { text: 'Wärmeempfindlichkeit über 1 Minute', tip: 'Wärmeempfindlichkeit über 1 Minute.' },
                { text: 'Essen steckt zwischen den Zähnen fest (neues Phänomen)', tip: 'Essen steckt zwischen den Zähnen fest.' },
                { text: 'Schmerzen nach heißen Getränken', tip: 'Schmerzen nach heißen Getränken.' },
            ],
            causes: [
                { text: 'Cracked-Tooth-Syndrom', tip: 'Unsichtbarer Riss durch den Zahn — heimtückisch, ohne Mikroskop schwer zu diagnostizieren.' },
                { text: 'Sekundärkaries unter alter Füllung', tip: 'Sekundärkaries unter alter Füllung.' },
                { text: 'Reversible Pulpitis', tip: 'Die Pulpa ist gereizt aber lebendig. Konservative Behandlung kann die Vitalität erhalten.' },
                { text: 'Verlust des Kontaktpunktes', tip: 'Verlust des Kontaktpunktes (Essen wird eingeklemmt).' },
            ],
            advice: 'Schmerz beim Loslassen des Bisses = klassisches Symptom eines gerissenen Zahns. Erfordert dringende Mikroskopdiagnostik. Termin innerhalb einer Woche — der Riss kann sich vertiefen.',
            urgency: 'medium', doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Fortgeschritten', description: 'Starker Schmerz oder kritische Fraktur.',
            symptoms: [
                { text: 'Anhaltender, starker pochender Schmerz', tip: 'Anhaltender, starker pochender Schmerz.' },
                { text: 'Zahn beweglich oder „steigt hoch"', tip: 'Zahn beweglich oder „steigt auf dem Zahnfleisch hoch".' },
                { text: 'Zahnfleischschwellung mit eitriger Absonderung', tip: 'Zahnfleischschwellung mit eitriger Absonderung.' },
                { text: 'Zahnwand bricht beim Beißen ab', tip: 'Zahnwand bricht beim Beißen ab.' },
                { text: 'Schmerz bei jedem Kontakt mit Essen', tip: 'Schmerz bei jedem Kontakt mit Essen.' },
            ],
            causes: [
                { text: 'Vertikale Wurzelfraktur (irreversibel)', tip: 'Vertikale Wurzelfraktur (irreversibel).' },
                { text: 'Periapikaler Abszess', tip: 'Eiterherd an der Zahnwurzel. Kann zu lebensbedrohlicher Phlegmone führen.' },
                { text: 'Pulpanekrose', tip: 'Der Zahnnerv ist abgestorben — erfordert endodontische Behandlung.' },
                { text: 'Zahnfraktur unter der Füllung', tip: 'Zahnfraktur unter der Füllung.' },
            ],
            advice: 'Dringender Besuch! Wenn der Riss unter die Zahnfleischlinie reicht — Zahn muss möglicherweise extrahiert und durch Implantat ersetzt werden. Wenn darüber — kann eine Krone ihn retten. Je schneller wir handeln, desto mehr Optionen.',
            urgency: 'high', doctors: ['marcin', 'ilona'],
        },
    },
};

const MOLAR_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Leicht', description: 'Leichtes Unbehagen, meist ein Hygieneproblem.',
            symptoms: [
                { text: 'Essen steckt zwischen den Zähnen fest', tip: 'Essen steckt zwischen den Zähnen.' },
                { text: 'Leichter Schmerz beim Beißen harter Speisen', tip: 'Leichter Schmerz beim Beißen.' },
                { text: 'Kälteempfindlichkeit im Zahnbereich', tip: 'Kälteempfindlichkeit im Zahnbereich.' },
                { text: 'Zahnfleischbluten beim Putzen/Benutzen von Zahnseide', tip: 'Zahnfleischbluten beim Putzen.' },
            ],
            causes: [
                { text: 'Undichte Füllung — Verlust des Kontaktpunktes', tip: 'Undichte Füllung — Verlust des Kontaktpunktes.' },
                { text: 'Beginnende Karies auf der Kaufläche (Fissuren)', tip: 'Beginnende Karies auf der Kaufläche.' },
                { text: 'Zahnfleischentzündung (Gingivitis) durch schlechte Hygiene', tip: 'Zahnfleischentzündung durch schlechte Hygiene.' },
                { text: 'Abgenutzte Füllung, die Ersatz braucht', tip: 'Abgenutzte Füllung, die Ersatz braucht.' },
            ],
            advice: 'Molaren haben tiefe Fissuren, in denen sich leicht Plaque ansammelt. Verwenden Sie täglich Zahnseide oder Interdentalbürsten. Kontrollbesuch mit Füllungsüberprüfung alle 6 Monate.',
            urgency: 'low', doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Mäßig', description: 'Zunehmender Schmerz, mögliche Pulpitis.',
            symptoms: [
                { text: 'Tiefer pochender Schmerz, abends stärker', tip: 'Tiefer pochender Schmerz, abends stärker.' },
                { text: 'Verlängerte Wärmereaktion (>1 Minute)', tip: 'Verlängerte Wärmereaktion.' },
                { text: 'Schmerz, der zum Ohr oder zur Schläfe ausstrahlt', tip: 'Schmerz strahlt zum Ohr aus.' },
                { text: 'Schwierigkeiten beim Kauen auf einer Seite', tip: 'Schwierigkeiten beim einseitigen Kauen.' },
                { text: 'Dunkle Verfärbung auf der Kaufläche', tip: 'Dunkle Verfärbung auf der Kaufläche.' },
            ],
            causes: [
                { text: 'Tiefe Karies bis zum Dentin oder nahe der Pulpa', tip: 'Tiefe Karies bis zum Dentin.' },
                { text: 'Reversible Pulpitis', tip: 'Reversible Pulpitis.' },
                { text: 'Sekundärkaries unter Krone oder großer Füllung', tip: 'Sekundärkaries unter Krone.' },
                { text: 'Höckerfraktur', tip: 'Höckerfraktur.' },
            ],
            advice: 'Schmerz auf Wärme ist ein Warnsignal — die Pulpa kann entzündet sein. Termin innerhalb einer Woche. Der Arzt beurteilt, ob tiefe Füllung oder Wurzelkanalbehandlung nötig ist.',
            urgency: 'medium', doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Fortgeschritten', description: 'Starker Schmerz oder Abszess — dringende Intervention nötig.',
            symptoms: [
                { text: 'Starker, anhaltender pochender Schmerz', tip: 'Starker pochender Schmerz.' },
                { text: 'Schmerz weckt nachts, reagiert nicht auf Medikamente', tip: 'Schmerz weckt nachts.' },
                { text: 'Wangen- oder Unterkieferschwellung', tip: 'Wangen- oder Unterkieferschwellung.' },
                { text: 'Fieber, Unwohlsein', tip: 'Systemische Infektionszeichen — der Körper kämpft gegen die Infektion. Dringende Hilfe nötig.' },
                { text: 'Eitrige Absonderung aus dem Zahnfleisch oder Fistel', tip: 'Eitrige Absonderung.' },
                { text: 'Zahn fühlt sich „erhöht" an — Schmerz beim Mundschließen', tip: 'Zahn fühlt sich erhöht an.' },
            ],
            causes: [
                { text: 'Irreversible Pulpitis', tip: 'Irreversible Pulpitis.' },
                { text: 'Periapikaler oder parodontaler Abszess', tip: 'Periapikaler oder parodontaler Abszess.' },
                { text: 'Pulpanekrose mit periapikaler Infektion', tip: 'Pulpanekrose mit periapikaler Infektion.' },
                { text: 'Verschlimmerung einer chronischen Entzündung', tip: 'Verschlimmerung chronischer Entzündung.' },
            ],
            advice: 'Dringender Besuch — heute oder morgen! Molaren haben 3–4 Kanäle, daher ist die Wurzelkanalbehandlung komplex, rettet aber den Zahn. Bis zum Besuch: Ibuprofen 400mg + Paracetamol 500mg abwechselnd alle 3h. Nicht auf diese Seite kauen.',
            urgency: 'high', doctors: ['marcin', 'ilona'],
        },
    },
};

const WISDOM_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Leicht', description: 'Leichtes Unbehagen, typisch für einen durchbrechenden Zahn.',
            symptoms: [
                { text: 'Druck- oder „Schiebegefühl" im hinteren Zahnbogen', tip: 'Druckgefühl im hinteren Bereich.' },
                { text: 'Leichte Zahnfleischschwellung hinter dem letzten Zahn', tip: 'Leichte Schwellung hinter dem letzten Zahn.' },
                { text: 'Unbehagen beim weiten Mundöffnen', tip: 'Unbehagen beim weiten Öffnen.' },
                { text: 'Leichter Schmerz, der beim Essen stärker wird', tip: 'Leichter Schmerz beim Essen.' },
            ],
            causes: [
                { text: 'Aktiver Weisheitszahndurchbruch (leichte Perikoronitis)', tip: 'Aktiver Durchbruch.' },
                { text: 'Beginnende Karies an unzugänglicher Fläche', tip: 'Karies an unzugänglicher Stelle.' },
                { text: 'Druck auf den Nachbarzahn (zweiter Molar)', tip: 'Druck auf den Nachbarzahn.' },
                { text: 'Zahnfleischkappe fängt Speisereste auf', tip: 'Zahnfleischkappe fängt Reste auf.' },
            ],
            advice: 'Mit Salzwasser spülen (Teelöffel pro Glas warmes Wasser) 3x täglich. Wenn der Weisheitszahn auf dem Röntgen schief steht — erwägen Sie präventive Extraktion. Einfacher zu entfernen, bevor er anfängt zu schmerzen.',
            urgency: 'low', doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Mäßig', description: 'Zahnfleischentzündung um den Weisheitszahn — erfordert Behandlung.',
            symptoms: [
                { text: 'Pochender Schmerz im hinteren Kieferbereich', tip: 'Pochender Schmerz hinten im Kiefer.' },
                { text: 'Schwellung und Rötung des Zahnfleischs über dem Weisheitszahn', tip: 'Schwellung über dem Weisheitszahn.' },
                { text: 'Teilweise Kieferklemme', tip: 'Teilweise Schwierigkeiten beim Mundöffnen.' },
                { text: 'Schmerz, der zum Ohr ausstrahlt', tip: 'Zungenscmerz der zum Ohr ausstrahlt.' },
                { text: 'Unangenehmer Geschmack oder Geruch aus der Zahnumgebung', tip: 'Unangenehmer Geschmack.' },
            ],
            causes: [
                { text: 'Perikoronitis (perikoronale Entzündung)', tip: 'Perikoronitis.' },
                { text: 'Approximalkaries mit dem zweiten Molaren', tip: 'Karies zum zweiten Molaren.' },
                { text: 'Teilweise durchgebrochener Weisheitszahn — Speiseretention', tip: 'Teilweise durchgebrochen.' },
                { text: 'Dentogene Zyste', tip: 'Zyste um die Krone eines retinierten Weisheitszahns — auf Röntgen erkennbar.' },
            ],
            advice: 'Entzündung um den Weisheitszahn (Perikoronitis) ist häufig. Termin innerhalb einer Woche — der Arzt beurteilt auf dem Panorama-Röntgen, ob der Zahn richtig durchbrechen kann oder extrahiert werden muss.',
            urgency: 'medium', doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Fortgeschritten', description: 'Abszess oder schwere Entzündung — Extraktion erforderlich.',
            symptoms: [
                { text: 'Starker Schmerz, der Essen verhindert', tip: 'Starker Schmerz verhindert Essen.' },
                { text: 'Deutliche Wangen- oder Unterkieferschwellung', tip: 'Deutliche Schwellung.' },
                { text: 'Kieferklemme (kann Mund kaum öffnen)', tip: 'Kieferklemme.' },
                { text: 'Fieber >38°C', tip: 'Fieber >38°C.' },
                { text: 'Schluckbeschwerden', tip: 'Schluckbeschwerden.' },
                { text: 'Eiter aus dem Zahnfleisch hinter dem letzten Zahn', tip: 'Eiter hinter dem letzten Zahn.' },
            ],
            causes: [
                { text: 'Perikoronaler Abszess', tip: 'Perikoronaler Abszess.' },
                { text: 'Infektion breitet sich auf Faszienräume aus', tip: 'Infektion breitet sich aus.' },
                { text: 'Wurzelresorption des zweiten Molaren durch den drückenden Weisheitszahn', tip: 'Wurzelresorption des Nachbarzahns.' },
                { text: 'Unterkieferfraktur entlang der Weisheitszahnlinie (selten)', tip: 'Unterkieferfraktur (selten).' },
            ],
            advice: 'Dringender Besuch beim Oralchirurgen! Infektion von unteren Weisheitszähnen kann in den submandibulären und zervikalen Raum absteigen — lebensbedrohlich (Ludwigs Angina). Antibiotika + dringende Extraktion.',
            urgency: 'high', doctors: ['marcin', 'ilona'],
        },
    },
};

const TONGUE_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Leicht', description: 'Geringfügige Veränderungen oder Zungenreizung.',
            symptoms: [
                { text: 'Leichtes Brennen an der Zungenspitze', tip: 'Leichtes Brennen.' },
                { text: 'Weißer oder gelblicher Belag auf der Zunge', tip: 'Belag auf der Zunge.' },
                { text: 'Vergrößerte Papillen', tip: 'Vergrößerte Fadenförmige Papillen.' },
                { text: 'Empfindlichkeit gegen scharfe Gewürze', tip: 'Empfindlichkeit gegen Gewürze.' },
            ],
            causes: [
                { text: 'Landkartenzunge (Glossitis migrans) — harmloser Zustand', tip: 'Harmloser Zustand.' },
                { text: 'Mundtrockenheit (Mundatmung)', tip: 'Mundtrockenheit.' },
                { text: 'Vitamin-B-Mangel', tip: 'Vitamin-B-Mangel.' },
                { text: 'Reaktion auf Zahnpasta (SLS — Natriumlaurylsulfat)', tip: 'Reaktion auf Zahnpasta.' },
            ],
            advice: 'Verwenden Sie alkoholfreie Mundspülung, trinken Sie viel Wasser, vermeiden Sie sehr heiße Getränke. Landkartenzunge ist harmlos — braucht keine Behandlung. Bei Belag >2 Wochen zum Arzt.',
            urgency: 'low', doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Mäßig', description: 'Anhaltende Veränderungen, die Diagnostik erfordern.',
            symptoms: [
                { text: 'Anhaltendes Brennen der gesamten Zunge (Burning Mouth)', tip: 'Anhaltendes Brennen.' },
                { text: 'Weiße oder rote Flecken, die sich nicht abreiben lassen', tip: 'Nicht abreibbare Flecken.' },
                { text: 'Schmerzhaftes Geschwür über 10 Tage', tip: 'Schmerzhaftes Geschwür.' },
                { text: 'Wellige Zungenränder (Zahnabdrücke)', tip: 'Wellige Zungenränder.' },
                { text: 'Geschmacksverlust oder metallischer Geschmack', tip: 'Geschmacksverlust.' },
            ],
            causes: [
                { text: 'Leukoplakie (präkanzeröse Veränderung — weißer Fleck)', tip: 'Leukoplakie.' },
                { text: 'Lichen planus (Knötchenflechte)', tip: 'Lichen planus.' },
                { text: 'Orale Candidiasis (Pilzinfektion — Candida)', tip: 'Orale Candidiasis.' },
                { text: 'Burning-Mouth-Syndrom (BMS)', tip: 'BMS.' },
                { text: 'Reizung durch scharfe Zahnkante oder Prothese', tip: 'Reizung durch Zahnkante.' },
            ],
            advice: 'Ein weißer oder roter Fleck auf der Zunge, der nach 2 Wochen nicht verschwindet, erfordert einen Arztbesuch und ggf. Biopsie. Wichtig zur Früherkennung präkanzeröser Veränderungen.',
            urgency: 'medium', doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Fortgeschritten', description: 'Besorgniserregende Veränderung — dringende Diagnostik.',
            symptoms: [
                { text: 'Schmerzloses Geschwür seitlich der Zunge über 3 Wochen', tip: 'Schmerzloses Geschwür.' },
                { text: 'Verhärtung oder tastbarer Knoten in der Zunge', tip: 'Knoten in der Zunge.' },
                { text: 'Blutung aus einer kleinen Läsion auf der Zunge', tip: 'Blutung aus Läsion.' },
                { text: 'Vergrößerte Halslymphknoten', tip: 'Vergrößerte Lymphknoten.' },
                { text: 'Sprach- oder Zungenbeweglichkeitsschwierigkeiten', tip: 'Sprachschwierigkeiten.' },
                { text: 'Deutlicher Gewichtsverlust', tip: 'Gewichtsverlust.' },
            ],
            causes: [
                { text: 'Orales Plattenepithelkarzinom (SCC)', tip: 'Orales SCC.' },
                { text: 'Fortgeschrittene präkanzeröse Läsion', tip: 'Präkanzeröse Läsion.' },
                { text: 'Mundboden-Abszess', tip: 'Mundboden-Abszess kann lebensbedrohlich sein.' },
                { text: 'Ranula (Schleimzyste) — große Größe', tip: 'Ranula.' },
            ],
            advice: 'DRINGEND! Schmerzloses Geschwür seitlich der Zunge über 3 Wochen ist ein klassisches Zeichen, das dringende Biopsie erfordert. Sofort zum Arzt — Früherkennung = vollständige Heilung.',
            urgency: 'high', doctors: ['marcin', 'ilona'],
        },
    },
};

const PALATE_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Leicht', description: 'Reizung oder leichte Gaumenverletzung.',
            symptoms: [
                { text: 'Brennen nach heißem Essen oder Trinken', tip: 'Brennen nach heißem Essen.' },
                { text: 'Leichte Abschürfung oder Kratzer', tip: 'Leichte Abschürfung.' },
                { text: 'Raue/faltige Oberfläche', tip: 'Raue Oberfläche.' },
                { text: 'Leichtes Unbehagen beim Essen', tip: 'Leichtes Unbehagen.' },
            ],
            causes: [
                { text: 'Thermische Verbrennung (heiße Pizza, Kaffee)', tip: 'Thermische Verbrennung.' },
                { text: 'Reizung durch scharfes Essen (Chips, Croutons)', tip: 'Reizung durch Essen.' },
                { text: 'Torus palatinus (knöchernes Wachstum — Normvariante)', tip: 'Torus palatinus — Normvariante.' },
                { text: 'Reizung durch Oberkieferprothese', tip: 'Reizung durch Prothese.' },
            ],
            advice: 'Gaumenverbrennung ist die häufigste Ursache — heilt in 7–10 Tagen. Heiße Speisen vermeiden. Torus palatinus (harte Erhebung in der Mitte) ist eine Normvariante.',
            urgency: 'low', doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Mäßig', description: 'Anhaltende Gaumenveränderungen — abklären lassen.',
            symptoms: [
                { text: 'Knoten oder Schwellung am Gaumen über 2 Wochen', tip: 'Knoten am Gaumen.' },
                { text: 'Schmerzhaftes Geschwür, das Essen erschwert', tip: 'Schmerzhaftes Geschwür.' },
                { text: 'Farbveränderung der Schleimhaut (weiß, rot, violett)', tip: 'Farbveränderung.' },
                { text: 'Blutung bei Berührung', tip: 'Blutung bei Kontakt.' },
                { text: 'Fremdkörpergefühl am Gaumen', tip: 'Fremdkörpergefühl.' },
            ],
            causes: [
                { text: 'Gaumenabszess (von einem oberen Zahn)', tip: 'Gaumenabszess.' },
                { text: 'Pleomorphes Adenom (kleiner Speicheldrüsentumor)', tip: 'Pleomorphes Adenom.' },
                { text: 'Lichen planus am Gaumen', tip: 'Lichen planus am Gaumen.' },
                { text: 'Nekrotisierende orale Entzündung', tip: 'Nekrotisierende Entzündung.' },
                { text: 'Hämangiom', tip: 'Hämangiom.' },
            ],
            advice: 'Ein Knoten am Gaumen, der nach 2–3 Wochen nicht verschwindet, sollte vom Zahnarzt untersucht werden. Der Gaumen ist häufiger Ort für Speicheldrüsentumoren (meist gutartig, aber Bestätigung nötig).',
            urgency: 'medium', doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Fortgeschritten', description: 'Wachsender Knoten oder ausgedehnter Abszess — dringender Besuch.',
            symptoms: [
                { text: 'Schnell wachsender Knoten am Gaumen', tip: 'Schnell wachsender Knoten.' },
                { text: 'Starker Schmerz verhindert Essen und Trinken', tip: 'Starker Schmerz.' },
                { text: 'Gaumenschwellung mit Asymmetrie', tip: 'Gaumenschwellung.' },
                { text: 'Geschwür mit nekrotischer Vertiefung', tip: 'Nekrotisches Geschwür.' },
                { text: 'Gaumenblutung', tip: 'Gaumenblutung.' },
                { text: 'Völlegefühl in einem Nasenloch', tip: 'Völlegefühl im Nasenloch.' },
            ],
            causes: [
                { text: 'Bösartiger kleiner Speicheldrüsentumor', tip: 'Bösartiger Tumor.' },
                { text: 'Plattenepithelkarzinom des Gaumens', tip: 'Plattenepithelkarzinom.' },
                { text: 'Gaumenabszess mit Nasennebenhöhlendurchbruch', tip: 'Abszess mit Sinusdurchbruch.' },
                { text: 'Nekrotisierende Gaumenentzündung', tip: 'Nekrotisierende Entzündung.' },
            ],
            advice: 'DRINGEND! Schnell wachsender Gaumentumor erfordert sofortige Biopsie. Der Gaumen ist der dritthäufigste Ort für Mundhöhlentumoren. Kontaktieren Sie eine Klinik für Mund-Kiefer-Gesichtschirurgie.',
            urgency: 'high', doctors: ['marcin', 'ilona'],
        },
    },
};

const THROAT_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Leicht', description: 'Kratzen oder Halsbeschwerden.',
            symptoms: [
                { text: 'Kratzen oder Trockenheit im Hals', tip: 'Kratzen oder Trockenheit.' },
                { text: 'Leichter Schmerz beim Schlucken', tip: 'Leichter Schluckschmerz.' },
                { text: 'Fremdkörpergefühl', tip: 'Fremdkörpergefühl.' },
                { text: 'Häufiges Räuspern', tip: 'Häufiges Räuspern.' },
            ],
            causes: [
                { text: 'Erkältung oder Virusinfektion', tip: 'Erkältung.' },
                { text: 'Magenreflux (GERD) reizt den Hals', tip: 'Magenreflux.' },
                { text: 'Mundtrockenheit (Mundatmung im Schlaf)', tip: 'Mundtrockenheit im Schlaf.' },
                { text: 'Postnasal Drip', tip: 'Postnasal Drip.' },
            ],
            advice: 'Halsbrennen und Trockenheit sind meist viral oder refluxbedingt. Mit Salzwasser gurgeln. Wenn >2 Wochen — Reflux ausschließen und Arzt konsultieren.',
            urgency: 'low', doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Mäßig', description: 'Anhaltende Halssymptome — können zahnbedingt sein.',
            symptoms: [
                { text: 'Halsschmerzen über 2 Wochen ohne Besserung', tip: 'Anhaltende Halsschmerzen.' },
                { text: 'Vergrößerte Mandeln mit Steinen (Tonsillolithen)', tip: 'Mandelsteine.' },
                { text: 'Schmerz, der zum Ohr ausstrahlt (einseitig)', tip: 'Einseitiger Ohrschmerz.' },
                { text: 'Schluckbeschwerden bei fester Nahrung', tip: 'Schluckbeschwerden.' },
                { text: 'Chronischer Mundgeruch (Halitosis)', tip: 'Chronischer Mundgeruch.' },
            ],
            causes: [
                { text: 'Mandelsteine (Tonsillolithen)', tip: 'Mandelsteine.' },
                { text: 'Komplikation von infiziertem Weisheitszahn (Perikoronitis → Hals)', tip: 'Komplikation Weisheitszahn.' },
                { text: 'Parapharyngeale Bindegewebsentzündung', tip: 'Parapharyngeale Entzündung.' },
                { text: 'Chronische Mandelentzündung', tip: 'Chronische Tonsillitis.' },
            ],
            advice: 'Halsschmerzen, die zum Ohr ausstrahlen, können von infizierten unteren Weisheitszähnen stammen. Panorama-Röntgen empfohlen. Mandelsteine verursachen Mundgeruch — HNO-Arzt kann sie entfernen.',
            urgency: 'medium', doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Fortgeschritten', description: 'Schwere Symptome, die dringende Diagnostik erfordern.',
            symptoms: [
                { text: 'Starke Halsschmerzen mit Fieber >38°C', tip: 'Starke Halsschmerzen mit Fieber.' },
                { text: 'Deutliche Hals- oder Unterkieferschwellung', tip: 'Deutliche Schwellung.' },
                { text: 'Kieferklemme (Mundöffnung schwierig)', tip: 'Kieferklemme.' },
                { text: 'Schwierigkeiten beim Atmen oder Speichelschlucken', tip: 'Atemnot oder Schluckbeschwerden.' },
                { text: 'Heisere Stimme über 3 Wochen', tip: 'Heisere Stimme.' },
                { text: 'Einseitige Taubheit der Zunge oder des Gaumens', tip: 'Einseitige Taubheit.' },
            ],
            causes: [
                { text: 'Peritonsillarabszess', tip: 'Eiteransammlung neben der Mandel — erfordert Inzision und Drainage.' },
                { text: 'Mundboden-Abszess mit Ausbreitung zum Hals', tip: 'Mundboden-Abszess.' },
                { text: 'Ludwigs Angina (lebensbedrohlich!)', tip: 'Ludwigs Angina (lebensbedrohlich!).' },
                { text: 'Rachen- oder Mandelkrebs', tip: 'Rachen- oder Mandelkrebs.' },
            ],
            advice: 'DRINGEND — Notaufnahme! Atemnot oder Schwierigkeiten beim Speichelschlucken + Halsschwellung erfordern sofortiges Eingreifen. Ludwigs Angina ist lebensbedrohlich. Nicht bis morgen warten!',
            urgency: 'high', doctors: ['marcin', 'ilona'],
        },
    },
};

function makeToothZone(id: string, title: string, subtitle: string, data: Omit<ZoneInfo, 'title' | 'subtitle'>): ZoneInfo {
    return { title, subtitle, ...data };
}

export const SYMPTOM_DATA_DE: Record<string, ZoneInfo> = {
    "11": makeToothZone("11", "Oberer Rechter Eins", "Mittlerer Schneidezahn · Zahn 11", INCISOR_DATA),
    "12": makeToothZone("12", "Oberer Rechter Zweier", "Seitlicher Schneidezahn · Zahn 12", INCISOR_DATA),
    "13": makeToothZone("13", "Oberer Rechter Eckzahn", "Eckzahn · Zahn 13", CANINE_DATA),
    "14": makeToothZone("14", "Oberer Rechter Vierer", "1. Prämolar · Zahn 14", PREMOLAR_DATA),
    "15": makeToothZone("15", "Oberer Rechter Fünfer", "2. Prämolar · Zahn 15", PREMOLAR_DATA),
    "16": makeToothZone("16", "Oberer Rechter Sechser", "1. Molar · Zahn 16", MOLAR_DATA),
    "17": makeToothZone("17", "Oberer Rechter Siebener", "2. Molar · Zahn 17", MOLAR_DATA),
    "18": makeToothZone("18", "Oberer Rechter Weisheitszahn", "Weisheitszahn · Zahn 18", WISDOM_DATA),
    "21": makeToothZone("21", "Oberer Linker Eins", "Mittlerer Schneidezahn · Zahn 21", INCISOR_DATA),
    "22": makeToothZone("22", "Oberer Linker Zweier", "Seitlicher Schneidezahn · Zahn 22", INCISOR_DATA),
    "23": makeToothZone("23", "Oberer Linker Eckzahn", "Eckzahn · Zahn 23", CANINE_DATA),
    "24": makeToothZone("24", "Oberer Linker Vierer", "1. Prämolar · Zahn 24", PREMOLAR_DATA),
    "25": makeToothZone("25", "Oberer Linker Fünfer", "2. Prämolar · Zahn 25", PREMOLAR_DATA),
    "26": makeToothZone("26", "Oberer Linker Sechser", "1. Molar · Zahn 26", MOLAR_DATA),
    "27": makeToothZone("27", "Oberer Linker Siebener", "2. Molar · Zahn 27", MOLAR_DATA),
    "28": makeToothZone("28", "Oberer Linker Weisheitszahn", "Weisheitszahn · Zahn 28", WISDOM_DATA),
    "31": makeToothZone("31", "Unterer Linker Eins", "Mittlerer Schneidezahn · Zahn 31", INCISOR_DATA),
    "32": makeToothZone("32", "Unterer Linker Zweier", "Seitlicher Schneidezahn · Zahn 32", INCISOR_DATA),
    "33": makeToothZone("33", "Unterer Linker Eckzahn", "Eckzahn · Zahn 33", CANINE_DATA),
    "34": makeToothZone("34", "Unterer Linker Vierer", "1. Prämolar · Zahn 34", PREMOLAR_DATA),
    "35": makeToothZone("35", "Unterer Linker Fünfer", "2. Prämolar · Zahn 35", PREMOLAR_DATA),
    "36": makeToothZone("36", "Unterer Linker Sechser", "1. Molar · Zahn 36", MOLAR_DATA),
    "37": makeToothZone("37", "Unterer Linker Siebener", "2. Molar · Zahn 37", MOLAR_DATA),
    "38": makeToothZone("38", "Unterer Linker Weisheitszahn", "Weisheitszahn · Zahn 38", WISDOM_DATA),
    "41": makeToothZone("41", "Unterer Rechter Eins", "Mittlerer Schneidezahn · Zahn 41", INCISOR_DATA),
    "42": makeToothZone("42", "Unterer Rechter Zweier", "Seitlicher Schneidezahn · Zahn 42", INCISOR_DATA),
    "43": makeToothZone("43", "Unterer Rechter Eckzahn", "Eckzahn · Zahn 43", CANINE_DATA),
    "44": makeToothZone("44", "Unterer Rechter Vierer", "1. Prämolar · Zahn 44", PREMOLAR_DATA),
    "45": makeToothZone("45", "Unterer Rechter Fünfer", "2. Prämolar · Zahn 45", PREMOLAR_DATA),
    "46": makeToothZone("46", "Unterer Rechter Sechser", "1. Molar · Zahn 46", MOLAR_DATA),
    "47": makeToothZone("47", "Unterer Rechter Siebener", "2. Molar · Zahn 47", MOLAR_DATA),
    "48": makeToothZone("48", "Unterer Rechter Weisheitszahn", "Weisheitszahn · Zahn 48", WISDOM_DATA),
    "tongue": { title: "Zunge", subtitle: "Mundboden", ...TONGUE_DATA },
    "palate": { title: "Gaumen", subtitle: "Obere Wand der Mundhöhle", ...PALATE_DATA },
    "throat": { title: "Rachen / Hinterwand", subtitle: "Mandeln und Rachenring", ...THROAT_DATA },
};
