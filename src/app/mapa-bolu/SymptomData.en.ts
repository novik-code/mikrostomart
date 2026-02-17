
// ─────────────────────────────────────────────────────────────
// SYMPTOM DATA — English translations
// ─────────────────────────────────────────────────────────────

import type { ZoneInfo } from './SymptomData';

export const DOCTORS_EN: Record<string, { name: string; specialties: string }> = {
    marcin: { name: 'Dr. Marcin Nowosielski, DDS', specialties: 'Surgery, advanced endodontics, implant prosthetics' },
    ilona: { name: 'Dr. Ilona Piechaczek, DDS', specialties: 'Endodontics, prosthetics' },
    katarzyna: { name: 'Dr. Katarzyna Halupczok, DDS', specialties: 'Restorative dentistry, pediatric dentistry' },
    dominika: { name: 'Dr. Dominika Milicz, DDS', specialties: 'Restorative dentistry, pediatric dentistry' },
};

// ─── TOOTH TYPE TEMPLATES ───

const INCISOR_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Mild',
            description: 'Minor discomfort or cosmetic change, no strong pain.',
            symptoms: [
                { text: 'Brief sensitivity to cold or sweets', tip: 'Lasts a few seconds after stimulus contact. Typical for early enamel loss or exposed dentin.' },
                { text: 'Slight discoloration or color change', tip: 'White or brown spots on enamel may indicate early stages of demineralization or shallow decay.' },
                { text: 'Mild discomfort when biting hard foods', tip: 'Enamel micro-cracks or small cavities can cause brief pain when biting.' },
                { text: 'Rough surface on the tooth edge', tip: 'May indicate enamel erosion caused by an acidic diet or bruxism.' },
            ],
            causes: [
                { text: 'Early enamel demineralization (white spots)', tip: 'First stage of decay — enamel loses minerals. Reversible with proper fluoride remineralization.' },
                { text: 'Shallow decay (surface level)', tip: 'Cavity limited to enamel. Requires a small composite filling.' },
                { text: 'Gum recession exposing the neck of the tooth', tip: 'Gum recession exposes sensitive root dentin. May require surgical coverage.' },
                { text: 'Erosion damage (acidic diet)', tip: 'Carbonated drinks, citrus fruits, and stomach reflux dissolve enamel. Dietary changes halt progression.' },
            ],
            advice: 'Use fluoride toothpaste (min. 1450 ppm) and mouthwash. If sensitivity persists for more than 2 weeks — book a check-up. Early intervention can save the tooth without extensive treatment.',
            urgency: 'low',
            doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Moderate',
            description: 'Recurring pain requiring diagnostics.',
            symptoms: [
                { text: 'Spontaneous pain, worsening in the evening', tip: 'Pain without visible cause, worse when lying down — suggests pulp (nerve) inflammation.' },
                { text: 'Prolonged reaction to hot/cold (>30 seconds)', tip: 'Reaction lasting over 30 seconds indicates reversible pulpitis requiring treatment.' },
                { text: 'Visible cavity or gap on the tooth surface', tip: 'A cavity visible to the naked eye means decay reaching at least the dentin.' },
                { text: 'Slight swelling or redness of the gum around the tooth', tip: 'May indicate local gum inflammation or the beginning of infection around the tooth.' },
                { text: 'Crumbling of the tooth edge', tip: 'Weakened enamel structure breaks off in fragments — requires prosthetic restoration.' },
            ],
            causes: [
                { text: 'Moderately advanced decay (reaching dentin)', tip: 'Bacteria have penetrated through enamel into dentin. Requires removal of decayed tissue and filling.' },
                { text: 'Enamel crack (cracked enamel syndrome)', tip: 'Invisible crack line causes pain when biting specific foods. Difficult to diagnose without a microscope.' },
                { text: 'Reversible pulpitis', tip: 'The pulp (nerve) is irritated but alive. Proper conservative treatment can preserve tooth vitality.' },
                { text: 'Mechanical trauma (e.g. after a blow)', tip: 'Trauma can cause cracks or pulp damage even without visible changes. Requires a follow-up X-ray.' },
            ],
            advice: 'A visit within 1–2 weeks is necessary. The doctor will assess the depth of the cavity and whether a filling or root canal treatment is needed. Don\'t wait — this condition can worsen.',
            urgency: 'medium',
            doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Advanced',
            description: 'Severe pain requiring urgent intervention.',
            symptoms: [
                { text: 'Intense, throbbing pain difficult to localize', tip: 'Pain radiates to the ear, temple, or eye. Typical for pulpitis — requires urgent intervention.' },
                { text: 'Pain that wakes you at night', tip: 'Pain waking you from sleep is a serious sign of untreated inflammation or pulp necrosis.' },
                { text: 'Facial or gum swelling', tip: 'Swelling indicates infection spreading beyond the tooth. May require antibiotic therapy.' },
                { text: 'Tooth has changed color (gray/dark)', tip: 'Darkening of the tooth indicates pulp necrosis — the tooth is dead and requires root canal treatment.' },
                { text: 'Abscess or fistula (pus-filled blister on the gum)', tip: 'Pus accumulation around the root forms an abscess. A fistula is natural drainage. Requires immediate treatment.' },
                { text: 'Fever accompanying tooth pain', tip: 'Fever indicates a systemic response to infection. Urgent medical consultation needed!' },
            ],
            causes: [
                { text: 'Irreversible pulpitis', tip: 'The tooth nerve is irreversibly damaged. The only solution is root canal treatment under a microscope.' },
                { text: 'Pulp necrosis with infection', tip: 'The dead nerve has become a source of bacterial infection. Requires endodontic treatment and possibly antibiotics.' },
                { text: 'Periapical abscess', tip: 'A pus reservoir at the tooth root. Can lead to cellulitis — a spreading, life-threatening infection.' },
                { text: 'Root fracture after trauma', tip: 'The root is cracked below the gum line. Depending on the fracture level — treatment or extraction.' },
            ],
            advice: 'Urgent visit — ideally today or tomorrow! Untreated inflammation can lead to spreading soft tissue infection (cellulitis). Until your visit: pain relievers (ibuprofen 400mg every 6h), cold compress on the cheek.',
            urgency: 'high',
            doctors: ['marcin', 'ilona'],
        },
    },
};

