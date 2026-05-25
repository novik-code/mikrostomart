-- L-6 #2 (2026-05-25 LATE+2): seed DE knowledge base article — Sofortbelastung
--
-- "Sofortbelastung beim Zahnimplantat: Wann ist sie möglich?
--  Voraussetzungen und Risiken (2026)"
--
-- Drugi cluster article L-6 dla L-5 pillar. Po Marcin verdict A (2026-05-25)
-- Faza M Tryb A confirmed → rolling AI-only content engine.
--
-- Standalone DE article (brak PL parent). Nowy group_id → hreflang tylko DE
-- + x-default → DE.
--
-- Lessons applied (L-5 + L-6 #1 pattern):
-- - Implant pricing: 6000-8000 PLN pakiet (mig 134), All-on-4 30-40k PLN
-- - Zero embedded Reviews schema (GSC self-serving prevention)
-- - Clinic-wide stats: round-up + cross-link do /de homepage live TrustStats
-- - Brand references: Straumann BLT, Nobel Replace, Astra Tech EV, Osstell ISQ
-- - Akredytacje: M.Sc. RWTH 2021, LA&HA Dozent, Oral Surgery Academy, PTSL
-- - 12+ cross-links internal (L-5 pillar + L-6 #1 cluster)
--
-- Idempotent: WHERE NOT EXISTS guard. Bezpieczne re-run.

INSERT INTO articles (slug, locale, group_id, title, excerpt, content, image_url, published_date)
SELECT
    'sofortbelastung-zahnimplantat-voraussetzungen-risiken',
    'de',
    gen_random_uuid(),
    'Sofortbelastung beim Zahnimplantat: Wann ist sie möglich? Voraussetzungen und Risiken (2026)',
    'Sofortbelastung beim Zahnimplantat — Implantat + Krone in 24-72 Stunden. Voraussetzungen: ISQ ≥70, primäre Stabilität ≥35 Ncm, Premium-Implantate (Straumann, Nobel). Erfolgsquoten 95-98%. All-on-4-Konzept aus Opole.',
    $body$### Einführung — Was bedeutet Sofortbelastung?

Klassisch ist eine Implantatbehandlung ein **Zwei-Phasen-Prozess**: Das Implantat wird gesetzt, anschließend wartet man **3-6 Monate** auf die vollständige Osseointegration (Verwachsung mit dem Kieferknochen), erst dann wird die Krone aufgesetzt. Während dieser Wartezeit tragen die Patienten oft ein provisorisches Gebiss oder leben mit einer sichtbaren Lücke.

Bei der **Sofortbelastung** (englisch *immediate loading*) wird das Implantat **innerhalb von 24-72 Stunden** mit einer provisorischen oder finalen Krone versorgt — Sie verlassen die Praxis bereits mit einem festen Zahnersatz. In ausgewählten Fällen ist das nicht nur möglich, sondern sogar die **klinisch bessere Option**.

Wichtig: **Sofortbelastung ≠ Sofortversorgung**. Bei der Sofortversorgung trägt die Krone keine Kaubelastung (occlusal entlastet); bei der echten Sofortbelastung hat die Krone normalen Kontakt mit dem Gegenkiefer. Beide Konzepte ergänzen unser Behandlungsspektrum in [Mikrostomart Opole](/de/oferta/implantologia).

Dieser Artikel erklärt, **wann Sofortbelastung sicher ist, welche Voraussetzungen erfüllt sein müssen** und welche Risiken Sie kennen sollten — basierend auf aktueller wissenschaftlicher Evidenz und unserer klinischen Erfahrung. Falls Sie eine [komplette Implantatbehandlung in Polen](/de/baza-wiedzy/zahnimplantate-in-polen-kosten-qualitaet-opole) überlegen, ist die Sofortbelastung oft entscheidend für die Planung Ihrer Anreise.

### Voraussetzungen — wann Sofortbelastung möglich ist

Die internationale Konsensliteratur (ITI Treatment Guide, 2019; Esposito et al., Cochrane Review 2013) definiert klare Mindestbedingungen für eine sichere Sofortbelastung:

#### Primäre Implantatstabilität ≥ 35 Ncm

Die **Eindrehkraft (Insertion Torque)** beim Setzen des Implantats muss mindestens **35 Newton-Centimeter** betragen — das misst, wie fest das Implantat im Knochen verankert ist. Liegt der Wert darunter, ist die Stabilität nicht ausreichend für sofortige Kaubelastung.

#### ISQ ≥ 70 (Osstell-Messung)

Wir verwenden in Mikrostomart einen **Osstell Beacon** — ein Gerät zur Resonanzfrequenzanalyse (RFA). Es ermittelt den **ISQ-Wert** (*Implant Stability Quotient*) auf einer Skala von 1-100. **Werte ≥70** bedeuten ausreichende Primärstabilität für eine Sofortbelastung.

Diese Messung ist **kein optionales Extra** — sie ist die wissenschaftlich validierte Methode, um intraoperativ über Sofortbelastung zu entscheiden, anstatt sich auf das "Gefühl" des Chirurgen zu verlassen.

#### Knochenqualität — Typ 1 bis 3 (Lekholm-Zarb-Klassifikation)

Der Knochen muss eine ausreichende Dichte aufweisen. **Typ 1** (sehr dicht, oft Unterkiefer-Front) und **Typ 2** (dicht mit kortikalem Anteil) sind ideal. **Typ 3** ist akzeptabel mit angepasster Technik. **Typ 4** (weich, spongiös — typisch im posterioren Oberkiefer) ist **nicht geeignet** für Sofortbelastung.

#### Ausreichendes Knochenvolumen

Mindest-Knochenhöhe für ein Standardimplantat: **10 mm vertikal, 6 mm horizontal**. Liegt das Volumen darunter, wird zuerst eine [Knochenaugmentation](/de/baza-wiedzy/knochenaugmentation-in-polen-methoden-kosten-erfolgsquote) durchgeführt — Sofortbelastung ist dann erst nach 4-9 Monaten möglich.

#### Steriles Operationsgebiet

Keine akute Infektion, kein aktiver Knochenabbau. Bei einer Sofortimplantation nach Zahnextraktion (immediate placement) entscheiden wir intraoperativ nach gründlichem Débridement der Alveole.

#### Compliance des Patienten

Sie müssen unsere Nachsorgeanleitung **strikt befolgen** — weiche Diät für 6-8 Wochen, kein Druck auf das Implantat, sorgfältige Mundhygiene. Nicht-Compliance ist eine der Hauptursachen für frühe Implantatverluste.

### Wann Sofortbelastung NICHT geeignet ist — Risikofaktoren

Auch wenn die technischen Parameter (Stabilität, Knochen) optimal sind, gibt es **medizinische und Lifestyle-Faktoren**, bei denen wir vom Sofortbelastungskonzept abraten:

* **Starkes Rauchen (>10 Zigaretten/Tag)** — reduziert Erfolgsquote um 10-20% (Levin et al. 2008). Bei 1-5 Zigaretten/Tag besprechen wir das individuelle Risiko und empfehlen Reduktion vor der Behandlung.
* **Unkontrollierter Diabetes mellitus** (HbA1c >7,0) — gestörte Wundheilung. Bei gut eingestelltem Diabetes ist Sofortbelastung möglich.
* **Bisphosphonat-Therapie (insbesondere intravenös)** — Risiko der Bisphosphonat-assoziierten Kiefernekrose. Individuelle Risikoabschätzung mit Onkologen/Rheumatologen notwendig.
* **Aktive Parodontitis** — muss vor der Implantation behandelt werden.
* **Schwerer Bruxismus** ohne Aufbissschiene — übermäßige Kräfte gefährden die frühe Osseointegration.
* **Immunsuppression** (Chemotherapie, Transplantationspatienten, Autoimmunerkrankungen unter Therapie) — individuell zu prüfen.
* **Großflächige gleichzeitige Knochenaugmentation** — bei kombinierten Eingriffen ist konventionelles Vorgehen sicherer.

Eine ehrliche Anamnese ist entscheidend — auch über Vorerkrankungen und Medikamente, die Sie selbst für irrelevant halten. Wir besprechen alle Faktoren bei der Erstberatung in Opole.

### Zwei Hauptszenarien der Sofortbelastung

#### Szenario A: Sofortbelastung in einer Extraktionsalveole

Ein Zahn wird gezogen, sofort ein Implantat gesetzt, sofort ein Provisorium aufgesetzt. **Drei Eingriffe an einem Tag.** Wenn die Voraussetzungen erfüllt sind, vermeidet dieser Ansatz mehrere Operationen und verkürzt die Behandlungszeit um Monate.

**Wichtige Bedingungen:** Alveole gründlich debridiert, primäre Stabilität ≥35 Ncm im residualen Knochen, PRF-Augmentation in den Spalt zwischen Implantat und Alveolenwand, gegebenenfalls Knochenersatzmaterial (Bio-Oss®).

#### Szenario B: Sofortbelastung in zuvor verheiltem Knochen

Der Knochen ist bereits stabil (Extraktion vor mehreren Monaten, geheilte Alveole oder rekonstruierter Knochen nach Augmentation). Implantat wird gesetzt, ISQ gemessen, bei Werten ≥70 sofort mit Krone versorgt.

**Vorteil dieses Szenarios:** vorhersehbarere Primärstabilität, klarere Indikationsstellung. Wir empfehlen es als sicherere Alternative für Patienten, die die zusätzlichen Risiken einer Sofortimplantation vermeiden wollen.

### All-on-4 und All-on-6 — Sofortbelastung für die Vollbezahnung

Eines der bekanntesten Sofortbelastungskonzepte ist das **All-on-4** (oder All-on-6) Verfahren — eine **komplette Brücke auf 4-6 Implantaten** mit Sofortversorgung am Operationstag.

**Wie es funktioniert:**

* **Anguliertes Setzen der distalen Implantate** (15-30° Neigung) — umgeht die Kieferhöhle, ermöglicht längere Implantate in dichteren Knochen, **oft ohne Augmentation** möglich
* **Verblockung mit Querbügel** (cross-arch splinting) — die 4-6 Implantate stabilisieren sich gegenseitig
* **Provisorische Brücke am Operationstag** — Sie verlassen die Praxis mit funktionellem festen Zahnersatz
* **Finale Brücke nach 3-4 Monaten** — Vollkeramik, Zirkonoxid oder Acryl auf Titangerüst

**Kosten in Mikrostomart (Stand 2026):**

* **All-on-4 mit provisorischer Brücke (Sofortbelastung):** ab ca. 30.000-40.000 PLN (ca. 7.000-9.300 EUR)
* **All-on-6:** ab ca. 45.000-55.000 PLN (ca. 10.500-12.800 EUR)
* **Finale Brücke** (3-4 Monate später): inklusive im Gesamtpaket oder als Upgrade-Option (z.B. Zirkonoxid mit Vollkeramik)

**Zum Vergleich Deutschland:** All-on-4 typischerweise 18.000-30.000 EUR; All-on-6 25.000-40.000 EUR. **Kostenersparnis 50-70%** bei identischen Premium-Implantatmarken.

Die exakte Kalkulation für Ihre Situation erstellen wir nach der CBCT-Erstberatung. Aktueller Preisrahmen auf der [Preisseite](/de/cennik).

### Wissenschaftliche Evidenz — Erfolgsquoten

Die Sofortbelastung ist seit den frühen 2000er Jahren ausführlich erforscht und dokumentiert. Hier die wichtigsten Daten aus systematischen Reviews und Langzeitstudien:

* **Einzelimplantat Sofortbelastung:** 95-98% Implantatüberleben nach 5 Jahren (Esposito et al. 2013, Cochrane Review)
* **All-on-4 mit Sofortbelastung:** 96-98% nach 10 Jahren (Maló et al. 2011, original All-on-4-Studie an 245 Patienten)
* **All-on-4 nach 18 Jahren:** 94,8% Implantatüberleben, 99,2% prothetischer Erfolg (Maló et al., 2019 Langzeit-Follow-up)
* **Sofortbelastung nach Extraktion (immediate placement + immediate load):** 92-95% (Cosyn et al. 2013)
* **Konventionelles Vorgehen (3-6 Monate Wartezeit):** 96-99% — minimaler Unterschied bei korrekt selektierten Patienten

**Wichtigste Lehre der Forschung:** Die Erfolgsquote der Sofortbelastung ist **fast identisch** mit dem konventionellen Vorgehen, **vorausgesetzt** die Voraussetzungen sind erfüllt. Schlechte Indikationsstellung (z.B. ISQ <70, weicher Knochen, Raucher) drückt die Erfolgsquote auf 80-85%.

### Behandlungsablauf — sechs Schritte

#### Schritt 1: Erstberatung + CBCT-Diagnostik (Tag 1)

3D-Bildgebung des Kiefers, Bewertung von Knochenvolumen und -dichte, Planung der Implantatposition mit chirurgischer Schablone, Festlegung der Methode (Einzelimplantat / Multi-Unit / All-on-4-6).

#### Schritt 2: Digitale Mock-up und Patientenfreigabe

Wir scannen Ihr Gebiss intraoral (3Shape Trios) und zeigen Ihnen die geplante finale Versorgung am Bildschirm. Sie sehen das Ergebnis **bevor** die Operation beginnt — und können Anpassungen wünschen.

#### Schritt 3: Operationstag (60-90 Min Einzelimplantat, 120-180 Min All-on-4)

* Lokalanästhesie (optional mit Lachgas-Sedierung)
* Implantatsetzung unter ZEISS-Mikroskop-Kontrolle
* **Intraoperative ISQ-Messung** mit Osstell Beacon
* **Entscheidung Sofortbelastung ja/nein** auf Basis Torque + ISQ
* Bei Sofortimplantation: PRF-Augmentation in den Alveolenspalt

#### Schritt 4: Provisorische Krone in 24-48 Stunden

CAD/CAM-gefertigte Provisorische Krone (PMMA oder Komposit) wird auf das Implantat verschraubt. Sie verlassen die Praxis mit funktionellem Zahnersatz.

#### Schritt 5: 1-2 Wochen Kontrolle

In Opole oder remote per WhatsApp-Foto-Konsultation. Naht-Entfernung (falls nicht resorbierbar), Kontrolle der Wundheilung.

#### Schritt 6: Finale Krone nach 3-4 Monaten

Nach abgeschlossener Osseointegration: zweiter Besuch in Opole, finaler Intraoralscan, individuell gefertigte Vollkeramik- oder Zirkonoxid-Krone. **Endergebnis: ein natürlicher, voll funktionsfähiger Zahnersatz.**

### Marcin Nowosielski — Sofortbelastung-Protokoll in Mikrostomart

Dr. Marcin Nowosielski's klinisches Sofortbelastungs-Protokoll basiert auf evidenzbasierten Entscheidungskriterien:

* **Osstell ISQ-Messung obligatorisch** vor jeder Sofortbelastung — keine subjektiven Schätzungen
* **Premium-Implantate ausschließlich** — Straumann BLT (Bone Level Tapered), Nobel Replace CC, Astra Tech EV — alle drei sind dokumentiert für hohe Primärstabilität
* **PRF in der Alveole** bei jeder Sofortimplantation — beschleunigt Heilung um 30-40% ([Marcin's Forschungsschwerpunkt](/de/zespol/marcin-nowosielski))
* **Konservative Indikation** — bei Grenzfällen empfehlen wir konventionelles Vorgehen statt Risiko einzugehen
* **Bruxguard obligatorisch** bei allen Sofortbelastungs-Patienten in den ersten 6 Monaten
* **Mikroskop ZEISS Extaro** für sub-millimetergenaue Insertionskontrolle

Marcin's wissenschaftliche Qualifikation:

* **M.Sc. in Lasers in Dentistry** — RWTH Aachen University (2021), zweiter Absolvent in Polen
* **LA&HA Dozent** — Vorträge in Slowenien (2019, 2023) und Polen (Keynote 2022)
* **Oral Surgery Academy** — Curriculum in komplexen chirurgischen Eingriffen
* **4 wissenschaftliche Publikationen** im Magazyn Stomatologiczny

Mehr Details und Publikationen auf der Seite [Über Dr. Marcin Nowosielski](/de/zespol/marcin-nowosielski).

### Vergleich: Sofortbelastung vs. konventionelles Vorgehen

**Behandlungsdauer**

* **Sofortbelastung:** 3-5 Tage (Provisorium) + 3-4 Monate (finale Krone)
* **Konventionell:** 3-6 Monate Wartezeit + 1-2 Tage (finale Krone)

**Anzahl Besuche in Opole**

* **Sofortbelastung:** 2 (Operation + Final)
* **Konventionell:** 3-4 (Extraktion + Implantation + Abutment + Krone)

**Soziale Akzeptanz während Heilung**

* **Sofortbelastung:** sofort mit Krone — keine Lücke
* **Konventionell:** provisorisches Gebiss oder Lücke für 3-6 Monate

**Erfolgsquote (richtig indiziert)**

* **Sofortbelastung:** 95-98% nach 5-10 Jahren
* **Konventionell:** 96-99% nach 5-10 Jahren

**Risiko bei suboptimaler Indikation**

* **Sofortbelastung:** 15-20% Verlustrisiko, wenn Voraussetzungen nicht erfüllt
* **Konventionell:** auch bei Grenzfällen sicherer

**Kosten**

* **Sofortbelastung:** vergleichbar mit konventionellem Vorgehen (oft minimaler Aufpreis durch CAD/CAM-Provisorium)
* **Konventionell:** Standardpreis

Welche Methode für Sie die richtige ist, klären wir bei der **CBCT-Erstberatung in Opole**.

### Kosten — Sofortbelastung in Polen

**Einzelimplantat mit Sofortbelastung:**

* Im Standard-Implantatpaket enthalten (6.000-8.000 PLN, ca. 1.400-1.850 EUR) — wenn die Voraussetzungen erfüllt sind, kalkulieren wir die Sofortbelastung ohne Aufpreis
* CAD/CAM-gefertigte Provisorische Krone meist im Paket inkludiert

**All-on-4 mit Sofortbelastung:** 30.000-40.000 PLN (ca. 7.000-9.300 EUR)
**All-on-6 mit Sofortbelastung:** 45.000-55.000 PLN (ca. 10.500-12.800 EUR)

**Kostenersparnis vs. Deutschland: 50-70%** bei identischen Implantatmarken (Straumann, Nobel Biocare, Astra Tech). Wir stellen einen schriftlichen **Kostenvoranschlag in deutscher Sprache** (BEMA/GOZ-konform) für Ihre Krankenkasse aus.

Mehr Information zur [Kostenerstattung durch deutsche Krankenkassen](/de/gwarancje) und Beispielrechnungen.

### Anreise und Aufenthalt

Sofortbelastung erfordert **einen längeren ersten Aufenthalt** (3-5 Tage), da Operation, Provisorium und Kontrolle in dieser Zeit stattfinden:

* **Tag 1:** CBCT-Erstberatung + digitale Planung
* **Tag 2 oder 3:** Implantation + Provisorium
* **Tag 4-5:** Wundkontrolle und Naht-Entfernung (falls notwendig)
* **3-4 Monate später:** zweiter Besuch in Opole — finale Krone (1-2 Tage)

**Anreise nach Opole:**

* **Dresden:** ca. 3 Stunden Fahrt (300 km via A4)
* **Berlin:** ca. 5 Stunden (550 km via A12 → A4)
* **Wien:** ca. 5 Stunden (530 km)
* **Flughäfen:** Wrocław (90 km) — Direktflüge aus Frankfurt, München, Düsseldorf

Weitere Informationen zur Logistik, Hotels in Gehweite und Sprachunterstützung auf der Seite [Für Patienten aus dem Ausland](/de/dla-pacjentow-przyjezdnych).

### Klinik Mikrostomart — Erfahrung und Statistik

Die Klinik **Mikrostomart** im Zentrum von Opole wird seit **2016** von Dr. Marcin Nowosielski und seiner Ehefrau Elżbieta Nowosielska geführt. Wir haben **über 1.250 Implantate** gesetzt und **über 6.000 Patienten** betreut — ein bedeutender Anteil davon aus Deutschland, Österreich und der Schweiz.

Tagesaktuelle Behandlungszahlen sind live auf unserer [Startseite](/de) im Echtzeit-Dashboard sichtbar — direkt aus dem Klinikinformationssystem.

### Häufig gestellte Fragen (FAQ)

#### Tut die Sofortbelastung mehr weh als das konventionelle Vorgehen?

**Nein.** Der eigentliche Eingriff ist identisch — Lokalanästhesie, gegebenenfalls Lachgas-Sedierung. Die ersten 2-3 Tage nach der Operation sind mit Standardanalgetika gut kontrollierbar (Ibuprofen 400 mg + Paracetamol 500 mg). Anschließend sollten Sie 6-8 Wochen weiche Kost essen, um das frisch belastete Implantat nicht zu überfordern.

#### Was passiert, wenn das Implantat nicht osseointegriert?

Bei einer Misserfolgsquote von 2-5% (richtig indizierte Sofortbelastung) wird das Implantat schonend entfernt, der Knochen heilt aus, gegebenenfalls augmentieren wir, und nach 4-6 Monaten setzen wir ein neues Implantat — meist erfolgreich. Sie sind durch unsere [Behandlungsgarantie](/de/gwarancje) abgesichert.

#### Kann ich mit der Sofort-Krone normal essen?

**Eingeschränkt.** In den ersten 6-8 Wochen sollten Sie **weiche Kost** bevorzugen (Pasta, gekochtes Gemüse, weiches Brot, Fisch, gut gekochtes Fleisch). Harte Lebensmittel (Nüsse, harte Karotten, knusprige Pizza-Kruste) sollten Sie meiden. Danach normalisiert sich die Kaubelastung schrittweise. **Bruxguard** in der Nacht ist obligatorisch.

#### Wird die Lücke nach der Extraktion sichtbar sein?

**Nein** — das ist gerade der Vorteil der Sofortbelastung. Die provisorische Krone wird **innerhalb von 24-48 Stunden** nach der Implantation aufgesetzt. Sie verlassen Opole bereits mit einem ästhetisch ansprechenden, funktionellen Zahnersatz.

#### Ich rauche 5-10 Zigaretten am Tag — kann ich Sofortbelastung haben?

**Mit Einschränkungen.** Bei 5-10 Zigaretten täglich besprechen wir das individuelle Risiko (Erfolgsquote sinkt um ca. 5-10%). Wir empfehlen dringend, mindestens **2 Wochen vor und 8 Wochen nach** der Implantation komplett auf Nikotin zu verzichten. Bei >10 Zigaretten täglich raten wir vom Sofortbelastungskonzept ab.

#### Brauche ich für All-on-4 unbedingt Knochenaugmentation?

**Oft nicht.** Das All-on-4-Konzept nutzt **anguliertes Setzen** der distalen Implantate (15-30° Neigung) — dadurch werden die Implantate in den dichten anterioren Kieferknochen verlagert, **ohne** dass die Kieferhöhle aufgebaut werden muss. Bei stark resorbierten Kieferknochen kann zusätzliche [Knochenaugmentation](/de/baza-wiedzy/knochenaugmentation-in-polen-methoden-kosten-erfolgsquote) notwendig sein — das klären wir mit der CBCT-Erstberatung.

### Nächste Schritte — kostenlose Erstberatung

Sofortbelastung ist eine **effiziente, vorhersagbare Behandlungsoption** für die richtigen Patienten — vorausgesetzt, die Indikationsstellung erfolgt sorgfältig auf Basis von CBCT-Diagnostik, ISQ-Messung und ausführlicher Anamnese. Falls Sie überlegen, sich Ihre Implantatbehandlung in Polen vornehmen zu lassen und an einer **schnelleren Lösung** interessiert sind, beginnen Sie mit einer unverbindlichen Erstberatung.

**Kontaktmöglichkeiten:**

* **Telefon und WhatsApp:** +48 570 270 470 (Marcin und Elżbieta sprechen Deutsch)
* **Online-Terminvereinbarung:** über unsere [Buchungsseite](/de/rezerwacja)
* **E-Mail:** über das [Kontaktformular](/de/kontakt)

Weitere relevante Themen:

* [Zahnimplantate in Polen — Kosten, Qualität, Erfahrungen](/de/baza-wiedzy/zahnimplantate-in-polen-kosten-qualitaet-opole) — der Hauptartikel
* [Knochenaugmentation — Methoden, Kosten, Erfolgsquote](/de/baza-wiedzy/knochenaugmentation-in-polen-methoden-kosten-erfolgsquote) — falls Knochenaufbau zuerst notwendig
* [Implantologie — Übersicht der Leistungen](/de/oferta/implantologia)
* [Akkreditierungen und wissenschaftliche Tätigkeit](/de/akredytacje)
* [Implantate in Opole](/implanty-opole) (lokale Geo-Seite auf Polnisch)
* [Garantien und Kostenerstattung](/de/gwarancje)

**Mikrostomart Opole — Sofortbelastung mit wissenschaftlicher Indikationsstellung. Premium-Implantate, ZEISS-Mikroskop, Osstell ISQ-Messung. Nah an Deutschland.**$body$,
    '/kb-implant-structure.webp',
    '2026-05-25'
WHERE NOT EXISTS (
    SELECT 1 FROM articles WHERE slug = 'sofortbelastung-zahnimplantat-voraussetzungen-risiken' AND locale = 'de'
);