const CANINE_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Mild',
            description: 'Minor discomfort, often related to habitual clenching.',
            symptoms: [
                { text: 'Sensitivity at the tooth neck (gum side)', tip: 'The exposed canine neck is particularly sensitive due to a thin layer of root cementum.' },
                { text: 'Wearing of the canine tip', tip: 'Canines guide lateral bite — their wear may indicate bruxism or parafunctions.' },
                { text: 'Receded gum on one side', tip: 'One-sided recession suggests overly aggressive brushing or improper bite.' },
                { text: 'Mild discomfort when biting', tip: 'Canines transfer large chewing forces — even a small cavity can cause discomfort.' },
            ],
            causes: [
                { text: 'Wedge-shaped defects (excessive brushing)', tip: 'V-shaped notch at the tooth neck. Caused by brushing too hard with horizontal movements.' },
                { text: 'Bruxism (teeth grinding) — wear', tip: 'Habitual clenching or grinding causes tooth wear. A relaxation splint protects against further damage.' },
                { text: 'Gum recession exposing root cementum', tip: 'The retreating gum edge exposes the sensitive root surface below the enamel.' },
                { text: 'Early cervical decay', tip: 'Decay at the tooth-gum junction — hard to notice in the early stage.' },
            ],
            advice: 'Canines have the longest roots and are key for bite guidance. Wear suggests bruxism — ask about a relaxation splint. Use a soft-bristled toothbrush.',
            urgency: 'low',
            doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Moderate',
            description: 'Pain radiating to the eye or nose — requires diagnostics.',
            symptoms: [
                { text: 'Pain radiating toward the eye or nostril', tip: 'Canines have the longest roots — pain can radiate along the nerve to the eye.' },
                { text: 'Prolonged temperature sensitivity', tip: 'Reaction lasting over 30 seconds — a sign of pulp irritation.' },
                { text: 'Visible deep cavity at the neck', tip: 'Wedge-shaped defect reaching the dentin — requires filling.' },
                { text: 'Pain when biting from the side', tip: 'Canines guide lateral bite — pain suggests a crack or decay.' },
                { text: 'Enlarged lymph node under the jaw', tip: 'The lymph node reacts to tooth infection — a sign of inflammation.' },
            ],
            causes: [
                { text: 'Advanced cervical decay', tip: 'Cervical decay has reached the dentin — risk of pulpitis.' },
                { text: 'Reversible pulpitis', tip: 'The nerve is irritated but alive — conservative treatment can save it.' },
                { text: 'Longitudinal root fracture', tip: 'Crack along the root — prognosis is often unfavorable.' },
                { text: 'Apical periodontitis', tip: 'Inflammation of tissues around the root apex — pain on touch.' },
            ],
            advice: 'Radiating pain from a canine is characteristic due to its anatomy (long root near the sinus). Book a visit — an X-ray is needed to assess the root condition.',
            urgency: 'medium',
            doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Advanced',
            description: 'Severe pain or swelling — urgent intervention.',
            symptoms: [
                { text: 'Intense throbbing pain, difficult to control with medication', tip: 'Pain resistant to ibuprofen — pulpitis or abscess.' },
                { text: 'Swelling in the infraorbital area', tip: 'Swelling in the infraorbital area.' },
                { text: 'Abscess on the gum near the canine', tip: 'Abscess on the gum near the canine.' },
                { text: 'Tooth mobility', tip: 'Advanced bone loss or infection causes mobility — risk of tooth loss.' },
                { text: 'Difficulty opening the mouth (trismus)', tip: 'Difficulty opening the mouth (trismus).' },
            ],
            causes: [
                { text: 'Periapical abscess', tip: 'A pus reservoir at the tooth root. Can lead to cellulitis — a spreading, life-threatening infection.' },
                { text: 'Pulp necrosis with extensive infection', tip: 'Pulp necrosis with extensive infection.' },
                { text: 'Root fracture from trauma', tip: 'Root fracture from trauma.' },
                { text: 'Advanced periodontal disease (periodontitis)', tip: 'Advanced periodontal disease (periodontitis).' },
            ],
            advice: 'Urgent visit! Infection from an upper canine can spread to the orbit through fascial spaces. Until your visit: ibuprofen 400mg + paracetamol 500mg, cold compress. Do not use warm compresses!',
            urgency: 'high',
            doctors: ['marcin', 'ilona'],
        },
    },
};

const PREMOLAR_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Mild',
            description: 'Occasional discomfort, mainly when chewing.',
            symptoms: [
                { text: 'Mild pain when biting hard food', tip: 'Mild pain when biting hard food.' },
                { text: 'Wedge-shaped defect visible at the gum line', tip: 'Wedge-shaped defect visible at the gum line.' },
                { text: 'Brief cold sensitivity', tip: 'Brief cold sensitivity.' },
                { text: 'Feeling of "pressure" when chewing', tip: 'Feeling of "pressure" when chewing.' },
            ],
            causes: [
                { text: 'Leaking filling (old amalgams)', tip: 'Leaking filling (old amalgams).' },
                { text: 'Wedge-shaped defects from habitual clenching', tip: 'Wedge-shaped defects from habitual clenching.' },
                { text: 'Shallow interproximal decay (between teeth)', tip: 'Shallow interproximal decay (between teeth).' },
                { text: 'Occlusal overload (premature contact)', tip: 'Occlusal overload (premature contact).' },
            ],
            advice: 'Premolars often crack from teeth clenching — especially single-cusped ones with large fillings. Consider replacing old fillings with ceramic onlays. Check-up visit within a month.',
            urgency: 'low',
            doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Moderate',
            description: 'Pain increasing when chewing — risk of fracture.',
            symptoms: [
                { text: 'Sharp pain when biting on a specific cusp', tip: 'Sharp pain when biting on a specific cusp.' },
                { text: 'Pain when releasing bite (cracked tooth sign)', tip: 'Pain when releasing bite (cracked tooth sign).' },
                { text: 'Heat sensitivity lasting >1 minute', tip: 'Heat sensitivity lasting >1 minute.' },
                { text: 'Food getting stuck between teeth (new phenomenon)', tip: 'Food getting stuck between teeth (new phenomenon).' },
                { text: 'Aching after hot beverages', tip: 'Aching after hot beverages.' },
            ],
            causes: [
                { text: 'Cracked tooth syndrome', tip: 'Invisible crack running through the tooth — insidious, difficult to diagnose without a microscope.' },
                { text: 'Secondary decay under old filling', tip: 'Secondary decay under old filling.' },
                { text: 'Reversible pulpitis', tip: 'The pulp (nerve) is irritated but alive. Proper conservative treatment can preserve tooth vitality.' },
                { text: 'Loss of contact point (food impaction)', tip: 'Loss of contact point (food impaction).' },
            ],
            advice: 'Pain on "releasing" bite = classic cracked tooth symptom. Requires urgent microscope diagnostics. Book a visit within a week — the crack can deepen.',
            urgency: 'medium',
            doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Advanced',
            description: 'Severe pain or critical fracture.',
            symptoms: [
                { text: 'Continuous, severe throbbing pain', tip: 'Continuous, severe throbbing pain.' },
                { text: 'Tooth mobile or "rising" on the gum', tip: 'Tooth mobile or "rising" on the gum.' },
                { text: 'Gum swelling with purulent discharge', tip: 'Gum swelling with purulent discharge.' },
                { text: 'Tooth wall breaking off when biting', tip: 'Tooth wall breaking off when biting.' },
                { text: 'Pain on any food contact', tip: 'Pain on any food contact.' },
            ],
            causes: [
                { text: 'Vertical root fracture (irreversible)', tip: 'Vertical root fracture (irreversible).' },
                { text: 'Periapical abscess', tip: 'A pus reservoir at the tooth root. Can lead to cellulitis — a spreading, life-threatening infection.' },
                { text: 'Pulp necrosis', tip: 'The tooth nerve has died — requires endodontic treatment.' },
                { text: 'Tooth fracture under filling', tip: 'Tooth fracture under filling.' },
            ],
            advice: 'Urgent visit! If the crack extends below the gum line — the tooth may require extraction and implant replacement. If above — a prosthetic crown can save it. The sooner we act, the more options we have.',
            urgency: 'high',
            doctors: ['marcin', 'ilona'],
        },
    },
};

const MOLAR_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Mild',
            description: 'Minor discomfort, usually a hygiene issue.',
            symptoms: [
                { text: 'Food getting stuck between teeth (food impaction)', tip: 'Food getting stuck between teeth (food impaction).' },
                { text: 'Mild pain when biting hard food', tip: 'Mild pain when biting hard food.' },
                { text: 'Cold sensitivity around the tooth', tip: 'Cold sensitivity around the tooth.' },
                { text: 'Gum bleeding when brushing/flossing', tip: 'Gum bleeding when brushing/flossing.' },
            ],
            causes: [
                { text: 'Leaking filling — loss of contact point', tip: 'Leaking filling — loss of contact point.' },
                { text: 'Early decay on the chewing surface (fissures)', tip: 'Early decay on the chewing surface (fissures).' },
                { text: 'Gum inflammation (gingivitis) due to poor hygiene', tip: 'Gum inflammation (gingivitis) due to poor hygiene.' },
                { text: 'Worn filling needing replacement', tip: 'Worn filling needing replacement.' },
            ],
            advice: 'Molars have deep fissures where plaque easily accumulates. Use floss or interdental brushes daily. Check-up with filling review every 6 months.',
            urgency: 'low',
            doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Moderate',
            description: 'Increasing pain, possible pulpitis.',
            symptoms: [
                { text: 'Deep throbbing pain, worsening in the evening', tip: 'Deep throbbing pain, worsening in the evening.' },
                { text: 'Prolonged heat reaction (>1 minute)', tip: 'Prolonged heat reaction (>1 minute).' },
                { text: 'Pain radiating to the ear or temple', tip: 'Pain radiating to the ear or temple.' },
                { text: 'Difficulty chewing on one side', tip: 'Difficulty chewing on one side.' },
                { text: 'Dark discoloration on the chewing surface', tip: 'Dark discoloration on the chewing surface.' },
            ],
            causes: [
                { text: 'Deep decay reaching dentin or near the pulp', tip: 'Deep decay reaching dentin or near the pulp.' },
                { text: 'Reversible pulpitis', tip: 'Reversible pulpitis.' },
                { text: 'Secondary decay under a crown or large filling', tip: 'Secondary decay under a crown or large filling.' },
                { text: 'Cusp fracture', tip: 'Cusp fracture.' },
            ],
            advice: 'Pain reacting to heat is a warning sign — the pulp may be inflamed. Book a visit within a week. The doctor will assess whether a deep filling or root canal treatment is needed.',
            urgency: 'medium',
            doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Advanced',
            description: 'Severe pain or abscess — urgent intervention needed.',
            symptoms: [
                { text: 'Severe, continuous throbbing pain', tip: 'Severe, continuous throbbing pain.' },
                { text: 'Pain waking at night, unresponsive to medication', tip: 'Pain waking at night, unresponsive to medication.' },
                { text: 'Cheek or submandibular swelling', tip: 'Cheek or submandibular swelling.' },
                { text: 'Fever, malaise', tip: 'Systemic signs of infection — the body is fighting the infection. Requires urgent help.' },
                { text: 'Purulent discharge from the gum or fistula', tip: 'Purulent discharge from the gum or fistula.' },
                { text: 'Tooth feels "elevated" — pain when closing mouth', tip: 'Tooth feels "elevated" — pain when closing mouth.' },
            ],
            causes: [
                { text: 'Irreversible pulpitis', tip: 'Irreversible pulpitis.' },
                { text: 'Periapical or periodontal abscess', tip: 'Periapical or periodontal abscess.' },
                { text: 'Pulp necrosis with periapical infection', tip: 'Pulp necrosis with periapical infection.' },
                { text: 'Exacerbation of chronic inflammation', tip: 'Exacerbation of chronic inflammation.' },
            ],
            advice: 'Urgent visit — same or next day! Molars have 3–4 canals, so root canal treatment is complex but saves the tooth. Until your visit: ibuprofen 400mg + paracetamol 500mg alternating every 3h. Don\'t chew on this side.',
            urgency: 'high',
            doctors: ['marcin', 'ilona'],
        },
    },
};

const WISDOM_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Mild',
            description: 'Minor discomfort, typical for an erupting tooth.',
            symptoms: [
                { text: 'Pressure or "pushing" feeling at the back of the arch', tip: 'Pressure or "pushing" feeling at the back of the arch.' },
                { text: 'Slight gum swelling behind the last tooth', tip: 'Slight gum swelling behind the last tooth.' },
                { text: 'Discomfort when opening the mouth wide', tip: 'Discomfort when opening the mouth wide.' },
                { text: 'Mild pain worsening when eating', tip: 'Mild pain worsening when eating.' },
            ],
            causes: [
                { text: 'Active wisdom tooth eruption (mild pericoronitis)', tip: 'Active wisdom tooth eruption (mild pericoronitis).' },
                { text: 'Early decay on an inaccessible surface', tip: 'Early decay on an inaccessible surface.' },
                { text: 'Pressure on the adjacent tooth (second molar)', tip: 'Pressure on the adjacent tooth (second molar).' },
                { text: 'Gum flap trapping food debris', tip: 'Gum flap trapping food debris.' },
            ],
            advice: 'Rinse with salt water (teaspoon per glass of warm water) 3 times daily. If the wisdom tooth is angled on X-ray — consider preventive extraction. Easier to remove before it starts hurting.',
            urgency: 'low',
            doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Moderate',
            description: 'Gum inflammation around the wisdom tooth — requires treatment.',
            symptoms: [
                { text: 'Throbbing pain at the back of the jaw', tip: 'Throbbing pain at the back of the jaw.' },
                { text: 'Swelling and redness of the gum over the wisdom tooth', tip: 'Swelling and redness of the gum over the wisdom tooth.' },
                { text: 'Partial difficulty opening the mouth (partial trismus)', tip: 'Partial difficulty opening the mouth (partial trismus).' },
                { text: 'Pain radiating to the ear', tip: 'Tongue pain radiating to the ear may indicate an advanced neoplastic change.' },
                { text: 'Unpleasant taste or smell from around the tooth', tip: 'Unpleasant taste or smell from around the tooth.' },
            ],
            causes: [
                { text: 'Pericoronitis (pericoronal inflammation)', tip: 'Pericoronitis (pericoronal inflammation).' },
                { text: 'Interproximal decay with the second molar', tip: 'Interproximal decay with the second molar.' },
                { text: 'Partially erupted wisdom tooth — food retention', tip: 'Partially erupted wisdom tooth — food retention.' },
                { text: 'Dentigerous cyst', tip: 'Cyst developing around the crown of an impacted wisdom tooth — detected on X-ray.' },
            ],
            advice: 'Inflammation around the wisdom tooth (pericoronitis) is a common problem. Book a visit within a week — the doctor will assess on a panoramic X-ray whether the tooth can properly erupt or requires extraction.',
            urgency: 'medium',
            doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Advanced',
            description: 'Abscess or severe inflammation — requires extraction.',
            symptoms: [
                { text: 'Severe pain preventing eating', tip: 'Severe pain preventing eating.' },
                { text: 'Significant cheek or submandibular swelling', tip: 'Significant cheek or submandibular swelling.' },
                { text: 'Trismus (barely able to open mouth)', tip: 'Trismus (barely able to open mouth).' },
                { text: 'Fever >38°C', tip: 'Fever >38°C.' },
                { text: 'Difficulty swallowing', tip: 'Difficulty swallowing.' },
                { text: 'Purulent discharge from the gum behind the last tooth', tip: 'Purulent discharge from the gum behind the last tooth.' },
            ],
            causes: [
                { text: 'Pericoronal abscess (pericoronitis with abscess)', tip: 'Pericoronal abscess (pericoronitis with abscess).' },
                { text: 'Infection spreading to fascial spaces', tip: 'Infection spreading to fascial spaces.' },
                { text: 'Root resorption of the second molar by the pressing wisdom tooth', tip: 'Root resorption of the second molar by the pressing wisdom tooth.' },
                { text: 'Mandible fracture along the wisdom tooth line (rare)', tip: 'Mandible fracture along the wisdom tooth line (rare).' },
            ],
            advice: 'Urgent visit to an oral surgeon! Infection from lower wisdom teeth can descend to the submandibular and cervical spaces — this is life-threatening (Ludwig\'s angina). Antibiotics + urgent extraction.',
            urgency: 'high',
            doctors: ['marcin', 'ilona'],
        },
    },
};

// ─── SOFT TISSUE TEMPLATES ───

const TONGUE_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Mild',
            description: 'Minor changes or tongue irritation.',
            symptoms: [
                { text: 'Mild burning at the tip of the tongue', tip: 'Mild burning at the tip of the tongue.' },
                { text: 'White or yellowish coating on the tongue surface', tip: 'White or yellowish coating on the tongue surface.' },
                { text: 'Enlarged filiform papillae', tip: 'Enlarged filiform papillae.' },
                { text: 'Sensitivity to spicy seasonings', tip: 'Sensitivity to spicy seasonings.' },
            ],
            causes: [
                { text: 'Geographic tongue (migratory glossitis) — benign condition', tip: 'Geographic tongue (migratory glossitis) — benign condition.' },
                { text: 'Dry mouth (mouth breathing)', tip: 'Dry mouth (mouth breathing).' },
                { text: 'Vitamin B group deficiency', tip: 'Vitamin B group deficiency.' },
                { text: 'Reaction to toothpaste (SLS — sodium lauryl sulfate)', tip: 'Reaction to toothpaste (SLS — sodium lauryl sulfate).' },
            ],
            advice: 'Use alcohol-free mouthwash, drink plenty of water, avoid very hot beverages. Geographic tongue is a benign condition — doesn\'t require treatment. If coating persists >2 weeks, see a doctor.',
            urgency: 'low',
            doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Moderate',
            description: 'Persistent changes requiring diagnostics.',
            symptoms: [
                { text: 'Persistent burning of the entire tongue (burning mouth)', tip: 'Persistent burning of the entire tongue (burning mouth).' },
                { text: 'White or red patches that don\'t come off when rubbed', tip: 'White or red patches that don\'t come off when rubbed.' },
                { text: 'Painful ulceration lasting >10 days', tip: 'Painful ulceration lasting >10 days.' },
                { text: 'Feeling of "wavy" tongue edges (teeth imprints)', tip: 'Feeling of "wavy" tongue edges (teeth imprints).' },
                { text: 'Loss of taste or metallic aftertaste', tip: 'Loss of taste or metallic aftertaste.' },
            ],
            causes: [
                { text: 'Leukoplakia (precancerous change — white patch)', tip: 'Leukoplakia (precancerous change — white patch).' },
                { text: 'Lichen planus', tip: 'Lichen planus.' },
                { text: 'Oral candidiasis (fungal infection — Candida)', tip: 'Oral candidiasis (fungal infection — Candida).' },
                { text: 'Burning mouth syndrome (BMS)', tip: 'Burning mouth syndrome (BMS).' },
                { text: 'Irritation from a sharp tooth edge or prosthesis', tip: 'Irritation from a sharp tooth edge or prosthesis.' },
            ],
            advice: 'A white or red patch on the tongue that doesn\'t disappear after 2 weeks requires a visit and possible biopsy. This is important for early exclusion of precancerous lesions.',
            urgency: 'medium',
            doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Advanced',
            description: 'Change causing serious concern — urgent diagnostics.',
            symptoms: [
                { text: 'Painless ulceration on the side of the tongue lasting >3 weeks', tip: 'Painless ulceration on the side of the tongue lasting >3 weeks.' },
                { text: 'Hardening or lump palpable in the tongue', tip: 'Hardening or lump palpable in the tongue.' },
                { text: 'Bleeding from a small lesion on the tongue', tip: 'Bleeding from a small lesion on the tongue.' },
                { text: 'Enlarged cervical lymph nodes', tip: 'Enlarged cervical lymph nodes.' },
                { text: 'Difficulty speaking or tongue mobility', tip: 'Difficulty speaking or tongue mobility.' },
                { text: 'Significant weight loss', tip: 'Significant weight loss.' },
            ],
            causes: [
                { text: 'Oral squamous cell carcinoma (SCC)', tip: 'Oral squamous cell carcinoma (SCC).' },
                { text: 'Advanced precancerous lesion', tip: 'Advanced precancerous lesion.' },
                { text: 'Floor of mouth abscess', tip: 'An abscess in the floor of the mouth can be life-threatening — it can spread to the neck.' },
                { text: 'Ranula (mucocele) — large size', tip: 'Ranula (mucocele) — large size.' },
            ],
            advice: 'URGENT! A painless ulceration on the side of the tongue lasting >3 weeks is a classic sign requiring urgent biopsy. Contact a doctor immediately — early detection = full recovery.',
            urgency: 'high',
            doctors: ['marcin', 'ilona'],
        },
    },
};

const PALATE_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Mild',
            description: 'Irritation or minor palate injury.',
            symptoms: [
                { text: 'Burning after hot food or drink', tip: 'Burning after hot food or drink.' },
                { text: 'Minor abrasion or scratch', tip: 'Minor abrasion or scratch.' },
                { text: 'Rough/wrinkled surface', tip: 'Rough/wrinkled surface.' },
                { text: 'Slight discomfort when eating', tip: 'Slight discomfort when eating.' },
            ],
            causes: [
                { text: 'Thermal burn (hot pizza, coffee)', tip: 'Thermal burn (hot pizza, coffee).' },
                { text: 'Irritation from sharp food (chips, croutons)', tip: 'Irritation from sharp food (chips, croutons).' },
                { text: 'Torus palatinus (bony growth — normal variant)', tip: 'Torus palatinus (bony growth — normal variant).' },
                { text: 'Irritation from an upper denture', tip: 'Irritation from an upper denture.' },
            ],
            advice: 'Palate burn is the most common cause — heals in 7–10 days. Avoid hot foods. Torus palatinus (hard lump in the center) is a normal variant and doesn\'t require treatment.',
            urgency: 'low',
            doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Moderate',
            description: 'Persistent palate changes — to be evaluated.',
            symptoms: [
                { text: 'Lump or swelling on the palate lasting >2 weeks', tip: 'Lump or swelling on the palate lasting >2 weeks.' },
                { text: 'Painful ulceration making eating difficult', tip: 'Painful ulceration making eating difficult.' },
                { text: 'Change in mucosa color (white, red, purple)', tip: 'Change in mucosa color (white, red, purple).' },
                { text: 'Bleeding on touch', tip: 'Bleeding on touch.' },
                { text: 'Feeling of a foreign body on the palate', tip: 'Feeling of a foreign body on the palate.' },
            ],
            causes: [
                { text: 'Palatal abscess (from an upper tooth)', tip: 'Palatal abscess (from an upper tooth).' },
                { text: 'Pleomorphic adenoma (minor salivary gland tumor)', tip: 'Pleomorphic adenoma (minor salivary gland tumor).' },
                { text: 'Palatal lichen planus', tip: 'Palatal lichen planus.' },
                { text: 'Necrotizing oral inflammation', tip: 'Necrotizing oral inflammation.' },
                { text: 'Hemangioma', tip: 'Hemangioma.' },
            ],
            advice: 'A lump on the palate that persists after 2–3 weeks should be examined by a dentist. The palate is a common location for salivary gland tumors (most are benign but require confirmation).',
            urgency: 'medium',
            doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Advanced',
            description: 'Growing lump or extensive abscess — urgent visit.',
            symptoms: [
                { text: 'Rapidly growing lump on the palate', tip: 'Rapidly growing lump on the palate.' },
                { text: 'Severe pain preventing eating and drinking', tip: 'Severe pain preventing eating and drinking.' },
                { text: 'Palate swelling with asymmetry', tip: 'Palate swelling with asymmetry.' },
                { text: 'Ulceration with necrotic burrowing', tip: 'Ulceration with necrotic burrowing.' },
                { text: 'Palate hemorrhage', tip: 'Palate hemorrhage.' },
                { text: 'Feeling of "fullness" in one nostril', tip: 'Feeling of "fullness" in one nostril.' },
            ],
            causes: [
                { text: 'Malignant minor salivary gland tumor', tip: 'Malignant minor salivary gland tumor.' },
                { text: 'Palatal squamous cell carcinoma', tip: 'Palatal squamous cell carcinoma.' },
                { text: 'Palatal abscess with sinus penetration', tip: 'Palatal abscess with sinus penetration.' },
                { text: 'Necrotizing palatal inflammation', tip: 'Necrotizing palatal inflammation.' },
            ],
            advice: 'URGENT! A rapidly growing palatal tumor requires immediate biopsy. The palate is the third most common location for oral cavity tumors. Contact a maxillofacial surgery clinic.',
            urgency: 'high',
            doctors: ['marcin', 'ilona'],
        },
    },
};

const THROAT_DATA: Omit<ZoneInfo, 'title' | 'subtitle'> = {
    levels: {
        low: {
            label: 'Mild',
            description: 'Scratching or throat discomfort.',
            symptoms: [
                { text: 'Scratching or dryness in the throat', tip: 'Scratching or dryness in the throat.' },
                { text: 'Mild pain when swallowing', tip: 'Mild pain when swallowing.' },
                { text: 'Foreign body sensation', tip: 'Foreign body sensation.' },
                { text: 'Need to clear the throat frequently', tip: 'Need to clear the throat frequently.' },
            ],
            causes: [
                { text: 'Common cold or viral infection', tip: 'Common cold or viral infection.' },
                { text: 'Gastric reflux (GERD) irritating the throat', tip: 'Gastric reflux (GERD) irritating the throat.' },
                { text: 'Dry mouth (mouth breathing during sleep)', tip: 'Dry mouth (mouth breathing during sleep).' },
                { text: 'Post-nasal drip', tip: 'Post-nasal drip.' },
            ],
            advice: 'Throat burning and dryness is most commonly viral or from reflux. Gargle with salt water. If it lasts >2 weeks — worth ruling out reflux and consulting a doctor.',
            urgency: 'low',
            doctors: ['katarzyna', 'dominika'],
        },
        medium: {
            label: 'Moderate',
            description: 'Persistent throat symptoms — may be dental-related.',
            symptoms: [
                { text: 'Sore throat lasting >2 weeks without improvement', tip: 'Sore throat lasting >2 weeks without improvement.' },
                { text: 'Enlarged tonsils with stones (tonsilloliths)', tip: 'Enlarged tonsils with stones (tonsilloliths).' },
                { text: 'Pain radiating to the ear (unilateral)', tip: 'Pain radiating to the ear (unilateral).' },
                { text: 'Difficulty swallowing solid food', tip: 'Difficulty swallowing solid food.' },
                { text: 'Chronic bad breath (halitosis)', tip: 'Chronic bad breath (halitosis).' },
            ],
            causes: [
                { text: 'Tonsil stones (tonsilloliths — white stone in tonsil)', tip: 'Tonsil stones (tonsilloliths — white stone in tonsil).' },
                { text: 'Complication from infected wisdom tooth (pericoronitis → throat)', tip: 'Complication from infected wisdom tooth (pericoronitis → throat).' },
                { text: 'Parapharyngeal space connective tissue inflammation', tip: 'Parapharyngeal space connective tissue inflammation.' },
                { text: 'Chronic tonsillitis', tip: 'Chronic tonsillitis.' },
            ],
            advice: 'Throat pain radiating to the ear may originate from infected lower wisdom teeth. Worth getting a panoramic dental X-ray. Tonsil stones cause halitosis — can be removed by an ENT specialist.',
            urgency: 'medium',
            doctors: ['ilona', 'katarzyna'],
        },
        high: {
            label: 'Advanced',
            description: 'Serious symptoms requiring urgent diagnostics.',
            symptoms: [
                { text: 'Severe sore throat with fever >38°C', tip: 'Severe sore throat with fever >38°C.' },
                { text: 'Significant neck or submandibular swelling', tip: 'Significant neck or submandibular swelling.' },
                { text: 'Trismus (difficulty opening the mouth)', tip: 'Trismus (difficulty opening the mouth).' },
                { text: 'Difficulty breathing or swallowing saliva', tip: 'Difficulty breathing or swallowing saliva.' },
                { text: 'Hoarse voice lasting >3 weeks', tip: 'Hoarse voice lasting >3 weeks.' },
                { text: 'Unilateral numbness of the tongue or palate', tip: 'Unilateral numbness of the tongue or palate.' },
            ],
            causes: [
                { text: 'Peritonsillar abscess', tip: 'Pus collection next to the tonsil — requires incision and surgical drainage.' },
                { text: 'Floor of mouth abscess spreading to the throat', tip: 'Floor of mouth abscess spreading to the throat.' },
                { text: 'Ludwig\'s angina (life-threatening!)', tip: 'Ludwig\'s angina (life-threatening!).' },
                { text: 'Throat or tonsil cancer', tip: 'Throat or tonsil cancer.' },
            ],
            advice: 'URGENT — ER or emergency! Difficulty breathing or swallowing saliva + neck swelling requires immediate intervention. Ludwig\'s angina is life-threatening. Don\'t wait until morning!',
            urgency: 'high',
            doctors: ['marcin', 'ilona'],
        },
    },
};

// ─── BUILD FINAL DATA ───

function makeToothZone(id: string, title: string, subtitle: string, data: Omit<ZoneInfo, 'title' | 'subtitle'>): ZoneInfo {
    return { title, subtitle, ...data };
}

export const SYMPTOM_DATA_EN: Record<string, ZoneInfo> = {
    // UPPER RIGHT (Q1)
    "11": makeToothZone("11", "Upper Right Central Incisor", "Central incisor · Tooth 11", INCISOR_DATA),
    "12": makeToothZone("12", "Upper Right Lateral Incisor", "Lateral incisor · Tooth 12", INCISOR_DATA),
    "13": makeToothZone("13", "Upper Right Canine", "Canine · Tooth 13", CANINE_DATA),
    "14": makeToothZone("14", "Upper Right First Premolar", "1st premolar · Tooth 14", PREMOLAR_DATA),
    "15": makeToothZone("15", "Upper Right Second Premolar", "2nd premolar · Tooth 15", PREMOLAR_DATA),
    "16": makeToothZone("16", "Upper Right First Molar", "1st molar · Tooth 16", MOLAR_DATA),
    "17": makeToothZone("17", "Upper Right Second Molar", "2nd molar · Tooth 17", MOLAR_DATA),
    "18": makeToothZone("18", "Upper Right Wisdom Tooth", "Wisdom tooth · Tooth 18", WISDOM_DATA),

    // UPPER LEFT (Q2)
    "21": makeToothZone("21", "Upper Left Central Incisor", "Central incisor · Tooth 21", INCISOR_DATA),
    "22": makeToothZone("22", "Upper Left Lateral Incisor", "Lateral incisor · Tooth 22", INCISOR_DATA),
    "23": makeToothZone("23", "Upper Left Canine", "Canine · Tooth 23", CANINE_DATA),
    "24": makeToothZone("24", "Upper Left First Premolar", "1st premolar · Tooth 24", PREMOLAR_DATA),
    "25": makeToothZone("25", "Upper Left Second Premolar", "2nd premolar · Tooth 25", PREMOLAR_DATA),
    "26": makeToothZone("26", "Upper Left First Molar", "1st molar · Tooth 26", MOLAR_DATA),
    "27": makeToothZone("27", "Upper Left Second Molar", "2nd molar · Tooth 27", MOLAR_DATA),
    "28": makeToothZone("28", "Upper Left Wisdom Tooth", "Wisdom tooth · Tooth 28", WISDOM_DATA),

    // LOWER LEFT (Q3)
    "31": makeToothZone("31", "Lower Left Central Incisor", "Central incisor · Tooth 31", INCISOR_DATA),
    "32": makeToothZone("32", "Lower Left Lateral Incisor", "Lateral incisor · Tooth 32", INCISOR_DATA),
    "33": makeToothZone("33", "Lower Left Canine", "Canine · Tooth 33", CANINE_DATA),
    "34": makeToothZone("34", "Lower Left First Premolar", "1st premolar · Tooth 34", PREMOLAR_DATA),
    "35": makeToothZone("35", "Lower Left Second Premolar", "2nd premolar · Tooth 35", PREMOLAR_DATA),
    "36": makeToothZone("36", "Lower Left First Molar", "1st molar · Tooth 36", MOLAR_DATA),
    "37": makeToothZone("37", "Lower Left Second Molar", "2nd molar · Tooth 37", MOLAR_DATA),
    "38": makeToothZone("38", "Lower Left Wisdom Tooth", "Wisdom tooth · Tooth 38", WISDOM_DATA),

    // LOWER RIGHT (Q4)
    "41": makeToothZone("41", "Lower Right Central Incisor", "Central incisor · Tooth 41", INCISOR_DATA),
    "42": makeToothZone("42", "Lower Right Lateral Incisor", "Lateral incisor · Tooth 42", INCISOR_DATA),
    "43": makeToothZone("43", "Lower Right Canine", "Canine · Tooth 43", CANINE_DATA),
    "44": makeToothZone("44", "Lower Right First Premolar", "1st premolar · Tooth 44", PREMOLAR_DATA),
    "45": makeToothZone("45", "Lower Right Second Premolar", "2nd premolar · Tooth 45", PREMOLAR_DATA),
    "46": makeToothZone("46", "Lower Right First Molar", "1st molar · Tooth 46", MOLAR_DATA),
    "47": makeToothZone("47", "Lower Right Second Molar", "2nd molar · Tooth 47", MOLAR_DATA),
    "48": makeToothZone("48", "Lower Right Wisdom Tooth", "Wisdom tooth · Tooth 48", WISDOM_DATA),

    // SOFT TISSUES
    "tongue": { title: "Tongue", subtitle: "Floor of the mouth", ...TONGUE_DATA },
    "palate": { title: "Palate", subtitle: "Upper wall of the mouth", ...PALATE_DATA },
    "throat": { title: "Throat / Back Wall", subtitle: "Tonsils and fauces", ...THROAT_DATA },
};
